<?php

namespace App\Http\Controllers;

use App\Models\TaskStatus;
use App\Models\TaskType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TaskStatusController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $taskTypeId = $request->query('task_type_id');
        
        if ($taskTypeId) {
            $statuses = TaskStatus::where('task_type_id', $taskTypeId)->get();
        } else {
            $statuses = TaskStatus::with('taskType')->get();
        }

        return response()->json($statuses);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'task_type_id' => 'required|exists:task_types,id',
            'name' => 'required|string|max:255',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/'
        ]);

        // Aynı task type için aynı isimde status olup olmadığını kontrol et
        $existingStatus = TaskStatus::where('task_type_id', $request->task_type_id)
            ->where('name', $request->name)
            ->first();

        if ($existingStatus) {
            return response()->json(['message' => 'Bu tür için aynı isimde durum zaten mevcut'], 422);
        }

        $taskStatus = TaskStatus::create([
            'task_type_id' => $request->task_type_id,
            'name' => $request->name,
            'color' => $request->color,
            'is_system' => false,
            'is_default' => false
        ]);

        return response()->json($taskStatus, 201);
    }

    public function update(Request $request, TaskStatus $taskStatus): JsonResponse
    {
        if ($taskStatus->is_system) {
            return response()->json(['message' => 'Sistem durumu düzenlenemez'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/'
        ]);

        // Aynı task type için aynı isimde başka status olup olmadığını kontrol et
        $existingStatus = TaskStatus::where('task_type_id', $taskStatus->task_type_id)
            ->where('name', $request->name)
            ->where('id', '!=', $taskStatus->id)
            ->first();

        if ($existingStatus) {
            return response()->json(['message' => 'Bu tür için aynı isimde durum zaten mevcut'], 422);
        }

        $taskStatus->update([
            'name' => $request->name,
            'color' => $request->color
        ]);

        return response()->json($taskStatus);
    }

    public function destroy(TaskStatus $taskStatus): JsonResponse
    {
        if ($taskStatus->is_system) {
            return response()->json(['message' => 'Sistem durumu silinemez'], 403);
        }

        $taskStatus->delete();
        return response()->json(['message' => 'Durum başarıyla silindi']);
    }
}
