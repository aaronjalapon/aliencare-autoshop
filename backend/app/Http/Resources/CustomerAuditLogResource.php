<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerAuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'action' => $this->action,
            'entity_type' => $this->entity_type,
            'old_data' => $this->old_data,
            'new_data' => $this->new_data,
            'user' => $this->when($this->relationLoaded('user') && $this->user, [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
            ]),
            'ip_address' => $this->ip_address,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
