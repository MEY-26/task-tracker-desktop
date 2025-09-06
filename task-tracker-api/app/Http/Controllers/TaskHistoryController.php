<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\TaskHistory;

class TaskHistoryController extends Controller
{
    public function index(Task $task)
    {
        $user = request()->user();
        if ($user->role !== 'admin' && $user->role !== 'observer') {
            if (
                $user->id !== $task->created_by &&
                $user->id !== $task->responsible_id &&
                !$task->assignedUsers->contains('id', $user->id)
            ) {
                return response()->json(['message' => 'Bu görevin geçmişine erişim yetkiniz yok.'], 403);
            }
        }
    
        $history = $task->histories()
            ->with(['user:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();
    
        return response()->json(['history' => $history]);
    }

    public function destroy(Task $task, TaskHistory $history)
    {
        $user = request()->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        if ($history->task_id !== $task->id) {
            return response()->json(['message' => 'Kayıt bu göreve ait değil.'], 404);
        }
        if ($history->field !== 'comment') {
            return response()->json(['message' => 'Yalnızca yorum kayıtları silinebilir.'], 422);
        }

        $history->delete();
        return response()->json(['message' => 'Yorum silindi.']);
    }
    
}
