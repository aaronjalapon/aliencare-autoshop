<?php

namespace Database\Factories;

use App\Models\Alert;
use App\Models\Inventory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Alert>
 */
class AlertFactory extends Factory
{
    protected $model = Alert::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $inventory = Inventory::factory()->create();

        return [
            'item_id' => $inventory->item_id,
            'item_name' => $inventory->item_name,
            'current_stock' => $inventory->stock,
            'reorder_level' => $inventory->reorder_level,
            'category' => $inventory->category,
            'supplier' => $inventory->supplier,
            'urgency' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'alert_type' => fake()->randomElement(['low_stock', 'out_of_stock']),
            'message' => fake()->sentence(),
            'acknowledged' => false,
            'acknowledged_by' => null,
            'acknowledged_at' => null,
        ];
    }

    /**
     * Indicate that the alert has been acknowledged.
     */
    public function acknowledged(): static
    {
        return $this->state(fn (array $attributes) => [
            'acknowledged' => true,
            'acknowledged_by' => fake()->name(),
            'acknowledged_at' => now(),
        ]);
    }

    /**
     * Indicate that the alert has not been acknowledged.
     */
    public function unacknowledged(): static
    {
        return $this->state(fn (array $attributes) => [
            'acknowledged' => false,
            'acknowledged_by' => null,
            'acknowledged_at' => null,
        ]);
    }
}
