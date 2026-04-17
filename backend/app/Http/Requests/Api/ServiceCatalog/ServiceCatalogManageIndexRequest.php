<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\ServiceCatalog;

use Illuminate\Foundation\Http\FormRequest;

class ServiceCatalogManageIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'category' => ['sometimes', 'string', 'in:maintenance,cleaning,repair'],
            'search' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
