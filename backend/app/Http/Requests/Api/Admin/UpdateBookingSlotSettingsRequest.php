<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Admin;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingSlotSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Admin;
    }

    public function rules(): array
    {
        return [
            'slots' => ['required', 'array', 'min:1'],
            'slots.*.time' => ['required', 'date_format:H:i', 'distinct:strict'],
            'slots.*.capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'slots.*.is_active' => ['sometimes', 'boolean'],
            'slots.*.sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ];
    }
}
