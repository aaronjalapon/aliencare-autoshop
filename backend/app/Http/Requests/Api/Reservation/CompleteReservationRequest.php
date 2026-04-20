<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Reservation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for completing a reservation.
 */
class CompleteReservationRequest extends FormRequest
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
            'actual_quantity' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:500'],
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
            'actual_quantity.integer' => 'Actual quantity must be a number.',
            'actual_quantity.min' => 'Actual quantity must be at least 1.',
            'notes.max' => 'Notes cannot exceed 500 characters.',
        ];
    }
}
