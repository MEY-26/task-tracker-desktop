<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('leave_requests', 'saturday')) {
                $table->boolean('saturday')->default(false);
            }
            if (! Schema::hasColumn('leave_requests', 'sunday')) {
                $table->boolean('sunday')->default(false);
            }
            if (! Schema::hasColumn('leave_requests', 'saturday_start')) {
                $table->string('saturday_start', 16)->nullable();
            }
            if (! Schema::hasColumn('leave_requests', 'saturday_end')) {
                $table->string('saturday_end', 16)->nullable();
            }
            if (! Schema::hasColumn('leave_requests', 'sunday_start')) {
                $table->string('sunday_start', 16)->nullable();
            }
            if (! Schema::hasColumn('leave_requests', 'sunday_end')) {
                $table->string('sunday_end', 16)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $cols = ['saturday', 'sunday', 'saturday_start', 'saturday_end', 'sunday_start', 'sunday_end'];
            foreach ($cols as $c) {
                if (Schema::hasColumn('leave_requests', $c)) {
                    $table->dropColumn($c);
                }
            }
        });
    }
};
