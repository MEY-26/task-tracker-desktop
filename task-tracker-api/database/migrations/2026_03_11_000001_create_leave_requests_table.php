<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('week_start');
            $table->boolean('monday')->default(false);
            $table->boolean('tuesday')->default(false);
            $table->boolean('wednesday')->default(false);
            $table->boolean('thursday')->default(false);
            $table->boolean('friday')->default(false);
            $table->timestamp('grace_started_at')->nullable();
            $table->timestamp('grace_expires_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'week_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
