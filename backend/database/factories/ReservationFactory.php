<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Inventory;
use App\Models\Reservation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Reservation>
 */
class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $statuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
        $requestedDate = $this->faker->dateTimeBetween('-30 days', 'now');

        return [
            'item_id' => Inventory::factory(),
            'quantity' => $this->faker->numberBetween(1, 10),
            'status' => $this->faker->randomElement($statuses),
            'job_order_number' => 'JO-'.$this->faker->date('Y').'-'.$this->faker->unique()->numberBetween(1000, 9999),
            'requested_by' => $this->faker->name(),
            'approved_by' => $this->faker->optional(0.7)->name(),
            'requested_date' => $requestedDate,
            'approved_date' => $this->faker->optional(0.7)->dateTimeBetween($requestedDate, 'now'),
            'expires_at' => $this->faker->dateTimeBetween('now', '+30 days'),
            'notes' => $this->faker->optional(0.6)->sentence(),
        ];
    }

    /**
     * Indicate that the reservation is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'approved_by' => null,
            'approved_date' => null,
        ]);
    }

    /**
     * Indicate that the reservation is approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_by' => $this->faker->name(),
            'approved_date' => $this->faker->dateTimeBetween($attributes['requested_date'], 'now'),
        ]);
    }

    /**
     * Indicate that the reservation is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'approved_by' => $this->faker->name(),
            'approved_date' => $this->faker->dateTimeBetween($attributes['requested_date'], 'now'),
        ]);
    }
}
