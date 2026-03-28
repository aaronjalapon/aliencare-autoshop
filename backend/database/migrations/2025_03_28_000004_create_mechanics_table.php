<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mechanics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('specialization')->nullable();
            $table->enum('availability_status', ['available', 'busy', 'on_leave'])->default('available');
            $table->timestamps();

            $table->index('availability_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanics');
    }
};
