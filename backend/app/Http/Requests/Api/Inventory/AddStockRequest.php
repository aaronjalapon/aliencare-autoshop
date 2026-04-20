<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Inventory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for adding stock to inventory.
 */
class AddStockRequest extends FormRequest
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
            'item_id' => ['required'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'supplier' => ['nullable', 'string', 'max:255'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
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
            'item_id.required' => 'Item ID is required.',
            'item_id.exists' => 'The specified item does not exist.',
            'quantity.required' => 'Quantity is required.',
            'quantity.min' => 'Quantity must be at least 1.',
            'unit_cost.min' => 'Unit cost cannot be negative.',
        ];
    }
}
