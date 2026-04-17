<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventory extends Model
{
    use HasFactory;

    protected $table = 'inventories';

    protected $primaryKey = 'item_id'; // Using item_id as primary key

    protected $fillable = [
        'sku',
        'item_name',
        'description',
        'category',
        'stock',
        'reorder_level',
        'unit_price',
        'supplier',
        'location',
        'status',
    ];

    protected $casts = [
        'sku' => 'string',
        'unit_price' => 'decimal:2',
        'stock' => 'integer',
        'reorder_level' => 'integer',
    ];

    /**
     * Get the reservations for this inventory item.
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'item_id', 'item_id');
    }

    /**
     * Get the stock transactions for this inventory item.
     */
    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class, 'item_id', 'item_id');
    }

    /**
     * Get the archive entries for this inventory item.
     */
    public function archives(): HasMany
    {
        return $this->hasMany(Archive::class, 'entity_id', 'id')
            ->where('entity_type', 'inventory');
    }

    /**
     * Check if stock is below reorder level.
     */
    public function isLowStock(): bool
    {
        return $this->stock <= $this->reorder_level;
    }

    /**
     * Get stock status for a given quantity request.
     */
    public function getStockStatus(int $requestedQuantity): string
    {
        if ($this->stock >= $requestedQuantity) {
            return 'Available';
        } elseif ($this->stock > 0) {
            return 'Partial';
        } else {
            return 'Backorder';
        }
    }

    /**
     * Get available stock (stock is already deducted for approved reservations).
     * Now we only need to consider pending reservations as "potentially reserved".
     */
    public function getAvailableStockAttribute(): int
    {
        // Since approved reservations now deduct stock immediately,
        // we only need to consider pending reservations as potentially unavailable
        $pendingReservations = $this->reservations()
            ->where('status', 'pending')
            ->sum('quantity');

        return max(0, $this->stock - $pendingReservations);
    }

    /**
     * Get available stock for a specific reservation action.
     * This excludes the current reservation from the calculation to avoid double-counting.
     */
    public function getAvailableStockForReservation(?int $excludeReservationId = null): int
    {
        $query = $this->reservations()->where('status', 'pending');

        if ($excludeReservationId) {
            $query->where('id', '!=', $excludeReservationId);
        }

        $pendingReservations = $query->sum('quantity');

        return max(0, $this->stock - $pendingReservations);
    }

    /**
     * Scope for low stock items.
     */
    public function scopeLowStock($query)
    {
        return $query->whereRaw('stock <= reorder_level');
    }

    /**
     * Scope for active items.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
