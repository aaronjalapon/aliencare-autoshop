<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\ServiceCatalog;

use App\Enums\ServiceCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreServiceCatalogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'price_label' => ['required', 'string', 'max:255'],
            'price_fixed' => ['required', 'numeric', 'min:0'],
            'duration' => ['required', 'string', 'max:255'],
            'estimated_duration' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::enum(ServiceCategory::class)],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'includes' => ['nullable', 'array'],
            'includes.*' => ['string', 'max:255'],
            'rating' => ['sometimes', 'numeric', 'min:0', 'max:5'],
            'rating_count' => ['sometimes', 'integer', 'min:0'],
            'queue_label' => ['nullable', 'string', 'max:255'],
            'recommended' => ['sometimes', 'boolean'],
            'recommended_note' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
