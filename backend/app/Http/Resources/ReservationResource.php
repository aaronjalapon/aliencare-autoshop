<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Reservation model.
 *
 * @mixin \App\Models\Reservation
 */
class ReservationResource extends JsonResource
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
            'job_order_number' => $this->job_order_number,
            'quantity' => $this->quantity,
            'status' => $this->status,
            'priority_level' => $this->priority_level,
            'is_urgent' => $this->is_urgent,
            'notes' => $this->notes,
            'requested_by' => $this->requested_by,
            'approved_by' => $this->approved_by,
            'requested_date' => $this->requested_date?->toISOString(),
            'approved_date' => $this->approved_date?->toISOString(),
            'expires_at' => $this->expires_at?->toISOString(),
            'estimated_completion' => $this->estimated_completion?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Computed values
            'is_expired' => $this->when(
                $this->expires_at !== null,
                fn () => $this->expires_at->isPast()
            ),
            'total_value' => $this->when(
                $this->relationLoaded('inventory'),
                fn () => (float) ($this->quantity * $this->inventory->unit_price)
            ),

            // Conditional relationships
            'inventory' => new InventoryResource($this->whenLoaded('inventory')),
        ];
    }
}
