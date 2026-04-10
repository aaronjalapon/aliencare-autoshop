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
        'reservation_id',
        'type',
        'amount',
        'reference_number',
        'notes',
        'external_id',
        'xendit_invoice_id',
        'payment_url',
        'payment_method',
        'xendit_status',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => CustomerTransactionType::class,
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
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

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }
}
