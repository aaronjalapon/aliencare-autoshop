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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key for reservations
            $table->unsignedBigInteger('item_id'); // Foreign key to inventories.item_id
            $table->integer('quantity');
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed', 'cancelled'])->default('pending');
            $table->string('job_order_number')->nullable();
            $table->string('requested_by');
            $table->string('approved_by')->nullable();
            $table->timestamp('requested_date');
            $table->timestamp('approved_date')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Foreign key
            $table->foreign('item_id')->references('item_id')->on('inventories')->onDelete('cascade');

            // Indexes
            $table->index(['status']);
            $table->index(['job_order_number']);
            $table->index(['requested_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
