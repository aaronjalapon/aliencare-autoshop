<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Vehicle;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $vehicleId = $this->route('id');
        $currentYear = (int) date('Y');

        return [
            'plate_number' => ['sometimes', 'string', 'max:20', "unique:vehicles,plate_number,{$vehicleId}"],
            'make' => ['sometimes', 'string', 'max:100'],
            'model' => ['sometimes', 'string', 'max:100'],
            'year' => ['sometimes', 'integer', 'min:1900', 'max:'.($currentYear + 1)],
            'color' => ['nullable', 'string', 'max:50'],
            'vin' => ['nullable', 'string', 'max:50'],
        ];
    }
}
