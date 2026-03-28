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
            'service_fee.min' => 'Service fee cannot be negative.',
        ];
    }
}
