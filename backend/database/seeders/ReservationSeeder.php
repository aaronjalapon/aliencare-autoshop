<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Inventory;
use App\Models\Reservation;
use Illuminate\Database\Seeder;

class ReservationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get some inventory items
        $items = Inventory::take(5)->get();

        if ($items->isEmpty()) {
            $this->command->warn('No inventory items found. Please run InventorySeeder first.');

            return;
        }

        $requesters = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Tom Brown'];
        $statuses = ['pending', 'approved', 'completed', 'pending', 'approved'];

        foreach ($items as $index => $item) {
            Reservation::create([
                'item_id' => $item->item_id,
                'quantity' => rand(1, 5),
                'job_order_number' => 'JO-2024-'.str_pad($index + 1, 3, '0', STR_PAD_LEFT),
                'requested_by' => $requesters[$index],
                'requested_date' => now()->subDays(rand(0, 10)),
                'status' => $statuses[$index],
                'notes' => 'Sample reservation for testing',
            ]);
        }

        $this->command->info('Sample reservations created successfully!');
    }
}
