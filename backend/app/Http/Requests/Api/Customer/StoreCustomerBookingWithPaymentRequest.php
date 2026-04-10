<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Validation\Rule;

class StoreCustomerBookingWithPaymentRequest extends StoreCustomerBookingRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'payment_method' => ['required', 'string', Rule::in(['gcash', 'maya', 'card', 'bank'])],
        ]);
    }

    public function messages(): array
    {
        return array_merge(parent::messages(), [
            'payment_method.required' => 'Please select a payment method.',
            'payment_method.in' => 'Selected payment method is invalid.',
        ]);
    }
}
