<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\JobOrder;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'arrival_date' => ['required', 'date', 'date_format:Y-m-d', 'after_or_equal:today'],
            'arrival_time' => ['required', 'date_format:H:i'],
            'source' => ['prohibited'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'service_fee' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => 'Customer is required.',
            'customer_id.exists' => 'Selected customer does not exist.',
            'vehicle_id.required' => 'Vehicle is required.',
            'vehicle_id.exists' => 'Selected vehicle does not exist.',
            'arrival_date.required' => 'Service date is required.',
            'arrival_date.date_format' => 'Service date must be in Y-m-d format.',
            'arrival_time.required' => 'Service time is required.',
            'arrival_time.date_format' => 'Service time must be in H:i format.',
            'source.prohibited' => 'Source is managed by the system.',
            'service_fee.min' => 'Service fee cannot be negative.',
        ];
    }
}
