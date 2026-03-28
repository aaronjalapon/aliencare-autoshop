<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('account_status')->default('pending')->after('license_number');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete()->after('account_status');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
            $table->softDeletes();

            $table->index('account_status');
        });

        // Migrate existing status values: active → approved, inactive → rejected
        DB::table('customers')->where('status', 'active')->update(['account_status' => 'approved']);
        DB::table('customers')->where('status', 'inactive')->update(['account_status' => 'rejected']);

        // Drop index before column to avoid SQLite issues
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->enum('status', ['active', 'inactive'])->default('active')->after('license_number');
        });

        // Reverse: approved → active, everything else → inactive
        DB::table('customers')->where('account_status', 'approved')->update(['status' => 'active']);
        DB::table('customers')->where('account_status', '!=', 'approved')->update(['status' => 'inactive']);

        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropIndex(['account_status']);
            $table->dropColumn(['account_status', 'approved_by', 'approved_at', 'rejection_reason', 'deleted_at']);
        });
    }
};
