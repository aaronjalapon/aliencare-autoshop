<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Alert model.
 *
 * @mixin \App\Models\Alert
 */
class AlertResource extends JsonResource
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
            'item_name' => $this->item_name,
            'current_stock' => $this->current_stock,
            'reorder_level' => $this->reorder_level,
            'category' => $this->category,
            'supplier' => $this->supplier,
            'alert_type' => $this->alert_type,
            'urgency' => $this->urgency,
            'message' => $this->message,
            'acknowledged' => $this->acknowledged,
            'acknowledged_by' => $this->acknowledged_by,
            'acknowledged_at' => $this->acknowledged_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Conditional relationships
            'inventory' => new InventoryResource($this->whenLoaded('inventory')),
        ];
    }
}
