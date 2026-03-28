<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\JobOrder;

use Illuminate\Foundation\Http\FormRequest;

class StartJobOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'mechanic_id' => ['required', 'integer', 'exists:mechanics,id'],
            'bay_id' => ['required', 'integer', 'exists:bays,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'mechanic_id.required' => 'A mechanic must be assigned.',
            'mechanic_id.exists' => 'Selected mechanic does not exist.',
            'bay_id.required' => 'A service bay must be assigned.',
            'bay_id.exists' => 'Selected bay does not exist.',
        ];
    }
}
