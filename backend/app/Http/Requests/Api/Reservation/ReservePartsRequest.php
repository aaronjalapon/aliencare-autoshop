<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Reservation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for reserving parts for a job order.
 */
class ReservePartsRequest extends FormRequest
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
            'job_order_number' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'expires_at' => ['nullable', 'date', 'after:now'],
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
            'job_order_number.required' => 'Job order number is required.',
            'job_order_number.max' => 'Job order number cannot exceed 100 characters.',
            'expires_at.after' => 'Expiration date must be in the future.',
        ];
    }
}
