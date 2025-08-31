<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $notifications = $request->user()->unreadNotifications()
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            return response()->json([
                'notifications' => $notifications,
                'count' => $notifications->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Notification fetch error: ' . $e->getMessage());
            return response()->json([
                'notifications' => [],
                'count' => 0,
                'error' => 'Bildirimler yüklenirken hata oluştu'
            ], 500);
        }
    }
}
