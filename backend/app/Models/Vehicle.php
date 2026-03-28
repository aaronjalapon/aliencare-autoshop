<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VehicleApprovalStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'plate_number',
        'make',
        'model',
        'year',
        'color',
        'approval_status',
        'approved_by',
        'approved_at',
        'vin',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'approval_status' => VehicleApprovalStatus::class,
            'approved_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function jobOrders(): HasMany
    {
        return $this->hasMany(JobOrder::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeApproved($query)
    {
        return $query->where('approval_status', VehicleApprovalStatus::Approved);
    }

    public function scopePending($query)
    {
        return $query->where('approval_status', VehicleApprovalStatus::Pending);
    }
}
