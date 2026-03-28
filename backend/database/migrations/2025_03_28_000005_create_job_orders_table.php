<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_orders', function (Blueprint $table) {
            $table->id();
            $table->string('jo_number')->unique();
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('vehicle_id')->constrained('vehicles');
            $table->enum('status', [
                'created',
                'pending_approval',
                'approved',
                'in_progress',
                'completed',
                'settled',
                'cancelled',
            ])->default('created');
            $table->foreignId('assigned_mechanic_id')->nullable()->constrained('mechanics');
            $table->foreignId('bay_id')->nullable()->constrained('bays');
            $table->decimal('service_fee', 10, 2)->default(0);
            $table->boolean('settled_flag')->default(false);
            $table->string('invoice_id')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('customer_id');
            $table->index('vehicle_id');
            $table->index('assigned_mechanic_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_orders');
    }
};
