<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Inventory model.
 *
 * @mixin Inventory
 */
class InventoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->item_id,
            'item_id' => $this->item_id,
            'sku' => $this->sku,
            'item_name' => $this->item_name,
            'description' => $this->description,
            'category' => $this->category,
            'stock' => $this->stock,
            'available_stock' => $this->available_stock,
            'reserved_stock' => $this->stock - $this->available_stock,
            'reorder_level' => $this->reorder_level,
            'unit_price' => (float) $this->unit_price,
            'supplier' => $this->supplier,
            'location' => $this->location,
            'status' => $this->status,
            'is_low_stock' => $this->isLowStock(),
            'stock_status' => $this->when(
                $request->has('requested_quantity'),
                fn () => $this->getStockStatus($request->integer('requested_quantity', 1))
            ),
            'total_value' => (float) ($this->stock * $this->unit_price),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Conditional relationships
            'reservations' => ReservationResource::collection($this->whenLoaded('reservations')),
            'stock_transactions' => StockTransactionResource::collection($this->whenLoaded('stockTransactions')),
        ];
    }
}
