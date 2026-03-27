<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Alert;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form request for bulk acknowledging alerts.
 */
class BulkAcknowledgeRequest extends FormRequest
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
            'alert_ids' => ['required', 'array', 'min:1'],
            'alert_ids.*' => ['required', 'integer'],
            'notes' => ['nullable', 'string', 'max:500'],
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
            'alert_ids.required' => 'At least one alert ID is required.',
            'alert_ids.min' => 'At least one alert ID is required.',
            'alert_ids.*.exists' => 'One or more specified alerts do not exist.',
        ];
    }
}
