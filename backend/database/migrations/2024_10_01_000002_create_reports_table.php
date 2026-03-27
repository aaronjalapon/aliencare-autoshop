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
        Schema::create('reports', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->enum('report_type', [
                'daily_usage',
                'monthly_procurement',
                'low_stock_alert',
                'reconciliation',
                'forecast',
            ]);
            $table->timestamp('generated_date');
            $table->date('report_date');
            $table->json('data_summary');
            $table->integer('forecast_period')->nullable(); // in days
            $table->decimal('forecast_value', 15, 2)->nullable();
            $table->decimal('confidence_level', 5, 2)->nullable(); // percentage
            $table->string('generated_by')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['report_type', 'report_date']);
            $table->index(['generated_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
