<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Customer;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class CompleteOnboardingRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $vehicles = $this->input('vehicles');

        if (is_array($vehicles)) {
            $vehicles = array_map(function (mixed $vehicle): mixed {
                if (! is_array($vehicle)) {
                    return $vehicle;
                }

                foreach (['plate_number', 'make', 'model'] as $requiredField) {
                    if (array_key_exists($requiredField, $vehicle) && is_string($vehicle[$requiredField])) {
                        $vehicle[$requiredField] = trim($vehicle[$requiredField]);
                    }
                }

                foreach (['color', 'vin'] as $optionalField) {
                    if (array_key_exists($optionalField, $vehicle)) {
                        $vehicle[$optionalField] = $this->nullableString($vehicle[$optionalField]);
                    }
                }

                return $vehicle;
            }, $vehicles);
        }

        $this->merge([
            'address' => $this->nullableString($this->input('address')),
            'license_number' => $this->nullableString($this->input('license_number')),
            'special_notes' => $this->nullableString($this->input('special_notes')),
            'vehicles' => $vehicles,
        ]);
    }

    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $role = $user->role;

        return $role === UserRole::Customer || $role === UserRole::Customer->value;
    }

    public function rules(): array
    {
        $currentYear = (int) date('Y');

        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'phone_number' => ['required', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
            'license_number' => ['nullable', 'string', 'max:50'],
            'preferred_contact_method' => ['required', 'string', 'in:sms,call,email'],
            'special_notes' => ['nullable', 'string', 'max:2000'],
            'vehicles' => ['required', 'array', 'min:1'],
            'vehicles.*.plate_number' => ['required', 'string', 'max:20', 'distinct'],
            'vehicles.*.make' => ['required', 'string', 'max:100'],
            'vehicles.*.model' => ['required', 'string', 'max:100'],
            'vehicles.*.year' => ['required', 'integer', 'min:1900', 'max:'.($currentYear + 1)],
            'vehicles.*.color' => ['nullable', 'string', 'max:50'],
            'vehicles.*.vin' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicles.required' => 'Please add at least one vehicle to complete onboarding.',
            'vehicles.min' => 'Please add at least one vehicle to complete onboarding.',
            'preferred_contact_method.in' => 'Preferred contact must be one of: sms, call, or email.',
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
