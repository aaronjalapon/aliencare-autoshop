<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Foundation\Http\FormRequest;

class VerifyBookingOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'job_order_id' => ['required', 'integer', 'exists:job_orders,id'],
            'code' => ['required', 'string', 'size:6'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'job_order_id.required' => 'Job order ID is required.',
            'job_order_id.exists' => 'Job order not found.',
            'code.required' => 'Verification code is required.',
            'code.size' => 'Verification code must be 6 digits.',
        ];
    }
}
