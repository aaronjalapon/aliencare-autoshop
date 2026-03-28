<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained();
            $table->foreignId('user_id')->nullable();
            $table->string('action');
            $table->string('entity_type');
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'action']);
            $table->index('entity_type');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_audit_logs');
    }
};
