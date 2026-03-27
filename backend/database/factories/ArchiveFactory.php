<?php

namespace Database\Factories;

use App\Models\Archive;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Archive>
 */
class ArchiveFactory extends Factory
{
    protected $model = Archive::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'entity_type' => fake()->randomElement(['inventory', 'reservation', 'transaction']),
            'entity_id' => fake()->numberBetween(1, 100),
            'action' => fake()->randomElement(['created', 'updated', 'deleted']),
            'old_data' => json_encode(['stock' => fake()->numberBetween(0, 50)]),
            'new_data' => json_encode(['stock' => fake()->numberBetween(0, 100)]),
            'user_id' => null,
            'reference_number' => 'REF-' . fake()->unique()->numberBetween(1000, 9999),
            'notes' => fake()->optional()->sentence(),
            'archived_date' => fake()->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
