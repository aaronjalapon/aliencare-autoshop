<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Report;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for generating daily usage report.
 */
class GenerateDailyReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date.required' => 'Report date is required.',
            'date.date' => 'Invalid date format.',
            'date.before_or_equal' => 'Report date cannot be in the future.',
        ];
    }
}
