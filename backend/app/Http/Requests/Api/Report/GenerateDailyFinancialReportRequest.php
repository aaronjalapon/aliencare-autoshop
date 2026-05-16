<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Report;

use Illuminate\Foundation\Http\FormRequest;

class GenerateDailyFinancialReportRequest extends FormRequest
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
            'date' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date.date' => 'Please provide a valid date.',
            'date.before_or_equal' => 'Report date cannot be in the future.',
        ];
    }
}
