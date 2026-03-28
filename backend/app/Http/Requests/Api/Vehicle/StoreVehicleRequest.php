<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Vehicle;

use Illuminate\Foundation\Http\FormRequest;

class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'plate_number' => ['required', 'string', 'max:20', 'unique:vehicles,plate_number'],
            'make' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'year' => ['required', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
            'color' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => 'Customer is required.',
            'customer_id.exists' => 'Selected customer does not exist.',
            'plate_number.required' => 'Plate number is required.',
            'plate_number.unique' => 'This plate number is already registered.',
            'make.required' => 'Vehicle make is required.',
            'model.required' => 'Vehicle model is required.',
            'year.required' => 'Vehicle year is required.',
        ];
    }
}
