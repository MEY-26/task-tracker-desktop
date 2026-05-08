<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_overrides', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('type', 32);
            $table->unsignedInteger('full_day_minutes')->nullable();
            $table->string('work_start', 8)->nullable();
            $table->string('work_end', 8)->nullable();
            $table->json('breaks')->nullable();
            $table->string('scope', 32);
            $table->json('targets')->nullable();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['date', 'scope']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_overrides');
    }
};
