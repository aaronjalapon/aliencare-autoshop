<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\JobOrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'jo_number',
        'customer_id',
        'vehicle_id',
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

    public function scopeByStatus($query, JobOrderStatus $status)
    {
        return $query->where('status', $status);
    }
}
