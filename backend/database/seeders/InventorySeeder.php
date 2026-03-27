<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Archive;
use App\Models\Inventory;
use App\Models\Report;
use App\Models\Reservation;
use App\Models\StockTransaction;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create sample inventory items
        $inventoryItems = [
            [
                'item_name' => 'Brake Pads - Front Set',
                'description' => 'High-performance ceramic brake pads for front wheels',
                'category' => 'Brakes',
                'stock' => 25,
                'reorder_level' => 10,
                'unit_price' => 45.99,
                'supplier' => 'AutoParts Plus',
                'location' => 'A1-01',
                'status' => 'active',
            ],
            [
                'item_name' => 'Engine Oil 5W-30',
                'description' => 'Synthetic motor oil 5W-30, 5-liter container',
                'category' => 'Oils & Fluids',
                'stock' => 50,
                'reorder_level' => 15,
                'unit_price' => 28.50,
                'supplier' => 'ProMechanic Supply',
                'location' => 'B2-01',
                'status' => 'active',
            ],
            [
                'item_name' => 'Car Battery 12V 75AH',
                'description' => 'Lead-acid car battery with 75AH capacity',
                'category' => 'Electrical',
                'stock' => 15,
                'reorder_level' => 8,
                'unit_price' => 125.00,
                'supplier' => 'Elite Auto Components',
                'location' => 'C3-01',
                'status' => 'active',
            ],
            [
                'item_name' => 'All-Season Tire 205/65R16',
                'description' => 'All-season passenger tire 205/65R16',
                'category' => 'Tires',
                'stock' => 32,
                'reorder_level' => 12,
                'unit_price' => 89.99,
                'supplier' => 'MasterParts Inc',
                'location' => 'D4-01',
                'status' => 'active',
            ],
            [
                'item_name' => 'Oil Filter - 5W30 Compatible',
                'description' => 'High-efficiency oil filter compatible with 5W30 oil',
                'category' => 'Filters',
                'stock' => 5, // Low stock for testing alerts
                'reorder_level' => 20,
                'unit_price' => 12.99,
                'supplier' => 'AutoParts Plus',
                'location' => 'A1-02',
                'status' => 'active',
            ],
            [
                'item_name' => 'NGK Spark Plugs (Set of 4)',
                'description' => 'NGK Iridium spark plugs, set of 4',
                'category' => 'Engine',
                'stock' => 0, // Out of stock for testing
                'reorder_level' => 15,
                'unit_price' => 32.50,
                'supplier' => 'SpeedTech Parts',
                'location' => 'B2-02',
                'status' => 'active',
            ],
            [
                'item_name' => 'Air Filter - Standard',
                'description' => 'Standard air filter for most passenger vehicles',
                'category' => 'Filters',
                'stock' => 40,
                'reorder_level' => 18,
                'unit_price' => 15.75,
                'supplier' => 'ProMechanic Supply',
                'location' => 'A1-03',
                'status' => 'active',
            ],
            [
                'item_name' => 'Windshield Wiper Blade 24"',
                'description' => '24-inch windshield wiper blade',
                'category' => 'Electrical',
                'stock' => 22,
                'reorder_level' => 10,
                'unit_price' => 18.99,
                'supplier' => 'Elite Auto Components',
                'location' => 'C3-02',
                'status' => 'active',
            ],
        ];

        foreach ($inventoryItems as $item) {
            Inventory::create($item);
        }

        // Create some stock transactions
        $items = Inventory::all();

        foreach ($items as $item) {
            // Create initial procurement transaction
            StockTransaction::create([
                'item_id' => $item->item_id,
                'transaction_type' => 'procurement',
                'quantity' => $item->stock,
                'previous_stock' => 0,
                'new_stock' => $item->stock,
                'reference_number' => 'PO-2024-'.rand(1000, 9999),
                'notes' => 'Initial stock procurement',
                'created_by' => 'System',
                'created_at' => now()->subDays(rand(1, 30)),
            ]);

            // Create some sales transactions
            if ($item->stock > 0) {
                $salesCount = rand(1, 5);
                for ($i = 0; $i < $salesCount; $i++) {
                    $soldQuantity = rand(1, min(5, $item->stock));
                    $previousStock = $item->stock + $soldQuantity;

                    StockTransaction::create([
                        'item_id' => $item->item_id,
                        'transaction_type' => 'sale',
                        'quantity' => -$soldQuantity,
                        'previous_stock' => $previousStock,
                        'new_stock' => $item->stock,
                        'reference_number' => 'POS-'.now()->subDays(rand(0, 15))->format('Ymd').'-'.rand(100, 999),
                        'notes' => 'Point of sale transaction',
                        'created_by' => 'POS System',
                        'created_at' => now()->subDays(rand(0, 15)),
                    ]);
                }
            }
        }

        // Create some reservations
        $brakeItem = Inventory::where('item_name', 'Brake Pads - Front Set')->first();
        $oilItem = Inventory::where('item_name', 'Engine Oil 5W-30')->first();
        $batteryItem = Inventory::where('item_name', 'Car Battery 12V 75AH')->first();

        $reservations = [
            [
                'item_id' => $brakeItem->item_id,
                'quantity' => 2,
                'status' => 'pending',
                'priority_level' => 2,
                'is_urgent' => false,
                'job_order_number' => 'JO-2024-1001',
                'requested_by' => 'John Mechanic',
                'requested_date' => now()->subDays(2),
                'expires_at' => now()->addDays(5),
                'notes' => 'Brake service for customer vehicle',
            ],
            [
                'item_id' => $oilItem->item_id,
                'quantity' => 1,
                'status' => 'approved',
                'priority_level' => 1,
                'is_urgent' => false,
                'job_order_number' => 'JO-2024-1002',
                'requested_by' => 'Mike Technician',
                'approved_by' => 'Sarah Manager',
                'requested_date' => now()->subDays(1),
                'approved_date' => now()->subHours(12),
                'expires_at' => now()->addDays(3),
                'notes' => 'Oil change service',
            ],
            [
                'item_id' => $batteryItem->item_id,
                'quantity' => 1,
                'status' => 'completed',
                'priority_level' => 3,
                'is_urgent' => true,
                'job_order_number' => 'JO-2024-1003',
                'requested_by' => 'Lisa Mechanic',
                'approved_by' => 'Sarah Manager',
                'requested_date' => now()->subDays(3),
                'approved_date' => now()->subDays(2),
                'expires_at' => now()->addDays(1),
                'estimated_completion' => now()->subDays(1),
                'notes' => 'Battery replacement',
            ],
        ];

        foreach ($reservations as $reservation) {
            Reservation::create($reservation);
        }

        // Create sample reports
        $dailyUsageData = [
            'date' => now()->subDay()->format('Y-m-d'),
            'summary_by_type' => [
                'sale' => [
                    ['item_id' => 'BRK-PAD-001', 'item_name' => 'Brake Pads - Front Set', 'total_quantity' => 2, 'total_value' => 91.98],
                    ['item_id' => 'ENG-OIL-5W30', 'item_name' => 'Engine Oil 5W-30', 'total_quantity' => 3, 'total_value' => 85.50],
                ],
                'procurement' => [
                    ['item_id' => 'TIRE-205-65R16', 'item_name' => 'All-Season Tire 205/65R16', 'total_quantity' => 12, 'total_value' => 1079.88],
                ],
            ],
            'totals' => [
                'total_sales' => 177.48,
                'total_procurement' => 1079.88,
                'total_returns' => 0,
                'net_movement' => 902.40,
            ],
            'transaction_count' => 5,
        ];

        Report::create([
            'report_type' => 'daily_usage',
            'generated_date' => now(),
            'report_date' => now()->subDay(),
            'data_summary' => $dailyUsageData,
            'generated_by' => 'System',
        ]);

        // Create some archive entries
        $archives = [
            [
                'entity_type' => 'inventory',
                'entity_id' => 1,
                'action' => 'created',
                'old_data' => null,
                'new_data' => ['item_id' => 'BRK-PAD-001', 'stock' => 25],
                'user_id' => '1',
                'notes' => 'Initial inventory item creation',
                'archived_date' => now()->subDays(30),
            ],
            [
                'entity_type' => 'inventory',
                'entity_id' => 1,
                'action' => 'sale',
                'old_data' => ['stock' => 27],
                'new_data' => ['stock' => 25],
                'reference_number' => 'POS-20241001-123',
                'notes' => 'Stock deduction for sale',
                'archived_date' => now()->subDays(1),
            ],
        ];

        foreach ($archives as $archive) {
            Archive::create($archive);
        }

        $this->command->info('Inventory sample data seeded successfully!');
    }
}
