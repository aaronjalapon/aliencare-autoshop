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
            $table->string('preferred_contact_method', 20)->nullable()->after('license_number');
            $table->text('special_notes')->nullable()->after('preferred_contact_method');
            $table->timestamp('onboarding_completed_at')->nullable()->after('special_notes');
            $table->index('onboarding_completed_at');
        });

        // Legacy customers already using the app should not be forced through onboarding.
        DB::table('customers')->whereNull('onboarding_completed_at')->update([
            'onboarding_completed_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['onboarding_completed_at']);
            $table->dropColumn(['preferred_contact_method', 'special_notes', 'onboarding_completed_at']);
        });
    }
};
