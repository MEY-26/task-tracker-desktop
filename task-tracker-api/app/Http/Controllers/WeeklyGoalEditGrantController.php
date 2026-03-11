<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WeeklyGoalEditGrantController extends Controller
{
    private function mondayOfWeek(?string $date = null): string
    {
        $tz = 'Europe/Istanbul';
        $c = $date ? Carbon::parse($date, $tz) : Carbon::now($tz);
        return $c->startOfWeek(Carbon::MONDAY)->toDateString();
    }

    /**
     * List edit grants (admin only - can filter by user_id)
     */
    public function index(Request $request)
    {
        $auth = $request->user();
        if ($auth->role !== 'admin') {
            return response()->json(['message' => 'Yetkiniz yok.'], 403);
        }

        $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $query = DB::table('weekly_goal_edit_grants')
            ->join('users', 'weekly_goal_edit_grants.user_id', '=', 'users.id')
            ->where('weekly_goal_edit_grants.expires_at', '>', Carbon::now('Europe/Istanbul'));

        if ($request->filled('user_id')) {
            $query->where('weekly_goal_edit_grants.user_id', $request->user_id);
        }

        $items = $query
            ->select(
                'weekly_goal_edit_grants.id',
                'weekly_goal_edit_grants.user_id',
                'weekly_goal_edit_grants.week_start',
                'weekly_goal_edit_grants.expires_at',
                'weekly_goal_edit_grants.granted_by',
                'users.name as user_name',
                'users.email as user_email'
            )
            ->orderBy('weekly_goal_edit_grants.expires_at', 'desc')
            ->get();

        return response()->json(['items' => $items]);
    }

    /**
     * Create edit grants for selected users (admin only)
     */
    public function store(Request $request)
    {
        $auth = $request->user();
        if ($auth->role !== 'admin') {
            return response()->json(['message' => 'Yetkiniz yok.'], 403);
        }

        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
            'week_start' => 'required|date',
            'duration_hours' => 'required|integer|min:1|max:168',
        ]);

        $weekStart = $this->mondayOfWeek($request->input('week_start'));
        $durationHours = (int) $request->input('duration_hours');
        $expiresAt = Carbon::now('Europe/Istanbul')->addHours($durationHours);

        $created = [];

        foreach ($request->input('user_ids') as $userId) {
            $userId = (int) $userId;
            $existing = DB::table('weekly_goal_edit_grants')
                ->where('user_id', $userId)
                ->where('week_start', $weekStart)
                ->first();

            if ($existing) {
                DB::table('weekly_goal_edit_grants')
                    ->where('id', $existing->id)
                    ->update([
                        'expires_at' => $expiresAt,
                        'granted_by' => $auth->id,
                        'updated_at' => now(),
                    ]);
            } else {
                DB::table('weekly_goal_edit_grants')->insert([
                    'user_id' => $userId,
                    'week_start' => $weekStart,
                    'expires_at' => $expiresAt,
                    'granted_by' => $auth->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $created[] = $userId;
        }

        return response()->json([
            'message' => count($created) . ' kullanıcıya özel düzenleme izni verildi.',
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    /**
     * Delete an edit grant (admin only)
     */
    public function destroy(Request $request, $id)
    {
        $auth = $request->user();
        if ($auth->role !== 'admin') {
            return response()->json(['message' => 'Yetkiniz yok.'], 403);
        }

        $deleted = DB::table('weekly_goal_edit_grants')->where('id', $id)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'İzin kaydı bulunamadı.'], 404);
        }

        return response()->json(['message' => 'İzin kaldırıldı.']);
    }
}
