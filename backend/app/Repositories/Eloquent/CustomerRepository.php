<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Enums\AccountStatus;
use App\Models\Customer;
use App\Models\CustomerAuditLog;
use App\Models\CustomerTransaction;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CustomerRepository extends BaseRepository implements CustomerRepositoryInterface
{
    public function __construct(Customer $model)
    {
        parent::__construct($model);
    }

    public function findById(int|string $id): ?Customer
    {
        return $this->model->find($id);
    }

    public function findByEmail(string $email): ?Customer
    {
        return $this->model->where('email', $email)->first();
    }

    public function findByIdOrFail(int|string $id): Customer
    {
        return $this->model->findOrFail($id);
    }

    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        if (isset($filters['account_status'])) {
            $query->where('account_status', $filters['account_status']);
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function create(array $data): Customer
    {
        return $this->model->create($data);
    }

    public function update(int|string $id, array $data): Customer
    {
        $record = $this->model->findOrFail($id);
        $record->update($data);

        return $record->fresh();
    }

    public function registerCustomer(array $data): Customer
    {
        $data['account_status'] = AccountStatus::Pending;

        return $this->model->create($data);
    }

    public function approveAccount(int $customerId, int $approvedBy): Customer
    {
        $customer = $this->model->findOrFail($customerId);
        $customer->update([
            'account_status' => AccountStatus::Approved,
            'approved_by' => $approvedBy,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        return $customer->fresh();
    }

    public function rejectAccount(int $customerId, string $reason): void
    {
        $customer = $this->model->findOrFail($customerId);
        $customer->update([
            'account_status' => AccountStatus::Rejected,
            'rejection_reason' => $reason,
        ]);
    }

    public function softDelete(int $customerId): void
    {
        $customer = $this->model->findOrFail($customerId);
        $customer->update(['account_status' => AccountStatus::Deleted]);
        $customer->delete();
    }

    public function updatePersonalInfo(int $customerId, array $data): Customer
    {
        $customer = $this->model->findOrFail($customerId);
        $customer->update($data);

        return $customer->fresh();
    }

    public function getAuditLog(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = CustomerAuditLog::where('customer_id', $customerId);

        if (isset($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function getTransactions(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = CustomerTransaction::where('customer_id', $customerId);

        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function linkTransaction(int $customerId, array $data): CustomerTransaction
    {
        $data['customer_id'] = $customerId;

        return CustomerTransaction::create($data);
    }

    public function findPendingAccounts(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->newQuery()
            ->where('account_status', AccountStatus::Pending)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}
