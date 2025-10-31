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
        Schema::table('weekly_goals', function (Blueprint $table) {
            $table->integer('overtime_minutes')->default(0)->after('leave_minutes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('weekly_goals', function (Blueprint $table) {
            $table->dropColumn('overtime_minutes');
        });
    }
};
