<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskStatus extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_type_id',
        'name',
        'color',
        'is_system',
        'is_default'
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'is_default' => 'boolean'
    ];

    public function taskType()
    {
        return $this->belongsTo(TaskType::class);
    }
}
