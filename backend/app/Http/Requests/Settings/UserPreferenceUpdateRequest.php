<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UserPreferenceUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return request()->user() !== null;
    }

    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array'],
            'preferences.*' => ['required'],
        ];
    }
}
