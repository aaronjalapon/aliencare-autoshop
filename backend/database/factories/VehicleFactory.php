<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vehicle>
 */
class VehicleFactory extends Factory
{
    protected $model = Vehicle::class;

    public function definition(): array
    {
        $makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Mitsubishi', 'Nissan', 'Hyundai', 'Kia', 'Suzuki', 'Isuzu'];
        $models = ['Vios', 'Civic', 'Ranger', 'Trailblazer', 'Montero Sport', 'Navara', 'Accent', 'Seltos', 'Ertiga', 'D-Max'];
        $colors = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Gray', 'Brown', 'Green'];

        return [
            'customer_id' => Customer::factory(),
            'plate_number' => strtoupper($this->faker->unique()->bothify('??? ####')),
            'make' => $this->faker->randomElement($makes),
            'model' => $this->faker->randomElement($models),
            'year' => $this->faker->numberBetween(2010, (int) date('Y')),
            'color' => $this->faker->randomElement($colors),
        ];
    }
}
