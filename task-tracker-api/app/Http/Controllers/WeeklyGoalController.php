<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\User;

class WeeklyGoalController extends Controller
{
    private function mondayOfWeek(?string $date = null): string
    {
        $tz = 'Europe/Istanbul';
        $c = $date ? Carbon::parse($date, $tz) : Carbon::now($tz);
        // Move to Monday of this week
        return $c->startOfWeek(Carbon::MONDAY)->toDateString();
    }

    private function locksForWeek(string $weekStart): array
    {
        $tz = 'Europe/Istanbul';
        $monday = Carbon::parse($weekStart, $tz)->startOfDay()->addHours(10); // Monday 10:00
        $nextMonday10 = (clone $monday)->addWeek();
        $now = Carbon::now($tz);
        return [
            'targets_locked' => $now->greaterThanOrEqualTo($monday),
            'actuals_locked' => $now->greaterThanOrEqualTo($nextMonday10),
            'monday_10' => $monday->toIso8601String(),
            'next_monday_10' => $nextMonday10->toIso8601String(),
        ];
    }

    private function canAccessUser($requestUser, int $targetUserId): bool
    {
        if (!$requestUser) return false;
        if ($requestUser->id === $targetUserId) return true;
        if ($requestUser->role === 'admin') return true;
        if ($requestUser->role === 'team_leader') {
            $leaderId = User::where('id', $targetUserId)->value('leader_id');
            return $leaderId === $requestUser->id;
        }
        return false;
    }

