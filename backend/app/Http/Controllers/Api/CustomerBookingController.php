<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\CustomerTransactionType;
use App\Enums\JobOrderStatus;
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
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

        $slotSetting = BookingSlot::query()
            ->active()
            ->where('time', $arrivalTime)
            ->first();

        if (! $slotSetting) {
            return response()->json([
                'success' => false,
                'message' => 'Selected arrival slot is unavailable.',
            ], 422);
        }

        if (! $this->slotHasCapacity($arrivalDate, $slotSetting)) {
            return response()->json([
                'success' => false,
                'message' => 'Selected arrival slot is full. Please choose another time.',
            ], 422);
        }

        $validated = $request->validated();

        try {
            $jobOrder = DB::transaction(function () use ($customer, $service, $validated) {
                return $this->createPendingJobOrder($customer, $service, $validated)
                    ->fresh(['customer', 'vehicle', 'service', 'items']);
            });

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($jobOrder),
                'message' => 'Booking submitted. Awaiting shop approval.',
            ], 201);
        } catch (\Exception $e) {
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

        $slotSetting = BookingSlot::query()
            ->active()
            ->where('time', $arrivalTime)
            ->first();

        if (! $slotSetting) {
            return response()->json([
                'success' => false,
                'message' => 'Selected arrival slot is unavailable.',
            ], 422);
        }

        if (! $this->slotHasCapacity($arrivalDate, $slotSetting)) {
            return response()->json([
                'success' => false,
                'message' => 'Selected arrival slot is full. Please choose another time.',
            ], 422);
        }

        $validated = $request->validated();
        $reservationFeeAmount = (float) config('inventory.booking_reservation_fee_amount', 200);

        try {
            $result = DB::transaction(function () use ($customer, $service, $validated, $reservationFeeAmount, $xenditService) {
                $jobOrder = $this->createPendingJobOrder($customer, $service, $validated)
                    ->fresh(['customer', 'vehicle', 'service', 'items']);

                $transaction = CustomerTransaction::create([
                    'customer_id' => $customer->id,
                    'job_order_id' => $jobOrder->id,
                    'type' => CustomerTransactionType::Invoice,
                    'amount' => $reservationFeeAmount,
                    'notes' => 'Reservation fee for booking '.$jobOrder->jo_number,
                    'payment_method' => $validated['payment_method'],
                ]);

                $paymentUrl = $xenditService->createInvoice($transaction, $customer);

                return [
                    'job_order' => $jobOrder,
                    'transaction_id' => $transaction->id,
                    'payment_url' => $paymentUrl,
                ];
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to initialize booking payment: '.$e->getMessage(),
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
                ->orWhere(function (Builder $awaitingPayment): void {
                    $awaitingPayment
                        ->whereIn('status', [
                            JobOrderStatus::Created->value,
                            JobOrderStatus::PendingApproval->value,
                        ])
                        ->whereExists(function ($transactionQuery): void {
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
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function createPendingJobOrder(Customer $customer, ServiceCatalog $service, array $validated): JobOrder
    {
        $jobOrder = JobOrder::create([
            'customer_id' => $customer->id,
            'vehicle_id' => $validated['vehicle_id'],
            'service_id' => $service->id,
            'arrival_date' => $validated['arrival_date'],
            'arrival_time' => $validated['arrival_time'],
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
