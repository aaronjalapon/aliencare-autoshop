<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CustomerTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerTransaction extends Model
{
    protected $fillable = [
        'customer_id',
        'job_order_id',
        'type',
        'amount',
        'reference_number',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'type' => CustomerTransactionType::class,
            'amount' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }
}
