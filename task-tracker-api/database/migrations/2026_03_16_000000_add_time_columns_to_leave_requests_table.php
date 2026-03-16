<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = [
            'monday_start', 'monday_end',
            'tuesday_start', 'tuesday_end',
            'wednesday_start', 'wednesday_end',
            'thursday_start', 'thursday_end',
            'friday_start', 'friday_end',
        ];

        foreach ($columns as $col) {
            if (!Schema::hasColumn('leave_requests', $col)) {
                DB::statement("ALTER TABLE leave_requests ADD COLUMN {$col} VARCHAR(255) NULL");
            }
        }
    }

    public function down(): void
    {
        // SQLite 3.35+ supports DROP COLUMN; older versions would need table recreate
        $columns = [
            'monday_start', 'monday_end',
            'tuesday_start', 'tuesday_end',
            'wednesday_start', 'wednesday_end',
            'thursday_start', 'thursday_end',
            'friday_start', 'friday_end',
        ];

        foreach ($columns as $col) {
            if (Schema::hasColumn('leave_requests', $col)) {
                DB::statement("ALTER TABLE leave_requests DROP COLUMN {$col}");
            }
        }
    }
};
