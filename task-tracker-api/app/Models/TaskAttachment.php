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
        if (hash_equals(self::computeDownloadToken($this), $token)) {
            return true;
        }

        // Geriye dönük: eski md5(id . created_at . key) — olası created_at string varyantları
        $id = (string) $this->id;
        $key = (string) config('app.key');
        $candidates = array_unique(array_filter([
            $this->getRawOriginal('created_at'),
            $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
            $this->created_at ? (string) $this->created_at : null,
        ], fn ($v) => $v !== null && $v !== ''));

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
