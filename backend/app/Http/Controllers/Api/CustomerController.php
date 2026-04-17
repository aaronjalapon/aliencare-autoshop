<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Contracts\Services\CustomerServiceInterface;
use App\Contracts\Services\JobOrderServiceInterface;
use App\Enums\CustomerTransactionType;
use App\Enums\JobOrderStatus;
use App\Enums\UserRole;
use App\Exceptions\JobOrderNotFoundException;
use App\Exceptions\JobOrderStateException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Customer\CompleteOnboardingRequest;
use App\Http\Requests\Api\Customer\GetCustomerBillingReceiptsRequest;
use App\Http\Requests\Api\Customer\GetCustomerTransactionsRequest;
use App\Http\Requests\Api\Customer\LinkTransactionRequest;
use App\Http\Requests\Api\Customer\RegisterCustomerRequest;
use App\Http\Requests\Api\Customer\RejectCustomerRequest;
use App\Http\Requests\Api\Customer\RescheduleCustomerJobOrderRequest;
use App\Http\Requests\Api\Customer\StoreCustomerRequest;
use App\Http\Requests\Api\Customer\UpdateCustomerRequest;
use App\Http\Requests\Api\Customer\UpdateCustomerTransactionRequest;
use App\Http\Requests\Api\Customer\UpdatePersonalInfoRequest;
use App\Http\Requests\Api\Customer\UpdateSpecialInfoRequest;
use App\Http\Resources\CustomerAuditLogResource;
use App\Http\Resources\CustomerBillingReceiptResource;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\CustomerTransactionResource;
use App\Http\Resources\JobOrderResource;
use App\Http\Resources\VehicleResource;
use App\Models\BookingSlot;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CustomerController extends Controller
{
    public function __construct(
        private CustomerRepositoryInterface $customerRepository,
        private CustomerServiceInterface $customerService,
        private JobOrderServiceInterface $jobOrderService,
    ) {}

    public function me(Request $request): JsonResponse
    {
        $customer = $this->resolveAuthenticatedCustomer($request);

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'No customer record linked to this account.',
            ], 404);
        }

        $customer->load('vehicles');

        return response()->json([
            'success' => true,
            'data' => new CustomerResource($customer),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = array_filter([
            'account_status' => $request->input('account_status'),
            'search' => $request->input('search'),
        ], fn ($value) => $value !== null);

        $customers = $this->customerRepository->all(
            $filters,
            (int) $request->get('per_page', 15)
        );

        return response()->json([
            'success' => true,
            'data' => CustomerResource::collection($customers)->response()->getData(),
        ]);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        try {
            $customer = $this->customerService->register($request->validated());

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Customer created successfully.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create customer: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $customer = $this->customerRepository->findByIdOrFail($id);

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer->load('vehicles')),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }
    }

    public function update(UpdateCustomerRequest $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsId($request, $id)) {
                return $response;
            }

            $customer = $this->customerService->updatePersonalInfo(
                $id,
                $request->validated(),
                $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Customer updated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update customer: '.$e->getMessage(),
            ], 500);
        }
    }

    public function register(RegisterCustomerRequest $request): JsonResponse
    {
        try {
            $customer = $this->customerService->register($request->validated());

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Registration submitted. Your account is pending approval.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed: '.$e->getMessage(),
            ], 500);
        }
    }

    public function onboardingStatus(Request $request): JsonResponse
    {
        if (! $this->isCustomerRole($request->user()?->role)) {
            return response()->json([
                'success' => false,
                'message' => 'Only customers can access onboarding.',
            ], 403);
        }

        $customer = $this->resolveAuthenticatedCustomer($request);

        if (! $customer) {
            return response()->json([
                'success' => true,
                'data' => [
                    'has_customer_profile' => false,
                    'onboarding_completed' => false,
                    'customer' => null,
                ],
            ]);
        }

        $customer->load('vehicles');

        return response()->json([
            'success' => true,
            'data' => [
                'has_customer_profile' => true,
                'onboarding_completed' => $customer->onboarding_completed_at !== null,
                'customer' => new CustomerResource($customer),
            ],
        ]);
    }

    public function completeOnboarding(CompleteOnboardingRequest $request): JsonResponse
    {
        if (! $this->hasOnboardingColumns()) {
            return $this->missingOnboardingColumnsResponse();
        }

        try {
            $customer = $this->customerService->completeOnboarding(
                $request->user(),
                $request->validated(),
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Onboarding completed successfully.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (QueryException $e) {
            if ($this->isMissingOnboardingColumnException($e)) {
                return $this->missingOnboardingColumnsResponse();
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete onboarding.',
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete onboarding.',
            ], 500);
        }
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        try {
            $this->authorize('approve-customers');

            $customer = $this->customerService->approve($id, $request->user()->id);

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Customer account approved.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve customer: '.$e->getMessage(),
            ], 500);
        }
    }

    public function reject(RejectCustomerRequest $request, int $id): JsonResponse
    {
        try {
            $this->authorize('reject-customers');

            $this->customerService->reject($id, $request->user()->id, $request->validated('reason'));

            return response()->json([
                'success' => true,
                'message' => 'Customer account rejected.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject customer: '.$e->getMessage(),
            ], 500);
        }
    }

    public function requestDelete(Request $request, int $id): JsonResponse
    {
        try {
            $this->customerService->requestDeletion($id, $request->user()->id, $request->ip());

            return response()->json([
                'success' => true,
                'message' => 'Deletion request submitted.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to request deletion: '.$e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $this->authorize('delete-customers');

            $this->customerService->delete($id, $request->user()->id, $request->ip());

            return response()->json([
                'success' => true,
                'message' => 'Customer deleted successfully.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete customer: '.$e->getMessage(),
            ], 500);
        }
    }

    public function updatePersonalInfo(UpdatePersonalInfoRequest $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsId($request, $id)) {
                return $response;
            }

            $customer = $this->customerService->updatePersonalInfo(
                $id,
                $request->validated(),
                $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Personal information updated.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update personal info: '.$e->getMessage(),
            ], 500);
        }
    }

    public function updateSpecialInfo(UpdateSpecialInfoRequest $request, int $id): JsonResponse
    {
        if (! $this->hasOnboardingColumns()) {
            return $this->missingOnboardingColumnsResponse();
        }

        try {
            if ($response = $this->ensureCustomerOwnsId($request, $id)) {
                return $response;
            }

            $customer = $this->customerService->updateSpecialInfo(
                $id,
                $request->validated(),
                $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Special information updated.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (QueryException $e) {
            if ($this->isMissingOnboardingColumnException($e)) {
                return $this->missingOnboardingColumnsResponse();
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to update special information.',
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update special information.',
            ], 500);
        }
    }

    public function auditLog(Request $request, int $id): JsonResponse
    {
        try {
            $this->authorize('view-audit-logs');

            $filters = array_filter([
                'action' => $request->input('action'),
                'entity_type' => $request->input('entity_type'),
            ], fn ($value) => $value !== null);

            $logs = $this->customerService->getAuditLog(
                $id,
                $filters,
                (int) $request->get('per_page', 15),
            );

            return response()->json([
                'success' => true,
                'data' => CustomerAuditLogResource::collection($logs)->response()->getData(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve audit log: '.$e->getMessage(),
            ], 500);
        }
    }

    public function transactions(GetCustomerTransactionsRequest $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsId($request, $id)) {
                return $response;
            }

            $filters = array_filter([
                'type' => $request->input('type'),
                'payment_state' => $request->input('payment_state'),
                'search' => $request->input('search'),
                'from_date' => $request->input('from_date'),
                'to_date' => $request->input('to_date'),
                'payment_method' => $request->input('payment_method'),
            ], fn ($value) => $value !== null && $value !== '');

            $transactions = $this->customerService->getTransactions(
                $id,
                $filters,
                (int) $request->input('per_page', 15),
            );

            return response()->json([
                'success' => true,
                'data' => CustomerTransactionResource::collection($transactions)->response()->getData(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transactions: '.$e->getMessage(),
            ], 500);
        }
    }

    public function myTransactions(GetCustomerTransactionsRequest $request): JsonResponse
    {
        try {
            $customer = $this->resolveAuthenticatedCustomer($request);

            if (! $customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No customer record linked to this account.',
                ], 404);
            }

            $filters = array_filter([
                'type' => $request->input('type'),
                'payment_state' => $request->input('payment_state'),
                'search' => $request->input('search'),
                'from_date' => $request->input('from_date'),
                'to_date' => $request->input('to_date'),
                'payment_method' => $request->input('payment_method'),
            ], fn ($value) => $value !== null && $value !== '');

            $transactions = $this->customerService->getTransactions(
                $customer->id,
                $filters,
                (int) $request->input('per_page', 15),
            );

            return response()->json([
                'success' => true,
                'data' => CustomerTransactionResource::collection($transactions)->response()->getData(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transactions: '.$e->getMessage(),
            ], 500);
        }
    }

    public function myBillingSummary(Request $request): JsonResponse
    {
        try {
            $customer = $this->resolveAuthenticatedCustomer($request);

            if (! $customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No customer record linked to this account.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $this->customerService->getBillingSummary($customer->id),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve billing summary: '.$e->getMessage(),
            ], 500);
        }
    }

    public function myBillingReceipts(GetCustomerBillingReceiptsRequest $request): JsonResponse
    {
        try {
            $customer = $this->resolveAuthenticatedCustomer($request);

            if (! $customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No customer record linked to this account.',
                ], 404);
            }

            $filters = array_filter([
                'search' => $request->input('search'),
                'from_date' => $request->input('from_date'),
                'to_date' => $request->input('to_date'),
                'payment_method' => $request->input('payment_method'),
            ], fn ($value) => $value !== null && $value !== '');

            $receipts = $this->customerService->getBillingReceipts(
                $customer->id,
                $filters,
                (int) $request->input('per_page', 15),
            );

            return response()->json([
                'success' => true,
                'data' => CustomerBillingReceiptResource::collection($receipts)->response()->getData(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve billing receipts: '.$e->getMessage(),
            ], 500);
        }
    }

    public function myBillingReceiptDetail(Request $request, int $transactionId): JsonResponse
    {
        try {
            $customer = $this->resolveAuthenticatedCustomer($request);

            if (! $customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No customer record linked to this account.',
                ], 404);
            }

            $receipt = $this->customerService->getBillingReceiptDetail($customer->id, $transactionId);

            if (! $receipt) {
                return response()->json([
                    'success' => false,
                    'message' => 'Receipt not found.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => new CustomerBillingReceiptResource($receipt),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve receipt detail: '.$e->getMessage(),
            ], 500);
        }
    }

    public function linkTransaction(LinkTransactionRequest $request, int $id): JsonResponse
    {
        try {
            $this->ensureCanManageTransactions($request);
            $this->authorize('link-transactions');

            $transaction = $this->customerService->linkTransaction($id, $request->validated());

            return response()->json([
                'success' => true,
                'data' => new CustomerTransactionResource($transaction),
                'message' => 'Transaction linked successfully.',
            ], 201);
        } catch (HttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to link transaction: '.$e->getMessage(),
            ], 500);
        }
    }

    public function updateTransaction(UpdateCustomerTransactionRequest $request, int $id, int $transactionId): JsonResponse
    {
        try {
            $this->ensureCanManageTransactions($request);
            $this->authorize('update-transactions');

            $transaction = $this->customerService->updateTransaction(
                $id,
                $transactionId,
                $request->validated(),
                $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new CustomerTransactionResource($transaction),
                'message' => 'Transaction updated successfully.',
            ]);
        } catch (HttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Transaction not found.',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update transaction: '.$e->getMessage(),
            ], 500);
        }
    }

    public function vehicles(Request $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsId($request, $id)) {
                return $response;
            }

            $customer = $this->customerRepository->findByIdOrFail($id);

            return response()->json([
                'success' => true,
                'data' => VehicleResource::collection($customer->vehicles),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }
    }

    public function jobOrders(Request $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsId($request, $id)) {
                return $response;
            }

            $customer = $this->customerRepository->findByIdOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $customer->jobOrders()->with(['vehicle', 'mechanic.user', 'bay'])->orderBy('created_at', 'desc')->get(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }
    }

    public function myJobOrders(Request $request): JsonResponse
    {
        try {
            $customer = $this->resolveAuthenticatedCustomer($request);

            if (! $customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No customer record linked to this account.',
                ], 404);
            }

            $jobOrders = $customer->jobOrders()
                ->with(['vehicle', 'mechanic.user', 'bay', 'service', 'items'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => JobOrderResource::collection($jobOrders),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve job orders: '.$e->getMessage(),
            ], 500);
        }
    }

    public function rescheduleMyJobOrder(RescheduleCustomerJobOrderRequest $request, int $id): JsonResponse
    {
        if (! Schema::hasTable('booking_slots')) {
            return response()->json([
                'success' => false,
                'message' => 'Booking slots are not configured yet. Please run database migrations.',
            ], 503);
        }

        try {
            $ownedJobOrder = $this->resolveOwnedJobOrder($request, $id);

            if ($ownedJobOrder instanceof JsonResponse) {
                return $ownedJobOrder;
            }

            if (! $this->canCustomerModifySchedule($ownedJobOrder)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only upcoming bookings can be rescheduled.',
                ], 422);
            }

            $arrivalDate = $request->validated('arrival_date');
            $arrivalTime = $request->validated('arrival_time');

            $updatedJobOrder = $this->withSlotBookingLock($arrivalDate, $arrivalTime, function () use ($ownedJobOrder, $arrivalDate, $arrivalTime): JobOrder {
                return DB::transaction(function () use ($ownedJobOrder, $arrivalDate, $arrivalTime): JobOrder {
                    $slotSetting = BookingSlot::query()
                        ->active()
                        ->where('time', $arrivalTime)
                        ->lockForUpdate()
                        ->first();

                    if (! $slotSetting) {
                        throw new HttpException(422, 'Selected arrival slot is unavailable.');
                    }

                    $jobOrder = JobOrder::query()->whereKey($ownedJobOrder->id)->lockForUpdate()->first();

                    if (! $jobOrder) {
                        throw new HttpException(404, 'Job order not found.');
                    }

                    if (! $this->canCustomerModifySchedule($jobOrder)) {
                        throw new HttpException(422, 'Only upcoming bookings can be rescheduled.');
                    }

                    if (! $this->slotHasCapacityForReschedule($jobOrder, $arrivalDate, $arrivalTime, (int) $slotSetting->capacity)) {
                        throw new HttpException(422, 'Selected arrival slot is full. Please choose another time.');
                    }

                    $jobOrder->update([
                        'arrival_date' => $arrivalDate,
                        'arrival_time' => $arrivalTime,
                    ]);

                    return $jobOrder->fresh(['vehicle', 'mechanic.user', 'bay', 'service', 'items']);
                });
            });

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($updatedJobOrder),
                'message' => 'Booking rescheduled successfully.',
            ]);
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reschedule booking: '.$e->getMessage(),
            ], 500);
        }
    }

    public function cancelMyJobOrder(Request $request, int $id): JsonResponse
    {
        try {
            $ownedJobOrder = $this->resolveOwnedJobOrder($request, $id);

            if ($ownedJobOrder instanceof JsonResponse) {
                return $ownedJobOrder;
            }

            if (! $this->canCustomerModifySchedule($ownedJobOrder)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only upcoming bookings can be canceled.',
                ], 422);
            }

            $jobOrder = $this->jobOrderService->cancelJobOrder($ownedJobOrder->id);

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($jobOrder->load(['vehicle', 'mechanic.user', 'bay', 'service', 'items'])),
                'message' => 'Booking canceled successfully.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking: '.$e->getMessage(),
            ], 500);
        }
    }

    public function myJobOrderReceiptUrl(Request $request, int $id): JsonResponse
    {
        try {
            $ownedJobOrder = $this->resolveOwnedJobOrder($request, $id);

            if ($ownedJobOrder instanceof JsonResponse) {
                return $ownedJobOrder;
            }

            $customer = $this->resolveAuthenticatedCustomer($request);

            if (! $customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No customer record linked to this account.',
                ], 404);
            }

            $transaction = CustomerTransaction::query()
                ->where('customer_id', $customer->id)
                ->where('job_order_id', $ownedJobOrder->id)
                ->whereIn('type', [
                    CustomerTransactionType::Invoice->value,
                    CustomerTransactionType::ReservationFee->value,
                ])
                ->orderByDesc('paid_at')
                ->orderByDesc('created_at')
                ->first();

            if (! $transaction || ! $transaction->payment_url) {
                return response()->json([
                    'success' => false,
                    'message' => 'No receipt URL is available yet for this booking.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'job_order_id' => $ownedJobOrder->id,
                    'transaction_id' => $transaction->id,
                    'payment_url' => $transaction->payment_url,
                    'xendit_status' => $transaction->xendit_status,
                    'paid_at' => $transaction->paid_at?->toISOString(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve receipt URL: '.$e->getMessage(),
            ], 500);
        }
    }

    private function resolveAuthenticatedCustomer(Request $request): ?Customer
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        return Customer::where('email', $user->email)->first();
    }

    private function resolveOwnedJobOrder(Request $request, int $jobOrderId): JobOrder|JsonResponse
    {
        $customer = $this->resolveAuthenticatedCustomer($request);

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'No customer record linked to this account.',
            ], 404);
        }

        $jobOrder = JobOrder::query()->whereKey($jobOrderId)->first();

        if (! $jobOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Job order not found.',
            ], 404);
        }

        if ((int) $jobOrder->customer_id !== (int) $customer->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not allowed to access this job order.',
            ], 403);
        }

        return $jobOrder;
    }

    private function canCustomerModifySchedule(JobOrder $jobOrder): bool
    {
        $status = $this->jobOrderStatusValue($jobOrder);

        return in_array($status, [
            JobOrderStatus::Created->value,
            JobOrderStatus::PendingApproval->value,
            JobOrderStatus::Approved->value,
        ], true);
    }

    private function jobOrderStatusValue(JobOrder $jobOrder): string
    {
        return $jobOrder->status instanceof JobOrderStatus
            ? $jobOrder->status->value
            : (string) $jobOrder->status;
    }

    private function slotHasCapacityForReschedule(JobOrder $jobOrder, string $arrivalDate, string $arrivalTime, int $capacity): bool
    {
        $bookedCount = $this->applyCapacityBlockingScope(
            JobOrder::query()
                ->whereDate('arrival_date', $arrivalDate)
                ->where('arrival_time', $arrivalTime)
                ->whereKeyNot($jobOrder->id)
        )->count();

        return $bookedCount < $capacity;
    }

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

    private function ensureCustomerOwnsId(Request $request, int $customerId): ?JsonResponse
    {
        if (! $this->isCustomerRole($request->user()?->role)) {
            return null;
        }

        $customer = $this->resolveAuthenticatedCustomer($request);

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'No customer record linked to this account.',
            ], 404);
        }

        if ($customer->id !== $customerId) {
            return response()->json([
                'success' => false,
                'message' => 'You are not allowed to access this customer.',
            ], 403);
        }

        return null;
    }

    private function ensureCanManageTransactions(Request $request): void
    {
        $role = $request->user()?->role;

        if (
            $role === UserRole::Admin
            || $role === UserRole::FrontDesk
            || $role === UserRole::Admin->value
            || $role === UserRole::FrontDesk->value
        ) {
            return;
        }

        throw new HttpException(403, 'Only admin or frontdesk accounts can manage customer transactions.');
    }

    private function isCustomerRole(mixed $role): bool
    {
        return $role === UserRole::Customer || $role === UserRole::Customer->value;
    }

    private function hasOnboardingColumns(): bool
    {
        return Schema::hasColumn('customers', 'preferred_contact_method')
            && Schema::hasColumn('customers', 'special_notes')
            && Schema::hasColumn('customers', 'onboarding_completed_at');
    }

    private function missingOnboardingColumnsResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Onboarding is temporarily unavailable because required database updates are missing. Please run php artisan migrate and try again.',
        ], 503);
    }

    private function isMissingOnboardingColumnException(QueryException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'no column named preferred_contact_method')
            || str_contains($message, 'no column named special_notes')
            || str_contains($message, 'no column named onboarding_completed_at')
            || str_contains($message, "unknown column 'preferred_contact_method'")
            || str_contains($message, "unknown column 'special_notes'")
            || str_contains($message, "unknown column 'onboarding_completed_at'");
    }
}
