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
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('item_id'); // Foreign key to inventories.item_id
            $table->string('item_name');
            $table->integer('current_stock');
            $table->integer('reorder_level');
            $table->string('category');
            $table->string('supplier')->nullable();
            $table->enum('urgency', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('alert_type', ['low_stock', 'out_of_stock', 'expiry', 'reorder'])->default('low_stock');
            $table->text('message')->nullable();
            $table->boolean('acknowledged')->default(false);
            $table->string('acknowledged_by')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();

            // Foreign key
            $table->foreign('item_id')->references('item_id')->on('inventories')->onDelete('cascade');

            // Indexes
            $table->index(['item_id', 'acknowledged']);
            $table->index(['urgency', 'acknowledged']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
