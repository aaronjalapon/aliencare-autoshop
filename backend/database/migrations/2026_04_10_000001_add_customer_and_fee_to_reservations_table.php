<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Link reservation to the customer who made it
            $table->foreignId('customer_id')
                ->nullable()
                ->after('job_order_id')
                ->constrained('customers')
                ->nullOnDelete();

            // Pre-computed reservation fee (20% of quantity × unit_price at time of booking)
            $table->decimal('reservation_fee', 10, 2)
                ->nullable()
                ->after('customer_id');

            // FK to customer_transactions — the Xendit invoice for the fee
            $table->foreignId('fee_transaction_id')
                ->nullable()
                ->after('reservation_fee')
                ->constrained('customer_transactions')
                ->nullOnDelete();

            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['fee_transaction_id']);
            $table->dropIndex(['customer_id']);
            $table->dropColumn(['customer_id', 'reservation_fee', 'fee_transaction_id']);
        });
    }
};
