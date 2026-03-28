<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\JobOrder;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobOrder>
 */
class JobOrderFactory extends Factory
{
    protected $model = JobOrder::class;

    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'vehicle_id' => Vehicle::factory(),
            'status' => 'created',
            'service_fee' => $this->faker->randomFloat(2, 500, 5000),
            'notes' => $this->faker->optional(0.6)->sentence(),
        ];
    }

    public function pendingApproval(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending_approval',
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'approved_at' => now()->subHour(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'approved_at' => now()->subHours(3),
        ]);
    }

    public function settled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'settled',
            'settled_flag' => true,
            'invoice_id' => 'INV-'.$this->faker->unique()->numberBetween(1000, 9999),
            'approved_at' => now()->subDay(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }
}
