<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskHistory extends Model
{
    protected $fillable = [
        'task_id',
        'user_id',
        'field',
        'old_value',
        'new_value',
    ];
    // App\Models\TaskHistory.php

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
