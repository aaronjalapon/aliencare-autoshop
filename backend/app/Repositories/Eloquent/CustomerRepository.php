<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Enums\AccountStatus;
use App\Enums\CustomerTransactionType;
use App\Models\Customer;
use App\Models\CustomerAuditLog;
use App\Models\CustomerTransaction;
use App\Models\Vehicle;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class CustomerRepository extends BaseRepository implements CustomerRepositoryInterface
{
    private const VIP_SPEND_THRESHOLD = 50000;

    private const FLEET_VEHICLE_THRESHOLD = 2;

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

    public function findByIdWithSummaryOrFail(int|string $id): Customer
    {
        return $this->summaryQuery()->whereKey($id)->firstOrFail();
    }

    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->summaryQuery();

        if (isset($filters['account_status'])) {
            $query->where('account_status', $filters['account_status']);
        }

        if (isset($filters['segment'])) {
            $segment = strtolower((string) $filters['segment']);

            if ($segment === 'active') {
                $query->where('account_status', AccountStatus::Approved->value)
                    ->where('is_active', true);
            }

            if ($segment === 'inactive') {
                $query->where('account_status', AccountStatus::Approved->value)
                    ->where('is_active', false);
            }

            if ($segment === 'pending') {
                $query->where('account_status', AccountStatus::Pending->value);
            }
        }

        if (isset($filters['tier'])) {
            $this->applyTierFilter($query, strtolower((string) $filters['tier']));
        }

        if (isset($filters['search'])) {
            $search = (string) $filters['search'];
            $query->where(function (Builder $q) use ($search): void {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");

                if (preg_match('/^CUS-(\d+)$/i', $search, $matches) === 1) {
                    $q->orWhere('id', (int) ltrim($matches[1], '0'));
                }
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

    public function updateActivation(int $customerId, bool $isActive): Customer
    {
        $customer = $this->model->findOrFail($customerId);
        $customer->update([
            'is_active' => $isActive,
        ]);

        return $customer->fresh();
    }

    public function updateTierSettings(int $customerId, string $tierMode, ?array $tierOverrides = null): Customer
    {
        $customer = $this->model->findOrFail($customerId);
        $customer->update([
            'tier_mode' => $tierMode,
            'tier_overrides' => $tierMode === 'manual' ? ($tierOverrides ?? []) : null,
        ]);

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

    private function summaryQuery(): Builder
    {
        return $this->model->newQuery()
            ->withCount('vehicles')
            ->addSelect([
                'total_jobs' => DB::table('job_orders')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('job_orders.customer_id', 'customers.id'),
                'last_visit_at' => DB::table('job_orders')
                    ->selectRaw('MAX(arrival_date)')
                    ->whereColumn('job_orders.customer_id', 'customers.id'),
                'total_spent' => CustomerTransaction::query()
                    ->selectRaw('COALESCE(SUM(ABS(amount)), 0)')
                    ->whereColumn('customer_transactions.customer_id', 'customers.id')
                    ->where(function (Builder $query): void {
                        $query->where(function (Builder $invoiceQuery): void {
                            $invoiceQuery
                                ->whereIn('customer_transactions.type', [
                                    CustomerTransactionType::Invoice->value,
                                    CustomerTransactionType::ReservationFee->value,
                                ])
                                ->where('customer_transactions.xendit_status', 'PAID');
                        })->orWhere(function (Builder $paymentQuery): void {
                            $paymentQuery
                                ->where('customer_transactions.type', CustomerTransactionType::Payment->value)
                                ->where(function (Builder $statusQuery): void {
                                    $statusQuery
                                        ->whereNull('customer_transactions.xendit_status')
                                        ->orWhere('customer_transactions.xendit_status', 'PAID')
                                        ->orWhereNotNull('customer_transactions.paid_at');
                                });
                        });
                    }),
                'primary_vehicle_make' => Vehicle::query()
                    ->select('make')
                    ->whereColumn('vehicles.customer_id', 'customers.id')
                    ->orderBy('created_at')
                    ->limit(1),
                'primary_vehicle_model' => Vehicle::query()
                    ->select('model')
                    ->whereColumn('vehicles.customer_id', 'customers.id')
                    ->orderBy('created_at')
                    ->limit(1),
                'primary_vehicle_plate' => Vehicle::query()
                    ->select('plate_number')
                    ->whereColumn('vehicles.customer_id', 'customers.id')
                    ->orderBy('created_at')
                    ->limit(1),
            ]);
    }

    private function applyTierFilter(Builder $query, string $tier): void
    {
        if (! in_array($tier, ['vip', 'fleet'], true)) {
            return;
        }

        if ($tier === 'vip') {
            $query->where(function (Builder $tierQuery): void {
                $tierQuery
                    ->where(function (Builder $manualQuery): void {
                        $manualQuery
                            ->where('tier_mode', 'manual')
                            ->whereJsonContains('tier_overrides', 'VIP');
                    })
                    ->orWhere(function (Builder $autoQuery): void {
                        $autoQuery
                            ->where('tier_mode', 'auto')
                            ->whereRaw($this->paidSpendFilterSql().' >= ?', [self::VIP_SPEND_THRESHOLD]);
                    });
            });

            return;
        }

        $query->where(function (Builder $tierQuery): void {
            $tierQuery
                ->where(function (Builder $manualQuery): void {
                    $manualQuery
                        ->where('tier_mode', 'manual')
                        ->whereJsonContains('tier_overrides', 'Fleet');
                })
                ->orWhere(function (Builder $autoQuery): void {
                    $autoQuery
                        ->where('tier_mode', 'auto')
                        ->whereRaw('(SELECT COUNT(*) FROM vehicles WHERE vehicles.customer_id = customers.id) >= ?', [self::FLEET_VEHICLE_THRESHOLD]);
                });
        });
    }

    private function paidSpendFilterSql(): string
    {
        return "(SELECT COALESCE(SUM(ABS(ct.amount)), 0)
            FROM customer_transactions ct
            WHERE ct.customer_id = customers.id
            AND (
                (ct.type IN ('invoice', 'reservation_fee') AND ct.xendit_status = 'PAID')
                OR (ct.type = 'payment' AND (ct.xendit_status IS NULL OR ct.xendit_status = 'PAID' OR ct.paid_at IS NOT NULL))
            ))";
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
