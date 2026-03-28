<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Mechanic;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Mechanic>
 */
class MechanicFactory extends Factory
{
    protected $model = Mechanic::class;

    public function definition(): array
    {
        $specializations = ['Engine', 'Transmission', 'Electrical', 'Brakes', 'Suspension', 'General', 'Body Work', 'Air Conditioning'];

        return [
            'user_id' => User::factory(),
            'specialization' => $this->faker->randomElement($specializations),
            'availability_status' => 'available',
        ];
    }

    public function busy(): static
    {
        return $this->state(fn (array $attributes) => [
            'availability_status' => 'busy',
        ]);
    }

    public function onLeave(): static
    {
        return $this->state(fn (array $attributes) => [
            'availability_status' => 'on_leave',
        ]);
    }
}
