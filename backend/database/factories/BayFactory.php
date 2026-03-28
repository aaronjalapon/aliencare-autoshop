<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Bay;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bay>
 */
class BayFactory extends Factory
{
    protected $model = Bay::class;

    public function definition(): array
    {
        return [
            'name' => 'Bay '.$this->faker->unique()->numberBetween(1, 50),
            'status' => 'available',
        ];
    }

    public function occupied(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'occupied',
        ]);
    }

    public function maintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'maintenance',
        ]);
    }
}
