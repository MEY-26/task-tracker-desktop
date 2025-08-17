<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'notifications' => $request->user()->notifications,
            // veya sadece okunmamışlar: $request->user()->unreadNotifications
        ]);
    }
}
