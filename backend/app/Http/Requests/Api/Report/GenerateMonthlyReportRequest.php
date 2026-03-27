<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Report;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for generating monthly procurement report.
 */
class GenerateMonthlyReportRequest extends FormRequest
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
            'year' => ['required', 'integer', 'min:2020', 'max:'.(date('Y') + 1)],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
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
            'year.required' => 'Year is required.',
            'year.min' => 'Year must be 2020 or later.',
            'year.max' => 'Year cannot be more than 1 year in the future.',
            'month.required' => 'Month is required.',
            'month.min' => 'Month must be between 1 and 12.',
            'month.max' => 'Month must be between 1 and 12.',
        ];
    }
}
