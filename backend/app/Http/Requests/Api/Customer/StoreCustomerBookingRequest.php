<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'service_id' => ['required', 'integer', 'exists:service_catalogs,id'],
            'arrival_date' => ['required', 'date', 'date_format:Y-m-d', 'after_or_equal:today'],
            'arrival_time' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_id.required' => 'Please select a vehicle.',
            'vehicle_id.exists' => 'Selected vehicle does not exist.',
            'service_id.required' => 'Please select a service.',
            'service_id.exists' => 'Selected service does not exist.',
            'arrival_date.required' => 'Please select an arrival date.',
            'arrival_date.after_or_equal' => 'Arrival date cannot be in the past.',
            'arrival_time.required' => 'Please select an arrival time.',
            'arrival_time.date_format' => 'Invalid time format. Expected HH:MM.',
        ];
    }
}
