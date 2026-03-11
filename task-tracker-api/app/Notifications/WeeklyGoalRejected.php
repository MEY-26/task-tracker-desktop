<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WeeklyGoalRejected extends Notification
{
    use Queueable;

    protected string $weekStart;
    protected ?string $note;

    public function __construct(string $weekStart, ?string $note = null)
    {
        $this->weekStart = $weekStart;
        $this->note = $note;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Haftalık Hedef Reddedildi',
            'message' => $this->note
                ? "Haftalık hedefiniz reddedildi. Not: {$this->note}"
                : 'Haftalık hedefiniz reddedildi.',
            'week_start' => $this->weekStart,
            'action' => 'open_weekly_goals',
            'type' => 'weekly_goal_rejected',
        ];
    }
}
