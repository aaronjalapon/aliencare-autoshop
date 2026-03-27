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
        Schema::create('inventories', function (Blueprint $table) {
            $table->id('item_id'); // Auto-incrementing integer primary key named item_id
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->string('category');
            $table->integer('stock')->default(0);
            $table->integer('reorder_level')->default(10);
            $table->decimal('unit_price', 10, 2);
            $table->string('supplier')->nullable();
            $table->string('location')->nullable();
            $table->enum('status', ['active', 'inactive', 'discontinued'])->default('active');
            $table->timestamps();

            // Indexes
            $table->index(['category']);
            $table->index(['status']);
            $table->index(['stock', 'reorder_level']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
