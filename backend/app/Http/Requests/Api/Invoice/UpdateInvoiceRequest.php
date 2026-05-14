<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Invoice;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:500'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'reference_number' => ['nullable', 'string', 'max:100'],
        ];
    }
}
