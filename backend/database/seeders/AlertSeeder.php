<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Inventory;
use Illuminate\Database\Seeder;

class AlertSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // First, let's get some inventory items to associate with alerts
        $inventoryItems = Inventory::limit(10)->get();

        if ($inventoryItems->isEmpty()) {
            // Create some sample inventory items if none exist
            $sampleItems = [
                [
                    'item_id' => 'BRK001',
                    'item_name' => 'Brake Pads - Front',
                    'category' => 'Brakes',
                    'current_stock' => 5,
                    'reorder_level' => 20,
                    'unit_price' => 45.99,
                    'supplier' => 'Auto Parts Plus',
                    'location' => 'A-1-1',
                ],
                [
                    'item_id' => 'OIL002',
                    'item_name' => '5W-30 Motor Oil',
                    'category' => 'Engine',
                    'current_stock' => 2,
                    'reorder_level' => 15,
                    'unit_price' => 24.99,
                    'supplier' => 'Lube Express',
                    'location' => 'B-2-3',
                ],
                [
                    'item_id' => 'FLT003',
                    'item_name' => 'Air Filter - Standard',
                    'category' => 'Engine',
                    'current_stock' => 8,
                    'reorder_level' => 25,
                    'unit_price' => 15.99,
                    'supplier' => 'Filter Pro',
                    'location' => 'C-1-2',
                ],
                [
                    'item_id' => 'SPK004',
                    'item_name' => 'Spark Plugs Set',
                    'category' => 'Engine',
                    'current_stock' => 1,
                    'reorder_level' => 10,
                    'unit_price' => 32.99,
                    'supplier' => 'Ignition Express',
                    'location' => 'A-3-1',
                ],
                [
                    'item_id' => 'TIR005',
                    'item_name' => 'All-Season Tire 205/55R16',
                    'category' => 'Tires',
                    'current_stock' => 3,
                    'reorder_level' => 12,
                    'unit_price' => 89.99,
                    'supplier' => 'Tire World',
                    'location' => 'D-1-1',
                ],
            ];

            foreach ($sampleItems as $item) {
                Inventory::create($item);
            }

            $inventoryItems = Inventory::all();
        }

        // Create various types of alerts
        $alertsData = [
            [
                'item_id' => $inventoryItems->first()->id,
                'item_name' => $inventoryItems->first()->item_name,
                'category' => $inventoryItems->first()->category,
                'supplier' => $inventoryItems->first()->supplier,
                'alert_type' => 'low_stock',
                'urgency' => 'critical',
                'message' => 'Critical: Brake Pads stock extremely low (5 remaining, threshold: 20)',
                'current_stock' => 5,
                'reorder_level' => 20,
                'acknowledged' => false,
                'created_at' => now()->subHours(2),
            ],
            [
                'item_id' => $inventoryItems->skip(1)->first()->id,
                'item_name' => $inventoryItems->skip(1)->first()->item_name,
                'category' => $inventoryItems->skip(1)->first()->category,
                'supplier' => $inventoryItems->skip(1)->first()->supplier,
                'alert_type' => 'low_stock',
                'urgency' => 'critical',
                'message' => 'Critical: Motor Oil stock critically low (2 remaining, threshold: 15)',
                'current_stock' => 2,
                'reorder_level' => 15,
                'acknowledged' => false,
                'created_at' => now()->subHours(1),
            ],
            [
                'item_id' => $inventoryItems->skip(2)->first()->id,
                'item_name' => $inventoryItems->skip(2)->first()->item_name,
                'category' => $inventoryItems->skip(2)->first()->category,
                'supplier' => $inventoryItems->skip(2)->first()->supplier,
                'alert_type' => 'low_stock',
                'urgency' => 'high',
                'message' => 'High: Air Filter stock below reorder level (8 remaining, threshold: 25)',
                'current_stock' => 8,
                'reorder_level' => 25,
                'acknowledged' => false,
                'created_at' => now()->subMinutes(30),
            ],
            [
                'item_id' => $inventoryItems->skip(3)->first()->id,
                'item_name' => $inventoryItems->skip(3)->first()->item_name,
                'category' => $inventoryItems->skip(3)->first()->category,
                'supplier' => $inventoryItems->skip(3)->first()->supplier,
                'alert_type' => 'out_of_stock',
                'urgency' => 'critical',
                'message' => 'URGENT: Spark Plugs almost out of stock (1 remaining, threshold: 10)',
                'current_stock' => 1,
                'reorder_level' => 10,
                'acknowledged' => false,
                'created_at' => now()->subMinutes(15),
            ],
            [
                'item_id' => $inventoryItems->skip(4)->first()->id,
                'item_name' => $inventoryItems->skip(4)->first()->item_name,
                'category' => $inventoryItems->skip(4)->first()->category,
                'supplier' => $inventoryItems->skip(4)->first()->supplier,
                'alert_type' => 'low_stock',
                'urgency' => 'high',
                'message' => 'High: Tire stock below reorder level (3 remaining, threshold: 12)',
                'current_stock' => 3,
                'reorder_level' => 12,
                'acknowledged' => false,
                'created_at' => now()->subMinutes(5),
            ],
        ];

        // Create some acknowledged alerts as well
        $acknowledgedAlertsData = [
            [
                'item_id' => $inventoryItems->first()->id,
                'item_name' => $inventoryItems->first()->item_name,
                'category' => $inventoryItems->first()->category,
                'supplier' => $inventoryItems->first()->supplier,
                'alert_type' => 'low_stock',
                'urgency' => 'medium',
                'message' => 'Medium: Battery stock low - resolved by reorder',
                'current_stock' => 15,
                'reorder_level' => 20,
                'acknowledged' => true,
                'acknowledged_at' => now()->subDays(1),
                'acknowledged_by' => 1, // Assuming user ID 1 exists
                'created_at' => now()->subDays(2),
            ],
            [
                'item_id' => $inventoryItems->skip(1)->first()->id,
                'item_name' => $inventoryItems->skip(1)->first()->item_name,
                'category' => $inventoryItems->skip(1)->first()->category,
                'supplier' => $inventoryItems->skip(1)->first()->supplier,
                'alert_type' => 'reorder',
                'urgency' => 'low',
                'message' => 'Low: Scheduled reorder for oil filters completed',
                'current_stock' => 25,
                'reorder_level' => 20,
                'acknowledged' => true,
                'acknowledged_at' => now()->subDays(3),
                'acknowledged_by' => 1,
                'created_at' => now()->subDays(4),
            ],
        ];

        // Insert unacknowledged alerts
        foreach ($alertsData as $alertData) {
            Alert::create($alertData);
        }

        // Insert acknowledged alerts
        foreach ($acknowledgedAlertsData as $alertData) {
            Alert::create($alertData);
        }

        $this->command->info('Alert seeder completed successfully!');
        $this->command->info('Created '.count($alertsData).' unacknowledged alerts');
        $this->command->info('Created '.count($acknowledgedAlertsData).' acknowledged alerts');
    }
}
