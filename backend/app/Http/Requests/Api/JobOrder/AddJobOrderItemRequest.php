<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\JobOrder;

use Illuminate\Foundation\Http\FormRequest;

class AddJobOrderItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'item_type' => ['required', 'string', 'in:part,service'],
            'item_id' => ['nullable', 'required_if:item_type,part', 'integer'],
            'description' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'item_type.required' => 'Item type is required.',
            'item_type.in' => 'Item type must be either "part" or "service".',
            'item_id.required_if' => 'Inventory item ID is required for parts.',
            'description.required' => 'Description is required.',
            'quantity.required' => 'Quantity is required.',
            'quantity.min' => 'Quantity must be at least 1.',
            'unit_price.required' => 'Unit price is required.',
            'unit_price.min' => 'Unit price cannot be negative.',
        ];
    }
}
