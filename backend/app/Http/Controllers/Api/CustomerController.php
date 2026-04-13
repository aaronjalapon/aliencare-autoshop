<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Contracts\Services\CustomerServiceInterface;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Customer\CompleteOnboardingRequest;
use App\Http\Requests\Api\Customer\LinkTransactionRequest;
use App\Http\Requests\Api\Customer\RegisterCustomerRequest;
use App\Http\Requests\Api\Customer\RejectCustomerRequest;
use App\Http\Requests\Api\Customer\StoreCustomerRequest;
use App\Http\Requests\Api\Customer\UpdateCustomerRequest;
use App\Http\Requests\Api\Customer\UpdatePersonalInfoRequest;
use App\Http\Requests\Api\Customer\UpdateSpecialInfoRequest;
use App\Http\Resources\CustomerAuditLogResource;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\CustomerTransactionResource;
use App\Http\Resources\JobOrderResource;
use App\Http\Resources\VehicleResource;
use App\Models\Customer;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CustomerController extends Controller
{
    public function __construct(
        private CustomerRepositoryInterface $customerRepository,
        private CustomerServiceInterface $customerService,
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

    public function transactions(Request $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsId($request, $id)) {
                return $response;
            }

            $filters = array_filter([
                'type' => $request->input('type'),
            ], fn ($value) => $value !== null);

            $transactions = $this->customerService->getTransactions(
                $id,
                $filters,
                (int) $request->get('per_page', 15),
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

    public function myTransactions(Request $request): JsonResponse
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
            ], fn ($value) => $value !== null);

            $transactions = $this->customerService->getTransactions(
                $customer->id,
                $filters,
                (int) $request->get('per_page', 15),
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

    public function linkTransaction(LinkTransactionRequest $request, int $id): JsonResponse
    {
        try {
            $this->authorize('link-transactions');

            $transaction = $this->customerService->linkTransaction($id, $request->validated());

            return response()->json([
                'success' => true,
                'data' => new CustomerTransactionResource($transaction),
                'message' => 'Transaction linked successfully.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to link transaction: '.$e->getMessage(),
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
                ->with(['vehicle', 'mechanic.user', 'bay', 'service'])
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

    private function resolveAuthenticatedCustomer(Request $request): ?Customer
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        return Customer::where('email', $user->email)->first();
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
