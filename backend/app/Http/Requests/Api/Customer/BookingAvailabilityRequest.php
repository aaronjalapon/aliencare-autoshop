<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Foundation\Http\FormRequest;

class BookingAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'arrival_date' => ['required', 'date', 'date_format:Y-m-d', 'after_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'arrival_date.required' => 'Please select an arrival date.',
            'arrival_date.after_or_equal' => 'Arrival date cannot be in the past.',
        ];
    }
}
