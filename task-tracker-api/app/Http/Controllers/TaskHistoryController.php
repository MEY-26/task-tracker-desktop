<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\TaskHistory;

class TaskHistoryController extends Controller
{
    public function index(Task $task)
    {
        $user = auth()->user();
    
        // Erişim kontrolü
        if (
            $user->id !== $task->created_by &&
            $user->id !== $task->responsible_id &&
            !$task->assignedUsers->contains($user->id)
        ) {
            return response()->json(['message' => 'Bu görevin geçmişine erişim yetkiniz yok.'], 403);
        }
    
        $history = $task->histories()->orderBy('created_at', 'desc')->get();
    
        return response()->json(['history' => $history]);
    }
    
}
