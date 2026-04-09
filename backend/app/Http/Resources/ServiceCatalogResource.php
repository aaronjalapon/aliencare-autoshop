<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ServiceCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceCatalog
 */
class ServiceCatalogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'price_label' => $this->price_label,
            'price_fixed' => (float) $this->price_fixed,
            'duration' => $this->duration,
            'estimated_duration' => $this->estimated_duration,
            'category' => $this->category->value,
            'features' => $this->features ?? [],
            'includes' => $this->includes ?? [],
            'rating' => (float) $this->rating,
            'rating_count' => $this->rating_count,
            'queue_label' => $this->queue_label,
            'recommended' => $this->recommended,
            'recommended_note' => $this->recommended_note,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
