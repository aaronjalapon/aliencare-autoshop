<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone_number' => $this->faker->phoneNumber(),
            'license_number' => $this->faker->optional(0.7)->bothify('??-####-#######'),
            'account_status' => 'approved',
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'account_status' => 'pending',
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'account_status' => 'rejected',
        ]);
    }
}
