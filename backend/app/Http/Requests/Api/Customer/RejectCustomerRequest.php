<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Foundation\Http\FormRequest;

class RejectCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'A rejection reason is required.',
        ];
    }
}
