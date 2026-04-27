<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\CustomerTransactionType;
use App\Enums\JobOrderSource;
use App\Enums\JobOrderStatus;
use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Customer\BookingAvailabilityRequest;
use App\Http\Requests\Api\Customer\StoreCustomerBookingRequest;
use App\Http\Requests\Api\Customer\StoreCustomerBookingWithPaymentRequest;
use App\Http\Resources\JobOrderResource;
use App\Models\BookingSlot;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\ServiceCatalog;
use App\Services\XenditService;
use Carbon\Carbon;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CustomerBookingController extends Controller
{
    /**
     * Return booking slot availability for a specific date.
     */
    public function availability(BookingAvailabilityRequest $request): JsonResponse
    {
        $arrivalDate = $request->validated('arrival_date');

        if (! Schema::hasTable('booking_slots')) {
            return response()->json([
                'success' => true,
                'data' => [
                    'arrival_date' => $arrivalDate,
                    'slots' => [],
                ],
                'message' => 'Booking slots are not configured yet.',
            ]);
        }

        $slotSettings = BookingSlot::query()->active()->ordered()->get(['time', 'capacity']);

        if ($slotSettings->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => [
                    'arrival_date' => $arrivalDate,
                    'slots' => [],
                ],
            ]);
        }

        $slotTimes = $slotSettings->pluck('time')->all();

        $bookedByTime = $this->applyCapacityBlockingScope(
            JobOrder::query()
                ->whereDate('arrival_date', $arrivalDate)
                ->whereIn('arrival_time', $slotTimes)
        )
            ->selectRaw('arrival_time, COUNT(*) as booked_count')
            ->groupBy('arrival_time')
            ->pluck('booked_count', 'arrival_time');

        $slots = $slotSettings->map(function (BookingSlot $slot) use ($bookedByTime): array {
            $bookedCount = (int) ($bookedByTime[$slot->time] ?? 0);
            $slotsLeft = max($slot->capacity - $bookedCount, 0);

            return [
                'time' => $slot->time,
                'label' => Carbon::createFromFormat('H:i', $slot->time)->format('g:i A'),
                'status' => $slotsLeft > 0 ? 'available' : 'full',
                'slots_left' => $slotsLeft,
                'capacity' => (int) $slot->capacity,
                'booked' => $bookedCount,
            ];
        })->values()->all();

        return response()->json([
            'success' => true,
            'data' => [
                'arrival_date' => $arrivalDate,
                'slots' => $slots,
            ],
        ]);
    }

    /**
     * Book a service for the authenticated customer.
     * Creates a job order in pending_approval status with the chosen service.
     */
    public function store(StoreCustomerBookingRequest $request): JsonResponse
    {
        if (! Schema::hasColumn('job_orders', 'source')) {
            return response()->json([
                'success' => false,
                'message' => 'Booking schema is outdated. Please run database migrations.',
            ], 503);
        }

        if (! Schema::hasTable('booking_slots')) {
            return response()->json([
                'success' => false,
                'message' => 'Booking slots are not configured yet. Please run database migrations.',
            ], 503);
        }

        $user = $request->user();

        $customer = Customer::where('email', $user->email)->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'No customer record linked to this account.',
            ], 404);
        }

        $service = ServiceCatalog::active()->find($request->validated('service_id'));

        if (! $service) {
            return response()->json([
                'success' => false,
                'message' => 'The selected service is unavailable.',
            ], 422);
        }

        $vehicleId = (int) $request->validated('vehicle_id');
        $arrivalDate = $request->validated('arrival_date');
        $arrivalTime = $request->validated('arrival_time');

        if (! $customer->vehicles()->whereKey($vehicleId)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Selected vehicle does not belong to your account.',
            ], 422);
        }

        $validated = $request->validated();

        try {
            $jobOrder = $this->withSlotBookingLock($arrivalDate, $arrivalTime, function () use ($arrivalDate, $arrivalTime, $customer, $service, $validated) {
                return DB::transaction(function () use ($arrivalDate, $arrivalTime, $customer, $service, $validated) {
                    $slotSetting = BookingSlot::query()
                        ->active()
                        ->where('time', $arrivalTime)
                        ->lockForUpdate()
                        ->first();

                    if (! $slotSetting) {
                        throw new HttpException(422, 'Selected arrival slot is unavailable.');
                    }

                    if (! $this->slotHasCapacity($arrivalDate, $slotSetting)) {
                        throw new HttpException(422, 'Selected arrival slot is full. Please choose another time.');
                    }

                    $bookingPayload = $this->withReservationHoldExpiry($validated, false);

                    $jobOrder = $this->createPendingJobOrder($customer, $service, $bookingPayload)
                        ->fresh(['customer', 'vehicle', 'service', 'items']);

                    // Create a pending transaction for the full service fee so it
                    // shows up in the customer's Billing & Payment section.
                    CustomerTransaction::create([
                        'customer_id' => $customer->id,
                        'job_order_id' => $jobOrder->id,
                        'type' => CustomerTransactionType::Invoice,
                        'amount' => $service->price_fixed,
                        'notes' => 'Service fee for '.$jobOrder->jo_number.' (pay at shop)',
                    ]);

                    return $jobOrder;
                });
            });

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($jobOrder),
                'message' => 'Booking submitted. Awaiting shop approval.',
            ], 201);
        } catch (LockTimeoutException) {
            return response()->json([
                'success' => false,
                'message' => 'Booking is being updated by another request. Please retry.',
            ], 409);
        } catch (HttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Book a service with reservation fee payment.
     * Creates a pending job order, creates a transaction, and returns a Xendit payment URL.
     */
    public function storeWithPayment(StoreCustomerBookingWithPaymentRequest $request, XenditService $xenditService): JsonResponse
    {
        if (! Schema::hasColumn('job_orders', 'source')) {
            return response()->json([
                'success' => false,
                'message' => 'Booking schema is outdated. Please run database migrations.',
            ], 503);
        }

        if (! Schema::hasTable('booking_slots')) {
            return response()->json([
                'success' => false,
                'message' => 'Booking slots are not configured yet. Please run database migrations.',
            ], 503);
        }

        $user = $request->user();

        $customer = Customer::where('email', $user->email)->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'No customer record linked to this account.',
            ], 404);
        }

        $service = ServiceCatalog::active()->find($request->validated('service_id'));

        if (! $service) {
            return response()->json([
                'success' => false,
                'message' => 'The selected service is unavailable.',
            ], 422);
        }

        $vehicleId = (int) $request->validated('vehicle_id');
        $arrivalDate = $request->validated('arrival_date');
        $arrivalTime = $request->validated('arrival_time');

        if (! $customer->vehicles()->whereKey($vehicleId)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Selected vehicle does not belong to your account.',
            ], 422);
        }

        $validated = $request->validated();
        $reservationFeeAmount = (float) config('inventory.booking_reservation_fee_amount', 200);

        try {
            $result = $this->withSlotBookingLock($arrivalDate, $arrivalTime, function () use ($arrivalDate, $arrivalTime, $customer, $service, $validated, $reservationFeeAmount, $xenditService) {
                return DB::transaction(function () use ($arrivalDate, $arrivalTime, $customer, $service, $validated, $reservationFeeAmount, $xenditService) {
                    $slotSetting = BookingSlot::query()
                        ->active()
                        ->where('time', $arrivalTime)
                        ->lockForUpdate()
                        ->first();

                    if (! $slotSetting) {
                        throw new HttpException(422, 'Selected arrival slot is unavailable.');
                    }

                    if (! $this->slotHasCapacity($arrivalDate, $slotSetting)) {
                        throw new HttpException(422, 'Selected arrival slot is full. Please choose another time.');
                    }

                    $bookingPayload = $this->withReservationHoldExpiry($validated, true);

                    $jobOrder = $this->createPendingJobOrder($customer, $service, $bookingPayload)
                        ->fresh(['customer', 'vehicle', 'service', 'items']);

                    $transaction = CustomerTransaction::create([
                        'customer_id' => $customer->id,
                        'job_order_id' => $jobOrder->id,
                        'type' => CustomerTransactionType::Invoice,
                        'amount' => $reservationFeeAmount,
                        'notes' => 'Reservation fee for booking '.$jobOrder->jo_number,
                        'payment_method' => $validated['payment_method'],
                    ]);

                    // Create the remaining balance transaction immediately so it
                    // appears in the customer's Billing & Payment pending tab.
                    $remaining = round((float) $service->price_fixed - $reservationFeeAmount, 2);

                    if ($remaining > 0) {
                        CustomerTransaction::create([
                            'customer_id' => $customer->id,
                            'job_order_id' => $jobOrder->id,
                            'type' => CustomerTransactionType::Invoice,
                            'amount' => $remaining,
                            'notes' => 'Remaining balance for '.$jobOrder->jo_number.' (reservation fee of ₱'.number_format($reservationFeeAmount, 2).' deducted)',
                        ]);
                    }

                    $paymentUrl = $xenditService->createInvoice($transaction, $customer);

                    return [
                        'job_order' => $jobOrder,
                        'transaction_id' => $transaction->id,
                        'payment_url' => $paymentUrl,
                    ];
                });
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'job_order' => new JobOrderResource($result['job_order']),
                    'transaction_id' => $result['transaction_id'],
                    'reservation_fee_amount' => $reservationFeeAmount,
                    'payment_url' => $result['payment_url'],
                    'payment_method' => $validated['payment_method'],
                ],
                'message' => 'Booking created. Continue payment to secure your slot.',
            ], 201);
        } catch (LockTimeoutException) {
            return response()->json([
                'success' => false,
                'message' => 'Booking is being updated by another request. Please retry.',
            ], 409);
        } catch (HttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (PaymentGatewayException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getErrorCode(),
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to initialize booking payment. Please try again.',
            ], 500);
        }
    }

    private function slotHasCapacity(string $arrivalDate, BookingSlot $slotSetting): bool
    {
        $bookedCount = $this->applyCapacityBlockingScope(
            JobOrder::query()
                ->whereDate('arrival_date', $arrivalDate)
                ->where('arrival_time', $slotSetting->time)
        )->count();

        return $bookedCount < $slotSetting->capacity;
    }

    /**
     * Capacity is consumed by:
     * - operational jobs (approved/in_progress/completed/settled), or
     * - created/pending_approval jobs that already have a PAID reservation-fee invoice.
     */
    private function applyCapacityBlockingScope(Builder $query): Builder
    {
        return $query->where(function (Builder $blocking): void {
            $blocking
                ->whereIn('status', [
                    JobOrderStatus::Approved->value,
                    JobOrderStatus::InProgress->value,
                    JobOrderStatus::Completed->value,
                    JobOrderStatus::Settled->value,
                ])
                ->orWhere(function (Builder $awaitingSettlementOrApproval): void {
                    $awaitingSettlementOrApproval
                        ->whereIn('status', [
                            JobOrderStatus::Created->value,
                            JobOrderStatus::PendingApproval->value,
                        ])
                        ->where(function (Builder $pendingHold): void {
                            $pendingHold
                                ->whereNull('reservation_expires_at')
                                ->orWhere('reservation_expires_at', '>', now())
                                ->orWhereExists(function ($transactionQuery): void {
                                    $transactionQuery
                                        ->select(DB::raw('1'))
                                        ->from('customer_transactions')
                                        ->whereColumn('customer_transactions.job_order_id', 'job_orders.id')
                                        ->whereIn('customer_transactions.type', [
                                            CustomerTransactionType::Invoice->value,
                                            CustomerTransactionType::ReservationFee->value,
                                        ])
                                        ->where('customer_transactions.xendit_status', 'PAID');
                                });
                        });
                });
        });
    }

    /**
     * @template T
     *
     * @param  callable():T  $callback
     * @return T
     */
    private function withSlotBookingLock(string $arrivalDate, string $arrivalTime, callable $callback): mixed
    {
        $lockSeconds = max((int) config('inventory.booking_slot_lock_seconds', 10), 1);
        $waitSeconds = max((int) config('inventory.booking_slot_lock_wait_seconds', 5), 1);
        $lockKey = sprintf('booking-slot:%s:%s', $arrivalDate, $arrivalTime);

        return Cache::lock($lockKey, $lockSeconds)->block($waitSeconds, $callback);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function withReservationHoldExpiry(array $validated, bool $isPaymentFlow): array
    {
        $configKey = $isPaymentFlow ? 'inventory.booking_paid_hold_minutes' : 'inventory.booking_unpaid_hold_minutes';
        $defaultMinutes = $isPaymentFlow ? 1440 : 60;
        $holdMinutes = max((int) config($configKey, $defaultMinutes), 1);

        $validated['reservation_expires_at'] = now()->addMinutes($holdMinutes);

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function createPendingJobOrder(Customer $customer, ServiceCatalog $service, array $validated): JobOrder
    {
        $jobOrder = JobOrder::create([
            'customer_id' => $customer->id,
            'vehicle_id' => $validated['vehicle_id'],
            'source' => JobOrderSource::OnlineBooking,
            'service_id' => $service->id,
            'arrival_date' => $validated['arrival_date'],
            'arrival_time' => $validated['arrival_time'],
            'reservation_expires_at' => $validated['reservation_expires_at'] ?? null,
            'status' => JobOrderStatus::PendingApproval,
            'service_fee' => $service->price_fixed,
            'notes' => $validated['notes'] ?? null,
        ]);

        // Keep the requested service in job order items so total-cost calculations stay consistent.
        JobOrderItem::create([
            'job_order_id' => $jobOrder->id,
            'item_type' => 'service',
            'item_id' => null,
            'description' => $service->name,
            'quantity' => 1,
            'unit_price' => $service->price_fixed,
            'total_price' => $service->price_fixed,
        ]);

        return $jobOrder;
    }
}
