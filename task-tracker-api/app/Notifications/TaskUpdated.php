<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\DatabaseMessage;
use Illuminate\Notifications\Notification;
use App\Models\Task;

class TaskUpdated extends Notification
{
    use Queueable;

    protected $task;
    protected $message;

    public function __construct(Task $task, $message)
    {
        $this->task = $task->replicate();
        $this->message = $message;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->line('Bir görev güncellendi:')
            ->line('Başlık: ' . $this->task->title)
            ->line('Açıklama: ' . $this->task->description)
            ->line('Durum: ' . $this->task->status)
            ->line('Son teslim tarihi: ' . $this->task->due_date)
            ->action('Görevi Görüntüle', url('/tasks/' . $this->task->id))
            ->line('İyi çalışmalar!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }

    public function toDatabase($notifiable)
    {
        return [
            'task_id' => $this->task->id,
            'title' => $this->task->title,
            'message' => $this->message,
            'updated_by' => auth()->user()->name ?? 'Sistem',
        ];
    }
}
