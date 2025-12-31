<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $announcements = Announcement::with('creator')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($announcement) use ($user) {
                $isRead = $announcement->isReadByUser($user->id);
                return [
                    'id' => $announcement->id,
                    'title' => $announcement->title,
                    'message' => $announcement->message,
                    'priority' => $announcement->priority,
                    'created_at' => $announcement->created_at->toISOString(),
                    'created_by' => $announcement->creator->name ?? 'Sistem',
                    'is_read' => $isRead
                ];
            });

        return response()->json(['announcements' => $announcements]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Sadece admin duyuru oluşturabilir
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'required|in:low,normal,high,urgent'
        ]);

        $announcement = Announcement::create([
            'title' => $validated['title'],
            'message' => $validated['message'],
            'priority' => $validated['priority'],
            'created_by' => $user->id
        ]);

        // Tüm kullanıcılara duyuruyu ekle
        $users = \App\Models\User::pluck('id');
        $announcement->users()->attach($users, ['is_read' => false]);

        return response()->json($announcement->load('creator'), 201);
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        // Sadece admin duyuru güncelleyebilir
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'required|in:low,normal,high,urgent'
        ]);

        $announcement->update($validated);

        return response()->json($announcement->load('creator'));
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        // Sadece admin duyuru silebilir
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $announcement->delete();

        return response()->json(['message' => 'Duyuru başarıyla silindi.']);
    }

    public function markAsRead(Request $request, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        // Kullanıcının bu duyuruyu okundu olarak işaretle
        DB::table('announcement_user')
            ->where('announcement_id', $announcement->id)
            ->where('user_id', $user->id)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json(['message' => 'Duyuru okundu olarak işaretlendi.']);
    }
}

