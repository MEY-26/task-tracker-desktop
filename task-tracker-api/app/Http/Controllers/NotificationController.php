<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            // Sadece okunmamış bildirimleri döndür
            'notifications' => $request->user()->unreadNotifications,
        ]);
    }
}
