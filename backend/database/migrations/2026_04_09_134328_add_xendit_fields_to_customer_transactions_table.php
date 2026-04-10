<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('customer_transactions', function (Blueprint $table) {
            $table->string('external_id')->nullable()->unique()->after('notes');
            $table->string('xendit_invoice_id')->nullable()->after('external_id');
            $table->string('payment_url')->nullable()->after('xendit_invoice_id');
            $table->string('payment_method')->nullable()->after('payment_url');
            $table->string('xendit_status')->nullable()->after('payment_method');
            $table->timestamp('paid_at')->nullable()->after('xendit_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_transactions', function (Blueprint $table) {
            $table->dropColumn(['external_id', 'xendit_invoice_id', 'payment_url', 'payment_method', 'xendit_status', 'paid_at']);
        });
    }
};
