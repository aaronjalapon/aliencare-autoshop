<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransaction extends Model
{
    use HasFactory;

    // Using default 'id' primary key (auto-incrementing)

    protected $fillable = [
        'item_id',
        'transaction_type',
        'quantity',
        'previous_stock',
        'new_stock',
        'reference_number',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'previous_stock' => 'integer',
        'new_stock' => 'integer',
    ];

    /**
     * Get the inventory item for this transaction.
     */
    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'item_id', 'item_id');
    }

    /**
     * Scope for procurement transactions.
     */
    public function scopeProcurement($query)
    {
        return $query->where('transaction_type', 'procurement');
    }

    /**
     * Scope for sales transactions.
     */
    public function scopeSales($query)
    {
        return $query->where('transaction_type', 'sale');
    }

    /**
     * Scope for transactions within date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Get the transaction impact (positive or negative).
     */
    public function getImpactAttribute(): string
    {
        return in_array($this->transaction_type, ['procurement', 'return']) ? 'positive' : 'negative';
    }
}
