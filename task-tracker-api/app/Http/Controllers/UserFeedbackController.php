<?php

namespace App\Http\Controllers;

use App\Models\UserFeedback;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserFeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Sadece admin geri bildirimleri görebilir
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $type = $request->query('type');
        $query = UserFeedback::with(['user', 'responder'])->orderBy('created_at', 'desc');

        if ($type && $type !== 'all') {
            $query->where('type', $type);
        }

        $feedback = $query->get()->map(function ($item) {
            return [
                'id' => $item->id,
                'user' => [
                    'id' => $item->user->id,
                    'name' => $item->user->name,
                    'email' => $item->user->email
                ],
                'type' => $item->type,
                'subject' => $item->subject,
                'message' => $item->message,
                'status' => $item->status,
                'admin_response' => $item->admin_response,
                'responded_by' => $item->responder ? [
                    'id' => $item->responder->id,
                    'name' => $item->responder->name
                ] : null,
                'responded_at' => $item->responded_at?->toISOString(),
                'created_at' => $item->created_at->toISOString(),
                'updated_at' => $item->updated_at->toISOString()
            ];
        });

        return response()->json(['feedback' => $feedback]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'type' => 'required|in:request,bug,suggestion,other',
            'subject' => 'required|string|max:255',
            'message' => 'required|string'
        ]);

        $feedback = UserFeedback::create([
            'user_id' => $user->id,
            'type' => $validated['type'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'status' => 'pending'
        ]);

        return response()->json($feedback->load('user'), 201);
    }

    public function update(Request $request, UserFeedback $userFeedback): JsonResponse
    {
        $user = $request->user();

        // Sadece admin geri bildirimi güncelleyebilir
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:pending,in_progress,resolved,rejected',
            'admin_response' => 'nullable|string'
        ]);

        $updateData = $validated;
        
        // Eğer status değişiyorsa, responded_by ve responded_at'i güncelle
        if (isset($validated['status']) && $validated['status'] !== $userFeedback->status) {
            $updateData['responded_by'] = $user->id;
            $updateData['responded_at'] = now();
        }

        $userFeedback->update($updateData);

        return response()->json($userFeedback->load(['user', 'responder']));
    }

    public function destroy(Request $request, UserFeedback $userFeedback): JsonResponse
    {
        $user = $request->user();

        // Sadece admin geri bildirimi silebilir
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $userFeedback->delete();

        return response()->json(['message' => 'Geri bildirim başarıyla silindi.']);
    }
}

