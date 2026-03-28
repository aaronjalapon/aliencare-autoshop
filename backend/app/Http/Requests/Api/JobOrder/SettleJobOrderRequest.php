<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\JobOrder;

use Illuminate\Foundation\Http\FormRequest;

class SettleJobOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'invoice_id' => ['nullable', 'string', 'max:100'],
        ];
    }
}