    public function get(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'week_start' => 'nullable|date',
        ]);
        $auth = $request->user();
        $userId = (int)($request->input('user_id') ?: $auth->id);
        if (!$this->canAccessUser($auth, $userId)) {
            return response()->json(['message' => 'Yetkiniz yok.'], 403);
        }

        $weekStart = $request->input('week_start');
        $weekStart = $this->mondayOfWeek($weekStart);
        $locks = $this->locksForWeek($weekStart);

        $goal = DB::table('weekly_goals')->where('user_id', $userId)->where('week_start', $weekStart)->first();
        if (!$goal) {
            // Observers weekly goals should not be auto-created
            $targetUser = \App\Models\User::find($userId);
            if ($targetUser && $targetUser->role === 'observer') {
                return response()->json([
                    'goal' => null,
                    'items' => [],
                    'locks' => $locks,
                    'summary' => $this->computeSummary([]),
                    'message' => 'Observer kullanıcılar için haftalık hedef oluşturulamaz.'
                ]);
            }
            $id = DB::table('weekly_goals')->insertGetId([
                'user_id' => $userId,
                'week_start' => $weekStart,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $goal = DB::table('weekly_goals')->where('id', $id)->first();
        }
        $items = DB::table('weekly_goal_items')->where('weekly_goal_id', $goal->id)->orderBy('id')->get();

        $summary = $this->computeSummary($items);

        return response()->json([
            'goal' => $goal,
            'items' => $items,
            'locks' => $locks,
            'summary' => $summary,
        ]);
    }

    private function computeSummary($items)
    {
        $planned = collect($items)->where('is_unplanned', false);
        $unplanned = collect($items)->where('is_unplanned', true);

        $totalTarget = (int)$planned->sum('target_minutes');
        // Weight is derived from 2700 baseline (% of week)
        $totalWeight = (float)$planned->sum(function ($it) {
            $t = max(0, (int)$it->target_minutes);
            return round(($t / 2700) * 100, 2);
        });

        $score = 0.0;
        foreach ($planned as $it) {
            $t = max(0, (int)$it->target_minutes);
            $w = max(0.0, (float)$it->weight_percent);
            $a = max(0, (int)$it->actual_minutes);
            if ($t <= 0 || $w <= 0) continue;
            $factor = $a > 0 ? ($t / $a) : 0; // hızlı tamamlanan daha yüksek katsayı
            $score += $w * $factor; // satır katkısı = ağırlık * katsayı
        }

        // Unplanned contribution: proportion of week used
        $unplannedMinutes = (int)$unplanned->sum('actual_minutes');
        $bonus = ($unplannedMinutes / 2700) * 100.0;

        $final = min(120.0, $score + $bonus);

        return [
            'total_target_minutes' => $totalTarget,
            'total_weight_percent' => $totalWeight,
            'unplanned_minutes' => $unplannedMinutes,
            'planned_score' => round($score, 2),
            'unplanned_bonus' => round($bonus, 2),
            'final_score' => round($final, 2),
        ];
    }

    public function leaderboard(Request $request)
    {
        $request->validate([
            'week_start' => 'nullable|date',
            'leader_id' => 'nullable|integer|exists:users,id',
            'user_id' => 'nullable|integer|exists:users,id',
            'search' => 'nullable|string|max:100',
        ]);

        $weekStart = $this->mondayOfWeek($request->input('week_start'));
        $auth = $request->user();

        $usersQuery = DB::table('users')
            ->leftJoin('users as leaders', 'leaders.id', '=', 'users.leader_id')
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'users.role',
                'users.leader_id',
                'leaders.name as leader_name'
            );

        if ($auth->role === 'admin' || $auth->role === 'observer') {
            // full access
        } elseif ($auth->role === 'team_leader') {
            $usersQuery->where(function ($query) use ($auth) {
                $query->where('users.id', $auth->id)
                    ->orWhere('users.leader_id', $auth->id);
            });
        } else {
            $usersQuery->where('users.id', $auth->id);
        }

        if ($request->filled('leader_id')) {
            $leaderId = (int)$request->input('leader_id');

            if ($auth->role === 'team_leader' && $leaderId !== $auth->id) {
                return response()->json(['message' => 'Yetkiniz yok.'], 403);
            }

            $usersQuery->where('users.leader_id', $leaderId);
        }

        if ($request->filled('user_id')) {
            $usersQuery->where('users.id', (int)$request->input('user_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $usersQuery->where(function ($query) use ($search) {
                $like = '%'.$search.'%';
                $query->where('users.name', 'like', $like)
                    ->orWhere('users.email', 'like', $like)
                    ->orWhere('leaders.name', 'like', $like);
            });
        }

        $users = $usersQuery->orderBy('users.name')->get();
        $userIds = $users->pluck('id')->filter()->all();

        $itemsByUser = collect();
        if (!empty($userIds)) {
            $rawItems = DB::table('weekly_goals as wg')
                ->leftJoin('weekly_goal_items as wgi', 'wgi.weekly_goal_id', '=', 'wg.id')
                ->select(
                    'wg.user_id',
                    'wgi.id as item_id',
                    'wgi.target_minutes',
                    'wgi.actual_minutes',
                    'wgi.weight_percent',
                    'wgi.is_unplanned'
                )
                ->where('wg.week_start', $weekStart)
                ->whereIn('wg.user_id', $userIds)
                ->get();

            $itemsByUser = $rawItems
                ->groupBy('user_id')
                ->map(function ($rows) {
                    return $rows
                        ->filter(function ($row) {
                            return $row->item_id !== null;
                        })
                        ->map(function ($row) {
                            return (object) [
                                'target_minutes' => (int)($row->target_minutes ?? 0),
                                'actual_minutes' => (int)($row->actual_minutes ?? 0),
                                'weight_percent' => (float)($row->weight_percent ?? 0),
                                'is_unplanned' => (bool)($row->is_unplanned ?? false),
                            ];
                        });
                });
        }

        $items = $users->map(function ($user) use ($itemsByUser) {
            $userItems = $itemsByUser->get($user->id, collect());
            $summary = $this->computeSummary($userItems);
            $plannedItems = collect($userItems)->where('is_unplanned', false);
            $totalActual = (int)$plannedItems->sum('actual_minutes');
            $totalTarget = max(0, (int)($summary['total_target_minutes'] ?? 0));
            $completionPercent = 0.0;
            if ($totalTarget > 0) {
                $completionPercent = round(min(120, ($totalActual / $totalTarget) * 100), 2);
            }

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'leader_id' => $user->leader_id,
                'leader_name' => $user->leader_name,
                'total_target_minutes' => $summary['total_target_minutes'] ?? 0,
                'total_actual_minutes' => $totalActual,
                'unplanned_minutes' => $summary['unplanned_minutes'] ?? 0,
                'final_score' => $summary['final_score'] ?? 0,
                'planned_score' => $summary['planned_score'] ?? 0,
                'unplanned_bonus' => $summary['unplanned_bonus'] ?? 0,
                'completion_percent' => $completionPercent,
            ];
        })->values();

        return response()->json([
            'week_start' => $weekStart,
            'items' => $items,
        ]);
    }

    public function save(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'week_start' => 'nullable|date',
            'items' => 'required|array',
            'items.*.id' => 'nullable|integer',
            'items.*.title' => 'required|string|max:255',
            'items.*.action_plan' => 'nullable|string',
            'items.*.target_minutes' => 'nullable|integer|min:0',
            'items.*.weight_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.actual_minutes' => 'nullable|integer|min:0',
            'items.*.is_unplanned' => 'boolean',
            'items.*.description' => 'nullable|string',
        ]);

        $auth = $request->user();
        $userId = (int)($request->input('user_id') ?: $auth->id);
        if (!$this->canAccessUser($auth, $userId)) {
            return response()->json(['message' => 'Yetkiniz yok.'], 403);
        }
        $weekStart = $this->mondayOfWeek($request->input('week_start'));
        $locks = $this->locksForWeek($weekStart);

        $goal = DB::table('weekly_goals')->where('user_id', $userId)->where('week_start', $weekStart)->first();
        if (!$goal) {
            $id = DB::table('weekly_goals')->insertGetId([
                'user_id' => $userId,
                'week_start' => $weekStart,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $goal = DB::table('weekly_goals')->where('id', $id)->first();
        }

        $items = $request->input('items', []);

        // Validate totals for planned
        $planned = collect($items)->where('is_unplanned', false);
        $totalTarget = (int)$planned->sum(function ($x) { return max(0, (int)($x['target_minutes'] ?? 0)); });
        $totalWeight = (float)$planned->sum(function ($x) {
            $t = max(0, (int)($x['target_minutes'] ?? 0));
            return round(($t / 2700) * 100, 2);
        });
        if ($totalTarget > 2700) {
            return response()->json(['message' => 'Haftalık hedef toplamı 2700 dakikayı aşamaz.'], 422);
        }
        if ($totalWeight > 100.0 + 0.001) {
            return response()->json(['message' => "Hedef ağırlık toplamı %100'ü aşamaz."], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($items as $it) {
                $isUnplanned = (bool)($it['is_unplanned'] ?? false);
                $data = [
                    'weekly_goal_id' => $goal->id,
                    'title' => $it['title'],
                    'action_plan' => $it['action_plan'] ?? null,
                    'description' => $it['description'] ?? null,
                    'updated_at' => now(),
                ];

                if (!$isUnplanned && !$locks['targets_locked']) {
                    $data['target_minutes'] = (int)($it['target_minutes'] ?? 0);
                    $data['weight_percent'] = round((($data['target_minutes'] ?? 0) / 2700) * 100, 2);
                }
                if (!$locks['actuals_locked']) {
                    $data['actual_minutes'] = (int)($it['actual_minutes'] ?? 0);
                }
                $data['is_unplanned'] = $isUnplanned;

                if (!empty($it['id'])) {
                    DB::table('weekly_goal_items')->where('id', (int)$it['id'])->where('weekly_goal_id', $goal->id)->update($data);
                } else {
                    $data['created_at'] = now();
                    DB::table('weekly_goal_items')->insert($data);
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Weekly goals save error: '.$e->getMessage());
            return response()->json(['message' => 'Kaydedilemedi.'], 500);
        }

        $fresh = DB::table('weekly_goal_items')->where('weekly_goal_id', $goal->id)->orderBy('id')->get();
        return response()->json([
            'goal' => $goal,
            'items' => $fresh,
            'locks' => $locks,
            'summary' => $this->computeSummary($fresh),
            'message' => 'Kaydedildi'
        ]);
    }
}

