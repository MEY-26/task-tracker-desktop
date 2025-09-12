<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\TaskHistory;
use App\Models\User;

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

        // Convert IDs to names for readability (assigned_users, responsible_id)
        $allIds = collect();
        foreach ($history as $h) {
            if ($h->field === 'assigned_users') {
                foreach (['old_value', 'new_value'] as $key) {
                    $raw = $h->{$key};
                    if (!$raw) continue;
                    try {
                        $arr = is_array($raw) ? $raw : json_decode($raw, true);
                        if (is_array($arr)) {
                            foreach ($arr as $v) {
                                if (is_numeric($v)) $allIds->push((int)$v);
                            }
                        }
                    } catch (\Throwable $e) {
                        // ignore
                    }
                }
            } elseif ($h->field === 'responsible_id') {
                foreach (['old_value', 'new_value'] as $key) {
                    $v = $h->{$key};
                    if ($v !== null && $v !== '' && is_numeric($v)) {
                        $allIds->push((int)$v);
                    }
                }
            }
        }
        $idMap = $allIds->unique()->values()->count() > 0
            ? User::whereIn('id', $allIds->unique()->values())->pluck('name', 'id')
            : collect();

        foreach ($history as $h) {
            if ($h->field === 'assigned_users') {
                foreach (['old_value', 'new_value'] as $key) {
                    $raw = $h->{$key};
                    if ($raw === null || $raw === '') continue;
                    try {
                        $arr = is_array($raw) ? $raw : json_decode($raw, true);
                        if (!is_array($arr)) continue;
                        $names = array_map(function ($v) use ($idMap) {
                            if (is_numeric($v)) {
                                $name = $idMap[(int)$v] ?? null;
                                return $name ?: (string)$v;
                            }
                            return (string)$v;
                        }, $arr);
                        $h->{$key} = json_encode($names);
                    } catch (\Throwable $e) {
                        // ignore
                    }
                }
            } elseif ($h->field === 'responsible_id') {
                foreach (['old_value', 'new_value'] as $key) {
                    $v = $h->{$key};
                    if ($v === null || $v === '') continue;
                    if (is_numeric($v)) {
                        $name = $idMap[(int)$v] ?? (string)$v;
                        $h->{$key} = $name;
                    }
                }
            }
        }
    
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
