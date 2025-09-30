<?php

namespace App\Http\Controllers;

use App\Models\TaskType;
use App\Models\TaskStatus;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TaskTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $taskTypes = TaskType::with('statuses')->get();
        return response()->json($taskTypes);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:task_types,name',
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/'
        ]);

        $taskType = TaskType::create([
            'name' => $request->name,
            'color' => $request->color,
            'is_system' => false,
            'is_permanent' => false
        ]);

        return response()->json($taskType->load('statuses'), 201);
    }

    public function update(Request $request, TaskType $taskType): JsonResponse
    {
        if ($taskType->is_permanent) {
            return response()->json(['message' => 'Sistem türü düzenlenemez'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255|unique:task_types,name,' . $taskType->id,
            'color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/'
        ]);

        $taskType->update([
            'name' => $request->name,
            'color' => $request->color
        ]);

        return response()->json($taskType->load('statuses'));
    }

    public function destroy(TaskType $taskType): JsonResponse
    {
        if ($taskType->is_permanent) {
            return response()->json(['message' => 'Sistem türü silinemez'], 403);
        }

        $taskType->delete();
        return response()->json(['message' => 'Tür başarıyla silindi']);
    }
}
