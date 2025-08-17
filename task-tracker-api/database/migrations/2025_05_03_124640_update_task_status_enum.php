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
        // SQLite için uygun migration
        if (DB::connection()->getDriverName() === 'sqlite') {
            // SQLite'da enum desteği yok, text olarak saklayacağız
            // Mevcut verileri yedekle
            $tasks = DB::table('tasks')->get();
            
            // Tabloyu yeniden oluştur
            Schema::dropIfExists('tasks');
            Schema::create('tasks', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
                $table->string('status')->default('waiting'); // SQLite'da enum yerine string
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->foreignId('responsible_id')->constrained('users')->onDelete('cascade');
                $table->timestamp('start_date')->nullable();
                $table->timestamp('due_date')->nullable();
                $table->timestamps();
            });
            
            // Verileri geri yükle
            foreach ($tasks as $task) {
                DB::table('tasks')->insert([
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority ?? 'medium',
                    'status' => $task->status ?? 'waiting',
                    'created_by' => $task->created_by,
                    'responsible_id' => $task->responsible_id,
                    'start_date' => $task->start_date,
                    'due_date' => $task->due_date,
                    'created_at' => $task->created_at,
                    'updated_at' => $task->updated_at,
                ]);
            }
        } else {
            // MySQL için orijinal migration
            DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('waiting', 'in_progress', 'investigating', 'completed', 'cancelled') NOT NULL DEFAULT 'waiting'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            // SQLite için geri alma
            $tasks = DB::table('tasks')->get();
            
            Schema::dropIfExists('tasks');
            Schema::create('tasks', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
                $table->string('status')->default('waiting');
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->foreignId('responsible_id')->constrained('users')->onDelete('cascade');
                $table->timestamp('start_date')->nullable();
                $table->timestamp('due_date')->nullable();
                $table->timestamps();
            });
            
            foreach ($tasks as $task) {
                DB::table('tasks')->insert([
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority ?? 'medium',
                    'status' => $task->status ?? 'waiting',
                    'created_by' => $task->created_by,
                    'responsible_id' => $task->responsible_id,
                    'start_date' => $task->start_date,
                    'due_date' => $task->due_date,
                    'created_at' => $task->created_at,
                    'updated_at' => $task->updated_at,
                ]);
            }
        } else {
            DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('waiting', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'waiting'");
        }
    }
};
