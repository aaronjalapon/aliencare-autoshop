<?php

namespace Database\Factories;

use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Report>
 */
class ReportFactory extends Factory
{
    protected $model = Report::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'report_type' => fake()->randomElement(['daily_usage', 'monthly_procurement', 'reconciliation']),
            'generated_date' => now(),
            'report_date' => fake()->date('Y-m-d'),
            'data_summary' => json_encode([
                'total_transactions' => fake()->numberBetween(1, 100),
                'summary' => fake()->sentence(),
            ]),
            'generated_by' => fake()->name(),
        ];
    }
}
