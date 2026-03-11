<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('weekly_goals', function (Blueprint $table) {
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending')->after('overtime_minutes');
            $table->unsignedBigInteger('approved_by')->nullable()->after('approval_status');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('approval_note')->nullable()->after('approved_at');
        });

        Schema::table('weekly_goals', function (Blueprint $table) {
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('weekly_goals', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
        });
        Schema::table('weekly_goals', function (Blueprint $table) {
            $table->dropColumn(['approval_status', 'approved_by', 'approved_at', 'approval_note']);
        });
    }
};
