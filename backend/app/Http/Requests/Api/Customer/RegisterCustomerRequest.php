<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Foundation\Http\FormRequest;

class RegisterCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $currentYear = (int) date('Y');

        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255', 'unique:customers,email'],
            'phone_number' => ['required', 'string', 'max:20'],
            'license_number' => ['nullable', 'string', 'max:50'],
            'vehicles' => ['nullable', 'array'],
            'vehicles.*.plate_number' => ['required_with:vehicles', 'string', 'max:20', 'distinct', 'unique:vehicles,plate_number'],
            'vehicles.*.make' => ['required_with:vehicles', 'string', 'max:100'],
            'vehicles.*.model' => ['required_with:vehicles', 'string', 'max:100'],
            'vehicles.*.year' => ['required_with:vehicles', 'integer', 'min:1900', 'max:'.($currentYear + 1)],
            'vehicles.*.color' => ['nullable', 'string', 'max:50'],
            'vehicles.*.vin' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'First name is required.',
            'last_name.required' => 'Last name is required.',
            'email.unique' => 'This email is already registered.',
            'phone_number.required' => 'Phone number is required.',
            'vehicles.*.plate_number.unique' => 'This plate number is already registered.',
            'vehicles.*.plate_number.distinct' => 'Duplicate plate numbers are not allowed.',
        ];
    }
}
