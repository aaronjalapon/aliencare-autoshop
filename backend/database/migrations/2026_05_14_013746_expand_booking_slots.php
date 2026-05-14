<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('booking_slots')->truncate();

        DB::table('booking_slots')->insert([
            ['time' => '08:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 1,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '09:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 2,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '10:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 3,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '11:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 4,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '12:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 5,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '13:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 6,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '14:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 7,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '15:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 8,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '16:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 9,  'created_at' => $now, 'updated_at' => $now],
            ['time' => '17:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 10, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        $now = now();

        DB::table('booking_slots')->truncate();

        DB::table('booking_slots')->insert([
            ['time' => '10:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['time' => '11:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['time' => '12:00', 'capacity' => 3, 'is_active' => true, 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['time' => '12:30', 'capacity' => 3, 'is_active' => true, 'sort_order' => 4, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
};
