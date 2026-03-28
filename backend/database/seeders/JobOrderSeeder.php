<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Bay;
use App\Models\Customer;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class JobOrderSeeder extends Seeder
{
    public function run(): void
    {
        // Create bays
        $bays = collect([
            Bay::factory()->create(['name' => 'Bay 1']),
            Bay::factory()->create(['name' => 'Bay 2']),
            Bay::factory()->create(['name' => 'Bay 3']),
            Bay::factory()->maintenance()->create(['name' => 'Bay 4']),
        ]);

        // Create mechanics with user accounts
        $mechanics = collect([
            Mechanic::factory()->create(['user_id' => User::factory()->create(['name' => 'Juan Dela Cruz', 'email' => 'juan@example.com'])->id, 'specialization' => 'Engine']),
            Mechanic::factory()->create(['user_id' => User::factory()->create(['name' => 'Pedro Santos', 'email' => 'pedro@example.com'])->id, 'specialization' => 'Transmission']),
            Mechanic::factory()->create(['user_id' => User::factory()->create(['name' => 'Maria Garcia', 'email' => 'maria@example.com'])->id, 'specialization' => 'Electrical']),
        ]);

        // Create customers with vehicles
        $customers = Customer::factory(5)->create()->each(function (Customer $customer) {
            Vehicle::factory(rand(1, 3))->create(['customer_id' => $customer->id]);
        });

        // Create job orders in various statuses
        $approver = User::first();

        // Created JOs
        JobOrder::factory(2)->create([
            'customer_id' => $customers->random()->id,
            'vehicle_id' => fn () => Vehicle::inRandomOrder()->first()->id,
        ])->each(fn (JobOrder $jo) => JobOrderItem::factory(rand(1, 3))->create(['job_order_id' => $jo->id]));

        // Approved JOs
        JobOrder::factory(2)->approved()->create([
            'customer_id' => $customers->random()->id,
            'vehicle_id' => fn () => Vehicle::inRandomOrder()->first()->id,
            'approved_by' => $approver->id,
        ])->each(fn (JobOrder $jo) => JobOrderItem::factory(rand(1, 3))->create(['job_order_id' => $jo->id]));

        // In Progress JO
        $inProgressJo = JobOrder::factory()->inProgress()->create([
            'customer_id' => $customers->random()->id,
            'vehicle_id' => fn () => Vehicle::inRandomOrder()->first()->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics[0]->id,
            'bay_id' => $bays[0]->id,
        ]);
        $bays[0]->update(['status' => 'occupied']);
        $mechanics[0]->update(['availability_status' => 'busy']);
        JobOrderItem::factory(3)->create(['job_order_id' => $inProgressJo->id]);

        // Completed JOs
        JobOrder::factory(2)->completed()->create([
            'customer_id' => $customers->random()->id,
            'vehicle_id' => fn () => Vehicle::inRandomOrder()->first()->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics[1]->id,
        ])->each(fn (JobOrder $jo) => JobOrderItem::factory(rand(2, 4))->create(['job_order_id' => $jo->id]));

        // Settled JOs
        JobOrder::factory(3)->settled()->create([
            'customer_id' => $customers->random()->id,
            'vehicle_id' => fn () => Vehicle::inRandomOrder()->first()->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics[2]->id,
        ])->each(fn (JobOrder $jo) => JobOrderItem::factory(rand(2, 4))->create(['job_order_id' => $jo->id]));

        // Cancelled JO
        JobOrder::factory()->cancelled()->create([
            'customer_id' => $customers->random()->id,
            'vehicle_id' => fn () => Vehicle::inRandomOrder()->first()->id,
        ]);
    }
}
