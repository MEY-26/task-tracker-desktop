<?php

namespace App\Mail;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Task $task,
        public string $type,
        public User $user,
        public string $message
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Görev Bildirimi - ' . $this->task->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.task-notification',
            with: [
                'task' => $this->task,
                'type' => $this->type,
                'user' => $this->user,
                'message' => $this->message,
            ]
        );
    }
}
