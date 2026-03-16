<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value');
            $table->timestamps();
        });

        $defaults = [
            ['key' => 'working_days', 'value' => '[1,2,3,4,5]'],
            ['key' => 'work_start', 'value' => '08:00'],
            ['key' => 'work_end', 'value' => '18:15'],
            ['key' => 'breaks_default', 'value' => '[["10:00","10:15"],["13:00","13:30"],["16:00","16:15"]]'],
            ['key' => 'breaks_friday', 'value' => '[["10:00","10:15"],["13:00","14:30"],["16:00","16:15"]]'],
            ['key' => 'full_day_minutes', 'value' => '540'],
        ];

        $now = now();
        foreach ($defaults as $row) {
            DB::table('system_settings')->insert([
                'key' => $row['key'],
                'value' => $row['value'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
