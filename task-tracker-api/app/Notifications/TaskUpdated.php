<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Task;

class TaskUpdated extends Notification
{
    use Queueable;

    protected $task;
    protected $message;

    public function __construct(Task $task, string $message)
    {
        $this->task = $task;
        $this->message = $message;
    }

    public function via($notifiable)
    {
        // Only database channel is used
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Görev Bildirimi',
            'message' => $this->message,
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'action' => 'open_task',
            'type' => 'task_updated',
        ];
    }
}

