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
        Schema::create('task_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_type_id')->constrained('task_types')->onDelete('cascade');
            $table->string('name');
            $table->string('color', 7)->default('#6b7280');
            $table->boolean('is_system')->default(false);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            
            $table->unique(['task_type_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_statuses');
    }
};
