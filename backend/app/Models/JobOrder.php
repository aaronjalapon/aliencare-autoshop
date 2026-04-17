<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CustomerTransactionType;
use App\Enums\JobOrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class JobOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'jo_number',
        'customer_id',
        'vehicle_id',
        'service_id',
        'arrival_date',
        'arrival_time',
        'reservation_expires_at',
        'status',
        'assigned_mechanic_id',
        'bay_id',
        'service_fee',
        'settled_flag',
        'invoice_id',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => JobOrderStatus::class,
            'service_fee' => 'decimal:2',
            'settled_flag' => 'boolean',
            'approved_at' => 'datetime',
            'arrival_date' => 'date:Y-m-d',
            'reservation_expires_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (JobOrder $jobOrder) {
            if (empty($jobOrder->jo_number)) {
                $jobOrder->jo_number = self::generateJoNumber();
            }
        });
    }

    /**
     * Generate a unique JO number in format JO-YYYY-NNNN.
     */
    public static function generateJoNumber(): string
    {
        $year = now()->year;
        $prefix = "JO-{$year}-";

        $lastOrder = self::where('jo_number', 'like', "{$prefix}%")
            ->orderByRaw('CAST(SUBSTRING(jo_number, '.((strlen($prefix) + 1)).') AS INTEGER) DESC')
            ->first();

        if ($lastOrder) {
            $lastNumber = (int) substr($lastOrder->jo_number, strlen($prefix));
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate the total cost of all items plus service fee.
     */
    public function calculateTotalCost(): float
    {
        $itemsTotal = $this->items()->sum('total_price');

        return (float) $itemsTotal + (float) $this->service_fee;
    }

    public function calculatePaidAmount(): float
    {
        if ($this->relationLoaded('customerTransactions')) {
            return (float) $this->customerTransactions
                ->filter(fn (CustomerTransaction $transaction): bool => $this->transactionCountsAsPaid($transaction))
                ->sum(fn (CustomerTransaction $transaction): float => abs((float) $transaction->amount));
        }

        return (float) $this->customerTransactions()
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
            })
            ->sum(DB::raw('ABS(amount)'));
    }

    public function calculateBalance(): float
    {
        return max(0.0, round($this->calculateTotalCost() - $this->calculatePaidAmount(), 2));
    }

    public function isOnlineBooking(): bool
    {
        if ($this->relationLoaded('reservations')) {
            return $this->reservations->isNotEmpty();
        }

        return $this->reservations()->exists();
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(ServiceCatalog::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function mechanic(): BelongsTo
    {
        return $this->belongsTo(Mechanic::class, 'assigned_mechanic_id');
    }

    public function bay(): BelongsTo
    {
        return $this->belongsTo(Bay::class);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(JobOrderItem::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function customerTransactions(): HasMany
    {
        return $this->hasMany(CustomerTransaction::class);
    }

    private function transactionCountsAsPaid(CustomerTransaction $transaction): bool
    {
        $type = $transaction->type?->value ?? (string) $transaction->type;

        if (in_array($type, [CustomerTransactionType::Invoice->value, CustomerTransactionType::ReservationFee->value], true)) {
            return strtoupper((string) $transaction->xendit_status) === 'PAID';
        }

        if ($type === CustomerTransactionType::Payment->value) {
            $status = strtoupper((string) $transaction->xendit_status);

            return $status === '' || $status === 'PAID' || $transaction->paid_at !== null;
        }

        return false;
    }

    public function scopeByStatus($query, JobOrderStatus $status)
    {
        return $query->where('status', $status);
    }
}
