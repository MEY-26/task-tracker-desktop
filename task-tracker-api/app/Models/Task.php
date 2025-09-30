<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'priority',
        'status',
        'task_type',
        'task_type_color',
        'task_type_text',
        'status_color',
        'status_text',
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
            // Tüm ekleri ve dosyaları sil
            foreach ($task->attachments as $attachment) {
                try {
                    // Fiziksel dosyayı sil
                    if (Storage::disk('public')->exists($attachment->path)) {
                        Storage::disk('public')->delete($attachment->path);
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to delete attachment file in model: ' . $e->getMessage(), [
                        'attachment_id' => $attachment->id,
                        'file_path' => $attachment->path
                    ]);
                }
                
                // Veritabanı kaydını sil
                $attachment->delete();
            }
            
            // Görev geçmişini sil
            $task->histories()->delete();
            
            // Atanan kullanıcı ilişkilerini temizle
            $task->assignedUsers()->detach();
        });
    }
}
