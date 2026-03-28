<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\JobOrder;
use App\Models\JobOrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobOrderItem>
 */
class JobOrderItemFactory extends Factory
{
    protected $model = JobOrderItem::class;

    public function definition(): array
    {
        $quantity = $this->faker->numberBetween(1, 5);
        $unitPrice = $this->faker->randomFloat(2, 100, 5000);

        return [
            'job_order_id' => JobOrder::factory(),
            'item_type' => $this->faker->randomElement(['part', 'service']),
            'item_id' => null,
            'description' => $this->faker->sentence(3),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total_price' => $quantity * $unitPrice,
        ];
    }

    public function part(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_type' => 'part',
        ]);
    }

    public function service(): static
    {
        $services = ['Oil Change', 'Brake Inspection', 'Wheel Alignment', 'Engine Tune-up', 'AC Repair', 'Battery Check', 'Tire Rotation', 'Transmission Service'];

        return $this->state(fn (array $attributes) => [
            'item_type' => 'service',
            'item_id' => null,
            'description' => $this->faker->randomElement($services),
        ]);
    }
}
