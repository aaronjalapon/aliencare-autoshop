<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\JobOrder;

use Illuminate\Foundation\Http\FormRequest;

class UpdateJobOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:2000'],
            'service_fee' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
