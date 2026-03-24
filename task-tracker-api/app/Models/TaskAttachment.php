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

    /**
     * İndirme jetonu: sadece id + APP_KEY (created_at kullanılmaz).
     * Eski md5(id.created_at.key) linkleri kayıt anı ile DB okuması arasında
     * tarih formatı/mikrosaniye farkı yüzünden 403/yanlış 500 üretebiliyordu.
     */
    public static function computeDownloadToken(TaskAttachment $attachment): string
    {
        return hash_hmac('sha256', (string) $attachment->id, (string) config('app.key'));
    }

    public function matchesDownloadToken(string $token): bool
    {
        try {
            if (hash_equals(self::computeDownloadToken($this), $token)) {
                return true;
            }
        } catch (\Throwable $e) {
            return false;
        }

        // Geriye dönük: eski md5(id . created_at . key)
        $id = (string) $this->id;
        $key = (string) config('app.key');
        $candidates = [];
        $raw = $this->getRawOriginal('created_at');
        if ($raw !== null && $raw !== '') {
            $candidates[] = (string) $raw;
        }
        $ca = $this->created_at;
        if ($ca instanceof \DateTimeInterface) {
            $candidates[] = $ca->format('Y-m-d H:i:s');
        }
        if ($ca !== null && ! ($ca instanceof \DateTimeInterface)) {
            $candidates[] = (string) $ca;
        }

        $candidates = array_unique(array_filter($candidates, fn ($v) => $v !== ''));
        foreach ($candidates as $c) {
            if (hash_equals(md5($id . $c . $key), $token)) {
                return true;
            }
        }

        return false;
    }

    public function getDownloadUrlAttribute()
    {
        $token = self::computeDownloadToken($this);

        return route('attachments.download', ['attachment' => $this->id, 'token' => $token]);
    }

    // SIGNED URL'yi devre dışı bırak - artık kullanmıyoruz
    public function getSignedUrlAttribute()
    {
        return null; // Signed URL'yi tamamen devre dışı bırak
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
