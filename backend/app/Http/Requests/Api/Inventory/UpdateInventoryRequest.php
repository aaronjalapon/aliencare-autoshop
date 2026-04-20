<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Form request for updating an inventory item.
 */
class UpdateInventoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('manage-inventory') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sku' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('inventories', 'sku')->ignore($this->route('id'), 'item_id')],
            'item_name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'required', 'integer', 'min:1'],
            'unit_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'supplier' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,inactive,discontinued'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'sku.max' => 'SKU cannot exceed 100 characters.',
            'sku.unique' => 'SKU is already in use.',
            'item_name.max' => 'Item name cannot exceed 255 characters.',
            'stock.min' => 'Stock quantity cannot be negative.',
            'reorder_level.min' => 'Reorder level must be at least 1.',
            'unit_price.min' => 'Unit price cannot be negative.',
            'status.in' => 'Status must be one of: active, inactive, discontinued.',
        ];
    }
}
