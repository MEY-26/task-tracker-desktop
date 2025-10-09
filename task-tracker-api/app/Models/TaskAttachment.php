<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskAttachment extends Model
{
    protected $fillable = [
        'original_name',
        'path',
        'task_id',
    ];

    protected $appends = ['url', 'download_url'];

    public function getUrlAttribute()
    {
        // storage:link ile public/storage -> storage/app/public bağlandıysa bu çalışır
        return asset('storage/' . ltrim($this->path, '/'));
    }

    public function getDownloadUrlAttribute()
    {
        // Kalıcı token tabanlı indirme URL'si - ZAMAN SINIRI YOK!
        // Dosya silinmediği sürece süresiz erişim
        $token = md5($this->id . $this->created_at . config('app.key'));
        return route('attachments.download', ['attachment' => $this->id, 'token' => $token]);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
