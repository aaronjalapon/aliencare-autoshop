<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $customerId = $this->route('id');

        return [
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', "unique:customers,email,{$customerId}"],
            'phone_number' => ['sometimes', 'string', 'max:20'],
            'license_number' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
        ];
    }
}
