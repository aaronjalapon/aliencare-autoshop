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
            $table->foreignId('job_order_id')->nullable()->after('job_order_number')->constrained('job_orders')->nullOnDelete();
            $table->index('job_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropForeign(['job_order_id']);
            $table->dropIndex(['job_order_id']);
            $table->dropColumn('job_order_id');
        });
    }
};
