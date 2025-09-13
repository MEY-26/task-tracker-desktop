<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('weekly_goal_items', function (Blueprint $table) {
            $table->text('description')->nullable()->after('action_plan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('weekly_goal_items', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
