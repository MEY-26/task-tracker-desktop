<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
        'is_system',
        'is_permanent'
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'is_permanent' => 'boolean'
    ];

    public function statuses()
    {
        return $this->hasMany(TaskStatus::class);
    }
}
