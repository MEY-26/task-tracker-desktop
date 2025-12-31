<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'message',
        'priority',
        'created_by'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_user')
            ->withPivot('is_read', 'read_at')
            ->withTimestamps();
    }

    public function isReadByUser($userId): bool
    {
        return $this->users()
            ->where('user_id', $userId)
            ->where('is_read', true)
            ->exists();
    }
}

