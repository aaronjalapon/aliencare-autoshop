<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Reservation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for canceling a reservation.
 */
class CancelReservationRequest extends FormRequest
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
            'reason' => ['required', 'string', 'max:500'],
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
            'reason.required' => 'Cancellation reason is required.',
            'reason.max' => 'Reason cannot exceed 500 characters.',
        ];
    }
}
