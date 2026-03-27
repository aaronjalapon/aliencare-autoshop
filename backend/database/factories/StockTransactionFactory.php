<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Inventory;
use App\Models\StockTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StockTransaction>
 */
class StockTransactionFactory extends Factory
{
    protected $model = StockTransaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $transactionTypes = ['procurement', 'sale', 'reservation', 'return', 'damage', 'adjustment'];
        $transactionType = $this->faker->randomElement($transactionTypes);

        // Determine quantity based on transaction type
        $quantity = match ($transactionType) {
            'procurement', 'return' => $this->faker->numberBetween(5, 50),
            'sale', 'reservation', 'damage' => -$this->faker->numberBetween(1, 20),
            'adjustment' => $this->faker->numberBetween(-10, 10),
            default => $this->faker->numberBetween(1, 20)
        };

        $previousStock = $this->faker->numberBetween(0, 100);
        $newStock = max(0, $previousStock + $quantity);

        return [
            'item_id' => Inventory::factory(),
            'transaction_type' => $transactionType,
            'quantity' => $quantity,
            'previous_stock' => $previousStock,
            'new_stock' => $newStock,
            'reference_number' => $this->generateReferenceNumber($transactionType),
            'notes' => $this->faker->optional(0.7)->sentence(),
            'created_by' => $this->faker->name(),
        ];
    }

    /**
     * Generate reference number based on transaction type.
     */
    private function generateReferenceNumber(string $transactionType): string
    {
        return match ($transactionType) {
            'procurement' => 'PO-'.$this->faker->date('Y').'-'.$this->faker->numberBetween(1000, 9999),
            'sale' => 'POS-'.$this->faker->date('Ymd').'-'.$this->faker->numberBetween(100, 999),
            'reservation' => 'JO-'.$this->faker->date('Y').'-'.$this->faker->numberBetween(1000, 9999),
            'return' => 'RET-'.$this->faker->date('Ymd').'-'.$this->faker->numberBetween(100, 999),
            'damage' => 'DMG-'.$this->faker->date('Ymd').'-'.$this->faker->numberBetween(100, 999),
            'adjustment' => 'ADJ-'.$this->faker->date('Ymd').'-'.$this->faker->numberBetween(100, 999),
            default => 'TXN-'.$this->faker->date('Ymd').'-'.$this->faker->numberBetween(100, 999),
        };
    }

    /**
     * Indicate that this is a procurement transaction.
     */
    public function procurement(): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => 'procurement',
            'quantity' => $this->faker->numberBetween(10, 100),
            'reference_number' => 'PO-'.$this->faker->date('Y').'-'.$this->faker->numberBetween(1000, 9999),
        ]);
    }

    /**
     * Indicate that this is a sale transaction.
     */
    public function sale(): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => 'sale',
            'quantity' => -$this->faker->numberBetween(1, 10),
            'reference_number' => 'POS-'.$this->faker->date('Ymd').'-'.$this->faker->numberBetween(100, 999),
        ]);
    }
}
