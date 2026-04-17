<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inventories', function (Blueprint $table): void {
            $table->string('sku', 100)->nullable()->after('item_name');
        });

        DB::table('inventories')
            ->select('item_id')
            ->orderBy('item_id')
            ->chunkById(200, function ($items): void {
                foreach ($items as $item) {
                    DB::table('inventories')
                        ->where('item_id', (int) $item->item_id)
                        ->update([
                            'sku' => sprintf('INV-%06d', (int) $item->item_id),
                        ]);
                }
            }, 'item_id');

        Schema::table('inventories', function (Blueprint $table): void {
            $table->unique('sku');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventories', function (Blueprint $table): void {
            $table->dropUnique(['sku']);
            $table->dropColumn('sku');
        });
    }
};
