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

    protected $appends = ['url', 'signed_url'];

    public function getUrlAttribute()
    {
        // storage:link ile public/storage -> storage/app/public bağlandıysa bu çalışır
        return asset('storage/' . ltrim($this->path, '/'));
    }

    public function getSignedUrlAttribute()
    {
        // 1 saat geçerli imzalı link
        return \Illuminate\Support\Facades\URL::signedRoute('attachments.show', ['attachment' => $this->id], now()->addHour());
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
