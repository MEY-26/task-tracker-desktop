<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_overrides', function (Blueprint $table) {
            $table->string('source', 16)->default('manual')->after('targets');
            $table->index(['date', 'source']);
        });
    }

    public function down(): void
    {
        Schema::table('calendar_overrides', function (Blueprint $table) {
            $table->dropIndex(['date', 'source']);
            $table->dropColumn('source');
        });
    }
};
