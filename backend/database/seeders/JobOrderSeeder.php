<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Bay;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\Mechanic;
use App\Models\ServiceCatalog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class JobOrderSeeder extends Seeder
{
    public function run(): void
    {
        // -- Bays (deterministic, safe to re-run) ---------------------------------
        $bays = collect([
            'Bay 1' => ['status' => 'available'],
            'Bay 2' => ['status' => 'available'],
            'Bay 3' => ['status' => 'available'],
            'Bay 4' => ['status' => 'maintenance'],
            'Bay 5' => ['status' => 'available'],
            'Bay 6' => ['status' => 'available'],
        ])->map(fn (array $attributes, string $name): Bay => Bay::updateOrCreate(
            ['name' => $name],
            $attributes,
        ));

        // -- Mechanics (deterministic, safe to re-run) ---------------------------
        $mechanics = collect([
            ['name' => 'Juan Dela Cruz',  'email' => 'juan@example.com',    'specialization' => 'Engine'],
            ['name' => 'Pedro Santos',    'email' => 'pedro@example.com',    'specialization' => 'Transmission'],
            ['name' => 'Maria Garcia',    'email' => 'maria@example.com',    'specialization' => 'Electrical'],
            ['name' => 'Roberto Flores',  'email' => 'roberto@example.com',  'specialization' => 'General'],
            ['name' => 'Ana Reyes',       'email' => 'ana@example.com',      'specialization' => 'AC & Cooling'],
        ])->mapWithKeys(function (array $data): array {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                ['name' => $data['name'], 'password' => 'AlienCare123!'],
            );

            $mechanic = Mechanic::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'specialization' => $data['specialization'],
                    'availability_status' => 'available',
                ],
            );

            return [$data['email'] => $mechanic];
        });

        // -- Customers (12) with 1-3 vehicles each ------------------------------
        $customers = Customer::factory(12)->create()->each(function (Customer $customer): void {
            Vehicle::factory(rand(1, 3))->create(['customer_id' => $customer->id]);
        });

        $approver = User::first();
        $inventoryItems = Inventory::all();
        $services = ServiceCatalog::all();

        $randomVehicleFor = fn (Customer $c): Vehicle => Vehicle::where('customer_id', $c->id)
            ->inRandomOrder()
            ->first();

        // Helper: add 1-N line items to a JO using real inventory / service data
        $addItems = function (JobOrder $jo, int $min = 1, int $max = 4) use ($inventoryItems, $services): void {
            $count = rand($min, $max);

            for ($i = 0; $i < $count; $i++) {
                $usePart = rand(0, 1) === 0 && $inventoryItems->isNotEmpty();

                if ($usePart) {
                    $item = $inventoryItems->random();
                    JobOrderItem::create([
                        'job_order_id' => $jo->id,
                        'item_type' => 'part',
                        'item_id' => $item->item_id,
                        'description' => $item->item_name,
                        'quantity' => rand(1, 3),
                        'unit_price' => $item->unit_price,
                        'total_price' => 0, // auto-calc via saving event
                    ]);
                } elseif ($services->isNotEmpty()) {
                    $svc = $services->random();
                    JobOrderItem::create([
                        'job_order_id' => $jo->id,
                        'item_type' => 'service',
                        'item_id' => $svc->id,
                        'description' => $svc->name,
                        'quantity' => 1,
                        'unit_price' => $svc->price_fixed,
                        'total_price' => 0,
                    ]);
                } else {
                    JobOrderItem::factory()->create(['job_order_id' => $jo->id]);
                }
            }
        };

        // ===================================================================
        // CREATED  (5) — fresh walk-ins & online bookings
        // ===================================================================

        // Bare-minimum walk-in with no items yet
        $c = $customers->random();
        JobOrder::factory()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'notes' => 'Walk-in customer waiting at front desk — no services selected yet',
        ]);

        // Walk-in with items, created 2 days ago
        $c = $customers->random();
        $jo = JobOrder::factory()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'notes' => 'Customer requested oil change and brake inspection',
            'created_at' => now()->subDays(2),
        ]);
        $addItems($jo, 2, 3);

        // Walk-in created today
        $c = $customers->random();
        $jo = JobOrder::factory()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'created_at' => now()->subHours(2),
        ]);
        $addItems($jo, 1, 2);

        // Online booking (future arrival)
        $c = $customers->random();
        $svc = $services->random();
        $jo = JobOrder::factory()->onlineBooking()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'service_id' => $svc->id,
            'arrival_date' => now()->addDays(3)->toDateString(),
            'arrival_time' => '10:00:00',
            'reservation_expires_at' => now()->addDays(3)->setTime(12, 0),
            'notes' => 'Online booking — scheduled for next week',
        ]);
        JobOrderItem::create([
            'job_order_id' => $jo->id,
            'item_type' => 'service',
            'item_id' => $svc->id,
            'description' => $svc->name,
            'quantity' => 1,
            'unit_price' => $svc->price_fixed,
            'total_price' => 0,
        ]);

        // Online booking arriving tomorrow
        $c = $customers->random();
        $svc = $services->random();
        $jo = JobOrder::factory()->onlineBooking()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'service_id' => $svc->id,
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '14:00:00',
            'reservation_expires_at' => now()->addDay()->setTime(16, 0),
            'notes' => 'Afternoon slot — requested AC check',
        ]);
        $addItems($jo, 1, 2);

        // ===================================================================
        // PENDING APPROVAL  (3) — awaiting manager sign-off
        // ===================================================================

        $c = $customers->random();
        $jo = JobOrder::factory()->pendingApproval()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'service_fee' => 8000.00,
            'notes' => 'High-cost transmission repair — needs manager approval',
            'created_at' => now()->subHours(5),
        ]);
        $addItems($jo, 3, 5);

        $c = $customers->random();
        $jo = JobOrder::factory()->pendingApproval()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'notes' => 'Engine overhaul estimate pending review',
            'created_at' => now()->subDay(),
        ]);
        $addItems($jo, 2, 3);

        $c = $customers->random();
        $jo = JobOrder::factory()->onlineBooking()->pendingApproval()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'notes' => 'Online booking with premium parts — needs approval',
        ]);
        $addItems($jo, 1, 2);

        // ===================================================================
        // APPROVED  (4) — green-lit, waiting for bay / mechanic assignment
        // ===================================================================

        $c = $customers->random();
        $jo = JobOrder::factory()->approved()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'notes' => 'Approved — waiting for bay assignment',
            'created_at' => now()->subDay(),
        ]);
        $addItems($jo, 2, 4);

        $c = $customers->random();
        $jo = JobOrder::factory()->approved()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'created_at' => now()->subHours(8),
        ]);
        $addItems($jo, 1, 3);

        $c = $customers->random();
        $jo = JobOrder::factory()->approved()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['pedro@example.com']->id,
            'notes' => 'Assigned to Pedro — waiting for bay',
            'created_at' => now()->subHours(6),
        ]);
        $addItems($jo, 2, 3);

        $c = $customers->random();
        $jo = JobOrder::factory()->approved()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['ana@example.com']->id,
            'bay_id' => $bays['Bay 5']->id,
            'notes' => 'AC diagnostics — Ana at Bay 5, ready to start',
            'created_at' => now()->subHours(3),
        ]);
        $addItems($jo, 1, 2);

        // ===================================================================
        // IN PROGRESS  (3) — actively being worked on
        // ===================================================================

        $c = $customers->random();
        $jo = JobOrder::factory()->inProgress()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['juan@example.com']->id,
            'bay_id' => $bays['Bay 1']->id,
            'notes' => 'Engine diagnostics in progress — Juan at Bay 1',
        ]);
        $bays['Bay 1']->update(['status' => 'occupied']);
        $mechanics['juan@example.com']->update(['availability_status' => 'busy']);
        $addItems($jo, 3, 5);

        $c = $customers->random();
        $jo = JobOrder::factory()->inProgress()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['pedro@example.com']->id,
            'bay_id' => $bays['Bay 2']->id,
            'notes' => 'Transmission fluid service — halfway done',
            'created_at' => now()->subHours(2),
        ]);
        $bays['Bay 2']->update(['status' => 'occupied']);
        $mechanics['pedro@example.com']->update(['availability_status' => 'busy']);
        $addItems($jo, 2, 4);

        $c = $customers->random();
        $jo = JobOrder::factory()->inProgress()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['ana@example.com']->id,
            'bay_id' => $bays['Bay 3']->id,
            'notes' => 'AC compressor replacement underway — Ana at Bay 3',
            'created_at' => now()->subHours(4),
        ]);
        $bays['Bay 3']->update(['status' => 'occupied']);
        $mechanics['ana@example.com']->update(['availability_status' => 'busy']);
        $addItems($jo, 2, 3);

        // ===================================================================
        // COMPLETED  (5) — work finished, ready for billing / payment
        // ===================================================================

        $c = $customers->random();
        $jo = JobOrder::factory()->completed()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['maria@example.com']->id,
            'notes' => 'Electrical system — all items completed',
            'created_at' => now()->subDays(1),
        ]);
        $addItems($jo, 3, 6);

        $c = $customers->random();
        $jo = JobOrder::factory()->completed()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['roberto@example.com']->id,
            'notes' => 'Full preventive maintenance service done',
            'created_at' => now()->subDays(1),
        ]);
        $addItems($jo, 2, 4);

        $c = $customers->random();
        $jo = JobOrder::factory()->completed()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['juan@example.com']->id,
            'notes' => 'Engine tune-up — customer notified via SMS',
            'created_at' => now()->subDays(2),
        ]);
        $addItems($jo, 1, 3);

        $c = $customers->random();
        $jo = JobOrder::factory()->completed()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['pedro@example.com']->id,
            'notes' => 'Completed — pending customer pickup',
            'created_at' => now()->subDays(2),
        ]);
        $addItems($jo, 2, 5);

        $c = $customers->random();
        $jo = JobOrder::factory()->onlineBooking()->completed()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['maria@example.com']->id,
            'notes' => 'Online booking — completed right on schedule',
            'created_at' => now()->subDays(3),
        ]);
        $addItems($jo, 1, 2);

        // ===================================================================
        // SETTLED  (6) — paid & closed
        // ===================================================================

        $c = $customers->random();
        $jo = JobOrder::factory()->settled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['maria@example.com']->id,
            'created_at' => now()->subDays(5),
        ]);
        $addItems($jo, 2, 4);

        $c = $customers->random();
        $jo = JobOrder::factory()->settled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['roberto@example.com']->id,
            'created_at' => now()->subDays(4),
        ]);
        $addItems($jo, 3, 5);

        $c = $customers->random();
        $jo = JobOrder::factory()->settled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['pedro@example.com']->id,
            'created_at' => now()->subDays(3),
        ]);
        $addItems($jo, 1, 3);

        $c = $customers->random();
        $jo = JobOrder::factory()->settled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['ana@example.com']->id,
            'created_at' => now()->subDays(7),
        ]);
        $addItems($jo, 2, 4);

        $c = $customers->random();
        $jo = JobOrder::factory()->settled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['juan@example.com']->id,
            'created_at' => now()->subDays(6),
        ]);
        $addItems($jo, 2, 3);

        $c = $customers->random();
        $jo = JobOrder::factory()->onlineBooking()->settled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'approved_by' => $approver->id,
            'assigned_mechanic_id' => $mechanics['maria@example.com']->id,
            'created_at' => now()->subDays(8),
        ]);
        $addItems($jo, 1, 2);

        // ===================================================================
        // CANCELLED  (3) — various reasons
        // ===================================================================

        $c = $customers->random();
        JobOrder::factory()->cancelled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'notes' => 'Customer cancelled — went to another shop',
            'created_at' => now()->subDays(3),
        ]);

        $c = $customers->random();
        JobOrder::factory()->cancelled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'notes' => 'Cancelled — required parts out of stock',
            'created_at' => now()->subDays(2),
        ]);

        $c = $customers->random();
        JobOrder::factory()->onlineBooking()->cancelled()->create([
            'customer_id' => $c->id,
            'vehicle_id' => $randomVehicleFor($c)->id,
            'notes' => 'Online booking cancelled by customer — no reason given',
            'created_at' => now()->subDays(1),
        ]);

        $this->command->info('Job orders seeded: ~30 JOs across all statuses (Created → Settled + Cancelled).');
    }
}
