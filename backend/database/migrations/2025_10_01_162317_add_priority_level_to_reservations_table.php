<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Add priority level with default value based on status
            $table->integer('priority_level')->default(3)->after('status');

            // Add urgency flag for time-sensitive reservations
            $table->boolean('is_urgent')->default(false)->after('priority_level');

            // Add estimated completion date
            $table->timestamp('estimated_completion')->nullable()->after('expires_at');

            // Add index for priority-based queries
            $table->index(['priority_level', 'created_at']);
            $table->index(['is_urgent', 'status']);
        });

        // Update existing records to set appropriate priority levels
        DB::table('reservations')->where('status', 'pending')->update(['priority_level' => 1]);
        DB::table('reservations')->where('status', 'approved')->update(['priority_level' => 2]);
        DB::table('reservations')->where('status', 'completed')->update(['priority_level' => 5]);
        DB::table('reservations')->where('status', 'cancelled')->update(['priority_level' => 6]);
        DB::table('reservations')->where('status', 'rejected')->update(['priority_level' => 6]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex(['priority_level', 'created_at']);
            $table->dropIndex(['is_urgent', 'status']);
            $table->dropColumn(['priority_level', 'is_urgent', 'estimated_completion']);
        });
    }
};
