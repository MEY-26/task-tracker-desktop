<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TaskType;
use App\Models\TaskStatus;

class TaskTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Sistem task type'ı oluştur
        $developmentType = TaskType::create([
            'name' => 'Geliştirme',
            'color' => '#f59e0b',
            'is_system' => true,
            'is_permanent' => true
        ]);

        // Sistem status'ları oluştur
        TaskStatus::create([
            'task_type_id' => $developmentType->id,
            'name' => 'Bekliyor',
            'color' => '#6b7280',
            'is_system' => true,
            'is_default' => true
        ]);

        TaskStatus::create([
            'task_type_id' => $developmentType->id,
            'name' => 'Tamamlandı',
            'color' => '#10b981',
            'is_system' => true,
            'is_default' => false
        ]);

        TaskStatus::create([
            'task_type_id' => $developmentType->id,
            'name' => 'İptal',
            'color' => '#ef4444',
            'is_system' => true,
            'is_default' => false
        ]);
    }
}
