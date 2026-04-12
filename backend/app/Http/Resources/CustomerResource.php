<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone_number' => $this->phone_number,
            'address' => $this->address,
            'license_number' => $this->license_number,
            'preferred_contact_method' => $this->preferred_contact_method,
            'special_notes' => $this->special_notes,
            'onboarding_completed_at' => $this->onboarding_completed_at?->toISOString(),
            'account_status' => $this->account_status,
            'approved_by' => $this->when($this->relationLoaded('approvedBy') && $this->approvedBy, [
                'id' => $this->approvedBy?->id,
                'name' => $this->approvedBy?->name,
            ]),
            'approved_at' => $this->approved_at?->toISOString(),
            'rejection_reason' => $this->rejection_reason,
            'vehicles_count' => $this->when($this->vehicles_count !== null, $this->vehicles_count),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            'vehicles' => VehicleResource::collection($this->whenLoaded('vehicles')),
        ];
    }
}
