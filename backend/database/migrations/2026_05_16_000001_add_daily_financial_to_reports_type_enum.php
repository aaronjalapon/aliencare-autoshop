<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't support MODIFY COLUMN, so we rebuild the table.
        // This migration adds 'daily_financial' to the report_type enum.
        Schema::create('reports_new', function (Blueprint $table) {
            $table->id();
            $table->string('report_type');
            $table->timestamp('generated_date');
            $table->date('report_date');
            $table->json('data_summary');
            $table->integer('forecast_period')->nullable();
            $table->decimal('forecast_value', 15, 2)->nullable();
            $table->decimal('confidence_level', 5, 2)->nullable();
            $table->string('generated_by')->nullable();
            $table->timestamps();
            $table->index(['report_type', 'report_date']);
            $table->index(['generated_date']);
        });

        DB::statement('INSERT INTO reports_new SELECT * FROM reports');

        Schema::drop('reports');

        Schema::rename('reports_new', 'reports');
    }

    public function down(): void
    {
        // No down migration needed — the original values are still accepted.
    }
};
