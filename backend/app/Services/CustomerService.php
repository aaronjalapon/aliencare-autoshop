<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Contracts\Services\CustomerServiceInterface;
use App\Enums\AccountStatus;
use App\Enums\JobOrderStatus;
use App\Events\CustomerAccountApproved;
use App\Events\CustomerAccountCreated;
use App\Events\CustomerAccountDeleted;
use App\Events\CustomerAccountRejected;
use App\Models\Customer;
use App\Models\CustomerAuditLog;
use App\Models\CustomerTransaction;
use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CustomerService implements CustomerServiceInterface
{
    public function __construct(
        private CustomerRepositoryInterface $customerRepository,
    ) {}

    public function register(array $data): Customer
    {
        return DB::transaction(function () use ($data) {
            $vehicles = $data['vehicles'] ?? [];
            unset($data['vehicles']);

            $customer = $this->customerRepository->registerCustomer($data);

            foreach ($vehicles as $vehicleData) {
                $vehicleData['customer_id'] = $customer->id;
                $vehicleData['approval_status'] = 'pending';
                Vehicle::create($vehicleData);
            }

            $this->logAudit($customer->id, null, 'create', 'customer', null, $customer->toArray());

            event(new CustomerAccountCreated($customer));

            return $customer->load('vehicles');
        });
    }

    public function approve(int $customerId, int $approvedBy): Customer
    {
        return DB::transaction(function () use ($customerId, $approvedBy) {
            $customer = $this->customerRepository->findByIdOrFail($customerId);

            if ($customer->account_status !== AccountStatus::Pending) {
                throw new \InvalidArgumentException('Only pending accounts can be approved.');
            }

            $oldData = $customer->toArray();
            $customer = $this->customerRepository->approveAccount($customerId, $approvedBy);

            $this->logAudit($customerId, $approvedBy, 'approve', 'customer', $oldData, $customer->toArray());

            event(new CustomerAccountApproved($customer, $approvedBy));

            return $customer;
        });
    }

    public function reject(int $customerId, int $rejectedBy, string $reason): void
    {
        DB::transaction(function () use ($customerId, $rejectedBy, $reason) {
            $customer = $this->customerRepository->findByIdOrFail($customerId);

            if ($customer->account_status !== AccountStatus::Pending) {
                throw new \InvalidArgumentException('Only pending accounts can be rejected.');
            }

            $oldData = $customer->toArray();
            $this->customerRepository->rejectAccount($customerId, $reason);

            $this->logAudit($customerId, $rejectedBy, 'reject', 'customer', $oldData, [
                'account_status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            event(new CustomerAccountRejected($customer, $reason));
        });
    }

    public function requestDeletion(int $customerId, int $requestedBy, ?string $ip = null): void
    {
        DB::transaction(function () use ($customerId, $requestedBy, $ip) {
            $customer = $this->customerRepository->findByIdOrFail($customerId);

            $this->guardAgainstActiveJobOrders($customer);

            $this->logAudit($customerId, $requestedBy, 'request_delete', 'customer', $customer->toArray(), null, $ip);
        });
    }

    public function delete(int $customerId, int $deletedBy, ?string $ip = null): void
    {
        DB::transaction(function () use ($customerId, $deletedBy, $ip) {
            $customer = $this->customerRepository->findByIdOrFail($customerId);

            $this->guardAgainstActiveJobOrders($customer);

            $oldData = $customer->toArray();
            $this->customerRepository->softDelete($customerId);

            $this->logAudit($customerId, $deletedBy, 'delete', 'customer', $oldData, null, $ip);

            event(new CustomerAccountDeleted($customer, $deletedBy));
        });
    }

    public function updatePersonalInfo(int $customerId, array $data, int $userId, ?string $ip = null): Customer
    {
        return DB::transaction(function () use ($customerId, $data, $userId, $ip) {
            $customer = $this->customerRepository->findByIdOrFail($customerId);
            $oldData = $customer->only(array_keys($data));

            $customer = $this->customerRepository->updatePersonalInfo($customerId, $data);

            $this->logAudit($customerId, $userId, 'update', 'customer', $oldData, $customer->only(array_keys($data)), $ip);

            return $customer;
        });
    }

    public function getAuditLog(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $this->customerRepository->findByIdOrFail($customerId);

        return $this->customerRepository->getAuditLog($customerId, $filters, $perPage);
    }

    public function getTransactions(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $this->customerRepository->findByIdOrFail($customerId);

        return $this->customerRepository->getTransactions($customerId, $filters, $perPage);
    }

    public function linkTransaction(int $customerId, array $data): CustomerTransaction
    {
        return DB::transaction(function () use ($customerId, $data) {
            $this->customerRepository->findByIdOrFail($customerId);

            $transaction = $this->customerRepository->linkTransaction($customerId, $data);

            $this->logAudit($customerId, null, 'create', 'transaction', null, $transaction->toArray());

            return $transaction;
        });
    }

    private function guardAgainstActiveJobOrders(Customer $customer): void
    {
        $terminalStatuses = [
            JobOrderStatus::Completed->value,
            JobOrderStatus::Settled->value,
            JobOrderStatus::Cancelled->value,
        ];

        $hasActive = $customer->jobOrders()
            ->whereNotIn('status', $terminalStatuses)
            ->exists();

        if ($hasActive) {
            throw new \InvalidArgumentException('Cannot delete customer with active job orders.');
        }
    }

    private function logAudit(
        int $customerId,
        ?int $userId,
        string $action,
        string $entityType,
        ?array $oldData,
        ?array $newData,
        ?string $ip = null,
    ): void {
        CustomerAuditLog::create([
            'customer_id' => $customerId,
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'old_data' => $oldData,
            'new_data' => $newData,
            'ip_address' => $ip,
        ]);
    }
}
