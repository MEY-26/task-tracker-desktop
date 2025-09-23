<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PasswordResetRequested extends Notification
{
    use Queueable;

    protected $userName;
    protected $userEmail;
    protected $userId;
    protected $requestId;

    public function __construct($user, $requestId)
    {
        $this->userName = $user->name ?? 'Kullanıcı';
        $this->userEmail = $user->email ?? '';
        $this->userId = $user->id ?? null;
        $this->requestId = $requestId;
    }

    public function via($notifiable)
    {
        // Only database notifications
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Şifre Sıfırlama Talebi',
            'message' => sprintf('Şifre sıfırlama talebi: %s (%s)', $this->userName, $this->userEmail),
            'user_id' => $this->userId,
            'user_email' => $this->userEmail,
            'request_id' => $this->requestId,
            'action' => 'open_user_settings',
            'type' => 'password_reset_request',
        ];
    }
}
