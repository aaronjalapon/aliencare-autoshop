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
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key for transactions
            $table->unsignedBigInteger('item_id'); // Foreign key to inventories.item_id
            $table->enum('transaction_type', [
                'procurement',
                'sale',
                'reservation',
                'return',
                'damage',
                'adjustment',
            ]);
            $table->integer('quantity'); // positive for incoming, negative for outgoing
            $table->integer('previous_stock');
            $table->integer('new_stock');
            $table->string('reference_number')->nullable(); // POS transaction, job order, etc.
            $table->text('notes')->nullable();
            $table->string('created_by');
            $table->timestamps();

            // Foreign key
            $table->foreign('item_id')->references('item_id')->on('inventories')->onDelete('cascade');

            // Indexes
            $table->index(['transaction_type']);
            $table->index(['reference_number']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
    }
};
