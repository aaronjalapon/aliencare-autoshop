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
        Schema::create('archives', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->string('entity_type'); // 'inventory', 'reservation', 'transaction'
            $table->unsignedBigInteger('entity_id');
            $table->string('action'); // 'created', 'updated', 'deleted', 'reserved', 'sold', 'returned'
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->string('user_id')->nullable();
            $table->string('reference_number')->nullable(); // Job order, POS transaction, etc.
            $table->text('notes')->nullable();
            $table->timestamp('archived_date');
            $table->timestamps();

            // Indexes
            $table->index(['entity_type', 'entity_id']);
            $table->index(['archived_date']);
            $table->index(['action']);
            $table->index(['reference_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('archives');
    }
};
