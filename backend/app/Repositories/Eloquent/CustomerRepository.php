<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Enums\AccountStatus;
use App\Enums\CustomerTransactionType;
use App\Models\Customer;
use App\Models\CustomerAuditLog;
use App\Models\CustomerTransaction;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

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

        if (isset($filters['payment_state'])) {
            $paymentState = (string) $filters['payment_state'];

            if ($paymentState === 'paid') {
                $query->where(function (Builder $paidQuery): void {
                    $paidQuery->where(function (Builder $invoicePaidQuery): void {
                        $invoicePaidQuery->whereIn('type', [
                            CustomerTransactionType::Invoice->value,
                            CustomerTransactionType::ReservationFee->value,
                        ])->where('xendit_status', 'PAID');
                    })->orWhere(function (Builder $paymentQuery): void {
                        $paymentQuery->where('type', CustomerTransactionType::Payment->value)
                            ->where(function (Builder $paymentStatusQuery): void {
                                $paymentStatusQuery->whereNull('xendit_status')
                                    ->orWhere('xendit_status', 'PAID')
                                    ->orWhereNotNull('paid_at');
                            });
                    });
                });
            }

            if ($paymentState === 'pending') {
                $query->whereIn('type', [
                    CustomerTransactionType::Invoice->value,
                    CustomerTransactionType::ReservationFee->value,
                ])->where(function (Builder $statusQuery): void {
                    $statusQuery->whereNull('xendit_status')
                        ->orWhere('xendit_status', '!=', 'PAID');
                });
            }
        }

        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (isset($filters['job_order_id'])) {
            $query->where('job_order_id', (int) $filters['job_order_id']);
        }

        if (isset($filters['reference_number'])) {
            $query->where('reference_number', (string) $filters['reference_number']);
        }

        if (isset($filters['search'])) {
            $search = (string) $filters['search'];

            $query->where(function (Builder $searchQuery) use ($search): void {
                $searchQuery->where('notes', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhere('external_id', 'like', "%{$search}%")
                    ->orWhereHas('jobOrder', function (Builder $jobOrderQuery) use ($search): void {
                        $jobOrderQuery->where('jo_number', 'like', "%{$search}%");
                    });
            });
        }

        if (isset($filters['from_date'])) {
            $fromDate = (string) $filters['from_date'];

            $query->where(function (Builder $dateQuery) use ($fromDate): void {
                $dateQuery->whereDate('paid_at', '>=', $fromDate)
                    ->orWhere(function (Builder $fallbackDateQuery) use ($fromDate): void {
                        $fallbackDateQuery->whereNull('paid_at')
                            ->whereDate('created_at', '>=', $fromDate);
                    });
            });
        }

        if (isset($filters['to_date'])) {
            $toDate = (string) $filters['to_date'];

            $query->where(function (Builder $dateQuery) use ($toDate): void {
                $dateQuery->whereDate('paid_at', '<=', $toDate)
                    ->orWhere(function (Builder $fallbackDateQuery) use ($toDate): void {
                        $fallbackDateQuery->whereNull('paid_at')
                            ->whereDate('created_at', '<=', $toDate);
                    });
            });
        }

        if (isset($filters['payment_method'])) {
            $query->where('payment_method', (string) $filters['payment_method']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function findTransactionForCustomer(int $customerId, int $transactionId): ?CustomerTransaction
    {
        return CustomerTransaction::query()
            ->where('customer_id', $customerId)
            ->whereKey($transactionId)
            ->first();
    }

    public function updateTransaction(int $customerId, int $transactionId, array $data): CustomerTransaction
    {
        $transaction = CustomerTransaction::query()
            ->where('customer_id', $customerId)
            ->whereKey($transactionId)
            ->firstOrFail();

        $transaction->update($data);

        return $transaction->fresh();
    }

    public function getBillingSummary(int $customerId): array
    {
        $pendingQuery = CustomerTransaction::query()
            ->where('customer_id', $customerId)
            ->whereIn('type', [
                CustomerTransactionType::Invoice->value,
                CustomerTransactionType::ReservationFee->value,
            ])
            ->where(function (Builder $statusQuery): void {
                $statusQuery->whereNull('xendit_status')
                    ->orWhere('xendit_status', '!=', 'PAID');
            });

        $paidQuery = $this->billingReceiptBaseQuery($customerId);

        $lastPayment = (clone $paidQuery)
            ->orderByRaw('COALESCE(paid_at, created_at) DESC')
            ->first();

        return [
            'outstanding_balance' => (float) ((clone $pendingQuery)->sum(DB::raw('ABS(amount)'))),
            'pending_count' => (clone $pendingQuery)->count(),
            'total_paid' => (float) ((clone $paidQuery)->sum(DB::raw('ABS(amount)'))),
            'paid_count' => (clone $paidQuery)->count(),
            'total_transactions' => CustomerTransaction::query()->where('customer_id', $customerId)->count(),
            'last_payment' => $lastPayment ? [
                'id' => $lastPayment->id,
                'job_order_id' => $lastPayment->job_order_id,
                'amount' => abs((float) $lastPayment->amount),
                'type' => $lastPayment->type?->value ?? (string) $lastPayment->type,
                'payment_method' => $lastPayment->payment_method,
                'notes' => $lastPayment->notes,
                'paid_at' => $lastPayment->paid_at?->toISOString(),
                'created_at' => $lastPayment->created_at?->toISOString(),
            ] : null,
        ];
    }

    public function getBillingReceipts(int $customerId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->billingReceiptBaseQuery($customerId)
            ->with([
                'customer',
                'jobOrder.service',
                'jobOrder.items.inventoryItem',
                'jobOrder.vehicle',
                'jobOrder.customer',
            ]);

        if (isset($filters['search'])) {
            $search = (string) $filters['search'];

            $query->where(function (Builder $searchQuery) use ($search): void {
                $searchQuery->where('notes', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhere('external_id', 'like', "%{$search}%")
                    ->orWhereHas('jobOrder', function (Builder $jobOrderQuery) use ($search): void {
                        $jobOrderQuery->where('jo_number', 'like', "%{$search}%");
                    });
            });
        }

        if (isset($filters['from_date'])) {
            $fromDate = (string) $filters['from_date'];

            $query->where(function (Builder $dateQuery) use ($fromDate): void {
                $dateQuery->whereDate('paid_at', '>=', $fromDate)
                    ->orWhere(function (Builder $fallbackDateQuery) use ($fromDate): void {
                        $fallbackDateQuery->whereNull('paid_at')
                            ->whereDate('created_at', '>=', $fromDate);
                    });
            });
        }

        if (isset($filters['to_date'])) {
            $toDate = (string) $filters['to_date'];

            $query->where(function (Builder $dateQuery) use ($toDate): void {
                $dateQuery->whereDate('paid_at', '<=', $toDate)
                    ->orWhere(function (Builder $fallbackDateQuery) use ($toDate): void {
                        $fallbackDateQuery->whereNull('paid_at')
                            ->whereDate('created_at', '<=', $toDate);
                    });
            });
        }

        if (isset($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        return $query
            ->orderByRaw('COALESCE(paid_at, created_at) DESC')
            ->paginate($perPage);
    }

    public function getBillingReceiptDetail(int $customerId, int $transactionId): ?CustomerTransaction
    {
        return $this->billingReceiptBaseQuery($customerId)
            ->with([
                'customer',
                'jobOrder.service',
                'jobOrder.items.inventoryItem',
                'jobOrder.vehicle',
                'jobOrder.customer',
            ])
            ->whereKey($transactionId)
            ->first();
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

    private function billingReceiptBaseQuery(int $customerId): Builder
    {
        return CustomerTransaction::query()
            ->where('customer_id', $customerId)
            ->where(function (Builder $query): void {
                $query
                    ->where(function (Builder $invoiceQuery): void {
                        $invoiceQuery
                            ->whereIn('type', [
                                CustomerTransactionType::Invoice->value,
                                CustomerTransactionType::ReservationFee->value,
                            ])
                            ->where('xendit_status', 'PAID');
                    })
                    ->orWhere(function (Builder $paymentQuery): void {
                        $paymentQuery
                            ->where('type', CustomerTransactionType::Payment->value)
                            ->where(function (Builder $statusQuery): void {
                                $statusQuery
                                    ->whereNull('xendit_status')
                                    ->orWhere('xendit_status', 'PAID')
                                    ->orWhereNotNull('paid_at');
                            });
                    });
            });
    }
}
