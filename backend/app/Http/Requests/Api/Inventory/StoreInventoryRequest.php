<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Inventory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for creating a new inventory item.
 */
class StoreInventoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sku' => ['nullable', 'string', 'max:100', 'unique:inventories,sku'],
            'item_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['required', 'string', 'max:100'],
            'stock' => ['required', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
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
            'item_name.required' => 'Item name is required.',
            'item_name.max' => 'Item name cannot exceed 255 characters.',
            'category.required' => 'Category is required.',
            'stock.required' => 'Initial stock quantity is required.',
            'stock.min' => 'Stock quantity cannot be negative.',
            'reorder_level.required' => 'Reorder level is required.',
            'reorder_level.min' => 'Reorder level must be at least 1.',
            'unit_price.required' => 'Unit price is required.',
            'unit_price.min' => 'Unit price cannot be negative.',
            'status.in' => 'Status must be one of: active, inactive, discontinued.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'sku' => 'SKU',
            'item_name' => 'item name',
            'reorder_level' => 'reorder level',
            'unit_price' => 'unit price',
        ];
    }
}
