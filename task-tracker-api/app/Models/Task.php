<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'priority',
        'status',
        'responsible_id',
        'created_by',
        'start_date',
        'due_date',
        'end_date',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'due_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    // Görevi oluşturan kişi
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Görev sorumlusu
    public function responsible()
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    public function attachments()
    {
        return $this->hasMany(TaskAttachment::class);
    }


    // Göreve atanan kullanıcılar (çoktan çoğa)
    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'task_user')
            ->withPivot('role', 'response', 'responded_at')
            ->withTimestamps();
    }

    public function histories()
    {
        return $this->hasMany(TaskHistory::class);
    }

    /*public function history()
    {
        return $this->hasMany(TaskHistory::class);
    }*/

    protected static function booted()
    {
        static::deleting(function ($task) {
            // Doğru ilişki adı: histories()
            $task->histories()->delete();
            $task->assignedUsers()->detach();
        });
    }
}
