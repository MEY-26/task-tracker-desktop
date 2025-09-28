<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if we're using SQLite
        if (DB::connection()->getDriverName() === 'sqlite') {
            // SQLite doesn't support column modifications directly
            // We need to recreate the table structure
            Schema::table('tasks', function (Blueprint $table) {
                // First, add a temporary column
                $table->string('task_type_temp', 50)->nullable();
            });
            
            // Copy data from old column to new column
            DB::statement("UPDATE tasks SET task_type_temp = task_type");
            
            // Drop the old column and rename the new one
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropColumn('task_type');
            });
            
            Schema::table('tasks', function (Blueprint $table) {
                $table->renameColumn('task_type_temp', 'task_type');
            });
            
            // Set default value
            DB::statement("UPDATE tasks SET task_type = 'development' WHERE task_type IS NULL");
            
            // Make it not null
            Schema::table('tasks', function (Blueprint $table) {
                $table->string('task_type', 50)->default('development')->nullable(false)->change();
            });
        } else {
            // MySQL/PostgreSQL can modify columns directly
            Schema::table('tasks', function (Blueprint $table) {
                $table->string('task_type', 50)->default('development')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->enum('task_type', [
                'new_product',
                'fixture', 
                'apparatus',
                'development',
                'revision',
                'mold',
                'test_device'
            ])->default('development')->change();
        });
    }
};
