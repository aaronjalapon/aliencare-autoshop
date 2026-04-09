<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\ServiceCatalog;

use Illuminate\Foundation\Http\FormRequest;

class ServiceCatalogIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category' => ['sometimes', 'string', 'in:maintenance,cleaning,repair'],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
