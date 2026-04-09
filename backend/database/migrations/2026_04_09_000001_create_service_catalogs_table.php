<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_catalogs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('price_label');
            $table->decimal('price_fixed', 10, 2);
            $table->string('duration');
            $table->string('estimated_duration');
            $table->string('category');
            $table->json('features')->nullable();
            $table->json('includes')->nullable();
            $table->decimal('rating', 2, 1)->default(0.0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->string('queue_label')->nullable();
            $table->boolean('recommended')->default(false);
            $table->string('recommended_note')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_catalogs');
    }
};
