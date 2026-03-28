<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'jo_number' => $this->jo_number,
            'status' => $this->status,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'service_fee' => (float) $this->service_fee,
            'total_cost' => $this->when(
                $this->relationLoaded('items'),
                fn () => $this->calculateTotalCost()
            ),
            'settled_flag' => $this->settled_flag,
            'invoice_id' => $this->invoice_id,
            'approved_at' => $this->approved_at?->toISOString(),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Relationships
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'vehicle' => new VehicleResource($this->whenLoaded('vehicle')),
            'mechanic' => $this->when($this->relationLoaded('mechanic') && $this->mechanic, function () {
                return [
                    'id' => $this->mechanic->id,
                    'name' => $this->mechanic->user?->name,
                    'specialization' => $this->mechanic->specialization,
                    'availability_status' => $this->mechanic->availability_status,
                ];
            }),
            'bay' => $this->when($this->relationLoaded('bay') && $this->bay, function () {
                return [
                    'id' => $this->bay->id,
                    'name' => $this->bay->name,
                    'status' => $this->bay->status,
                ];
            }),
            'approved_by' => $this->when($this->relationLoaded('approvedByUser') && $this->approvedByUser, function () {
                return [
                    'id' => $this->approvedByUser->id,
                    'name' => $this->approvedByUser->name,
                ];
            }),
            'items' => JobOrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
