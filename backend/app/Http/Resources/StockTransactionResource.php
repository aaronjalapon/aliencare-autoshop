<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for StockTransaction model.
 *
 * @mixin \App\Models\StockTransaction
 */
class StockTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'transaction_type' => $this->transaction_type,
            'quantity' => $this->quantity,
            'previous_stock' => $this->previous_stock,
            'new_stock' => $this->new_stock,
            'reference_number' => $this->reference_number,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Computed values
            'is_stock_increase' => $this->quantity > 0,
            'absolute_quantity' => abs($this->quantity),
            'transaction_value' => $this->when(
                $this->relationLoaded('inventory'),
                fn () => (float) (abs($this->quantity) * $this->inventory->unit_price)
            ),

            // Conditional relationships
            'inventory' => new InventoryResource($this->whenLoaded('inventory')),
        ];
    }
}
