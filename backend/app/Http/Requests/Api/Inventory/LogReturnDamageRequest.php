<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Inventory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for logging return/damage transactions.
 */
class LogReturnDamageRequest extends FormRequest
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
            'item_id' => ['required'],
            'quantity' => ['required', 'integer', 'min:1'],
            'transaction_type' => ['required', 'string', 'in:return,damage'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'condition' => ['nullable', 'string', 'in:good,damaged,defective'],
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
            'type.required' => 'Transaction type is required.',
            'type.in' => 'Transaction type must be either return or damage.',
            'notes.required' => 'Notes explaining the return/damage are required.',
            'condition.in' => 'Condition must be one of: good, damaged, defective.',
        ];
    }
}
