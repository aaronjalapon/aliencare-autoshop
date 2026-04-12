<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSpecialInfoRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $payload = [];

        if ($this->has('preferred_contact_method')) {
            $value = $this->input('preferred_contact_method');
            $payload['preferred_contact_method'] = is_string($value)
                ? strtolower(trim($value))
                : $value;
        }

        if ($this->has('special_notes')) {
            $payload['special_notes'] = $this->nullableString($this->input('special_notes'));
        }

        if ($payload !== []) {
            $this->merge($payload);
        }
    }

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'preferred_contact_method' => ['sometimes', 'required', 'string', 'in:sms,call,email'],
            'special_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    private function nullableString(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
