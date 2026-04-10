<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_transactions', function (Blueprint $table) {
            // Allow linking a transaction back to the reservation it pays for
            $table->foreignId('reservation_id')
                ->nullable()
                ->after('job_order_id')
                ->constrained('reservations')
                ->nullOnDelete();

            $table->index('reservation_id');
        });
    }

    public function down(): void
    {
        Schema::table('customer_transactions', function (Blueprint $table) {
            $table->dropForeign(['reservation_id']);
            $table->dropIndex(['reservation_id']);
            $table->dropColumn('reservation_id');
        });
    }
};
