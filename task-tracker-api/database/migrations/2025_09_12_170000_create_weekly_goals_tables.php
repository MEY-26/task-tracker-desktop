<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('week_start'); // Monday of ISO week (yyyy-mm-dd)
            $table->timestamps();
            $table->unique(['user_id', 'week_start']);
        });

        Schema::create('weekly_goal_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('weekly_goal_id')->constrained('weekly_goals')->onDelete('cascade');
            $table->string('title');
            $table->text('action_plan')->nullable();
            $table->integer('target_minutes')->default(0);
            $table->decimal('weight_percent', 5, 2)->default(0); // 0-100 for planned items
            $table->integer('actual_minutes')->default(0);
            $table->boolean('is_unplanned')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_goal_items');
        Schema::dropIfExists('weekly_goals');
    }
};

