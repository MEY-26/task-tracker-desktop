<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\User;

class WeeklyGoalController extends Controller
{
    private const WEEKLY_BASE_MINUTES = 2700;

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

    private function normalizeLeaveMinutes($value): int
    {
        $leave = max(0, (int)($value ?? 0));
        return (int) min(self::WEEKLY_BASE_MINUTES, $leave);
    }

    private function weekCapacity(int $leaveMinutes): int
    {
        $leave = $this->normalizeLeaveMinutes($leaveMinutes);
        return max(0, self::WEEKLY_BASE_MINUTES - $leave);
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
                    'summary' => $this->computeSummary([], 0),
                    'message' => 'Observer kullanıcılar için haftalık hedef oluşturulamaz.'
                ]);
            }
            $id = DB::table('weekly_goals')->insertGetId([
                'user_id' => $userId,
                'week_start' => $weekStart,
                'leave_minutes' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $goal = DB::table('weekly_goals')->where('id', $id)->first();
        }

        if (!isset($goal->leave_minutes)) {
            $goal->leave_minutes = 0;
        }

        $items = DB::table('weekly_goal_items')->where('weekly_goal_id', $goal->id)->orderBy('id')->get();

        $summary = $this->computeSummary($items, (int)($goal->leave_minutes ?? 0));

        return response()->json([
            'goal' => $goal,
            'items' => $items,
            'locks' => $locks,
            'summary' => $summary,
        ]);
    }

    private function computeSummary($items, int $leaveMinutes = 0)
    {
        $collection = collect($items);
        $planned = $collection->where('is_unplanned', false);
        $unplanned = $collection->where('is_unplanned', true);

        $leaveMinutes = $this->normalizeLeaveMinutes($leaveMinutes);
        $capacity = $this->weekCapacity($leaveMinutes);

        $totalTarget = (int)$planned->sum(function ($it) {
            return max(0, (int)$it->target_minutes);
        });

        $totalWeight = $capacity > 0
            ? (float)$planned->sum(function ($it) use ($capacity) {
                $t = max(0, (int)$it->target_minutes);
                return ($t / $capacity) * 100;
            })
            : 0.0;

        $score = 0.0;
        foreach ($planned as $it) {
            $t = max(0, (int)$it->target_minutes);
            $a = max(0, (int)$it->actual_minutes);
            if ($t <= 0 || $capacity <= 0) {
                continue;
            }
            $w = ($t / $capacity) * 100;
            if ($w <= 0) {
                continue;
            }
            $factor = $a > 0 ? ($t / $a) : 0.0;
            $score += $w * $factor;
        }

        $unplannedMinutes = (int)$unplanned->sum(function ($it) {
            return max(0, (int)$it->actual_minutes);
        });
        $bonus = $capacity > 0 ? ($unplannedMinutes / $capacity) * 100.0 : 0.0;
        $final = min(120.0, $score + $bonus);

        return [
            'total_target_minutes' => $totalTarget,
            'total_weight_percent' => round($totalWeight, 2),
            'unplanned_minutes' => $unplannedMinutes,
            'planned_score' => round($score, 2),
            'unplanned_bonus' => round($bonus, 2),
            'final_score' => round($final, 2),
            'available_minutes' => $capacity,
            'leave_minutes' => $leaveMinutes,
        ];
    }

    public function leaderboard(Request $request)
    {
        $request->validate([
            'week_start' => 'nullable|date',
            'leader_id' => 'nullable|integer|exists:users,id',
            'search' => 'nullable|string'
        ]);

        $auth = $request->user();
        if (!$auth) {
            return response()->json(['message' => 'Yetkilendirme başarısız.'], 401);
        }

        $weekStart = $this->mondayOfWeek($request->input('week_start'));
        $leaderId = $request->input('leader_id');

        $usersQuery = User::query()
            ->select('users.*', 'leaders.name as leader_name')
            ->leftJoin('users as leaders', 'leaders.id', '=', 'users.leader_id');

        if ($auth->role === 'team_leader') {
            $usersQuery->where(function ($query) use ($auth) {
                $query->where('users.id', $auth->id)
                    ->orWhere('users.leader_id', $auth->id);
            });
        } elseif ($auth->role !== 'admin') {
            $usersQuery->where('users.id', $auth->id);
        }

        if ($leaderId) {
            $usersQuery->where('users.leader_id', $leaderId);
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
                    'wg.leave_minutes',
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
                    $leave = (int)($rows->first()->leave_minutes ?? 0);
                    $items = $rows
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
                        })
                        ->values();

                    return (object) [
                        'leave_minutes' => $leave,
                        'items' => $items,
                    ];
                });
        }

        $items = $users->map(function ($user) use ($itemsByUser) {
            $userData = $itemsByUser->get($user->id, (object) [
                'leave_minutes' => 0,
                'items' => collect(),
            ]);

            $leaveMinutes = (int)($userData->leave_minutes ?? 0);
            $userItems = $userData->items instanceof \Illuminate\Support\Collection
                ? $userData->items
                : collect($userData->items ?? []);

            $summary = $this->computeSummary($userItems, $leaveMinutes);
            $plannedItems = $userItems->where('is_unplanned', false);
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
                'available_minutes' => $summary['available_minutes'] ?? $this->weekCapacity($leaveMinutes),
                'leave_minutes' => $summary['leave_minutes'] ?? $leaveMinutes,
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
            'leave_minutes' => 'nullable|integer|min:0|max:'.self::WEEKLY_BASE_MINUTES,
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
                'leave_minutes' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $goal = DB::table('weekly_goals')->where('id', $id)->first();
        }

        $requestedLeave = $this->normalizeLeaveMinutes($request->input('leave_minutes'));
        $existingLeave = $this->normalizeLeaveMinutes($goal->leave_minutes ?? 0);
        $canEditTargets = !$locks['targets_locked'] || $auth->role === 'admin';
        $leaveMinutes = $canEditTargets ? $requestedLeave : $existingLeave;
        $capacity = $this->weekCapacity($leaveMinutes);

        $items = $request->input('items', []);

        // Validate totals for planned
        $planned = collect($items)->where('is_unplanned', false);
        $totalTarget = (int)$planned->sum(function ($x) {
            return max(0, (int)($x['target_minutes'] ?? 0));
        });
        $totalWeight = $capacity > 0
            ? (float)$planned->sum(function ($x) use ($capacity) {
                $t = max(0, (int)($x['target_minutes'] ?? 0));
                return ($t / $capacity) * 100;
            })
            : 0.0;

        if ($totalTarget > $capacity) {
            return response()->json(['message' => 'Haftalık hedef toplamı izin sonrası kullanılabilir süreyi aşamaz.'], 422);
        }
        if ($capacity > 0 && $totalWeight > 100.0 + 0.001) {
            return response()->json(['message' => "Hedef ağırlık toplamı %100'ü aşamaz."], 422);
        }
        if ($capacity === 0 && $totalTarget > 0) {
            return response()->json(['message' => 'İzin süresi bu hafta için planlı hedef bırakmıyor.'], 422);
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
                    'is_unplanned' => $isUnplanned,
                ];

                // Admin kullanıcılar kilitleme kurallarını bypass edebilir
                $isAdmin = $auth->role === 'admin';

                if (!$isUnplanned && ($canEditTargets || $isAdmin)) {
                    $data['target_minutes'] = (int)($it['target_minutes'] ?? 0);
                    $data['weight_percent'] = $capacity > 0
                        ? round((($data['target_minutes'] ?? 0) / $capacity) * 100, 2)
                        : 0;
                }
                if (!$locks['actuals_locked'] || $isAdmin) {
                    $data['actual_minutes'] = (int)($it['actual_minutes'] ?? 0);
                }

                if (!empty($it['id'])) {
                    DB::table('weekly_goal_items')
                        ->where('id', (int)$it['id'])
                        ->where('weekly_goal_id', $goal->id)
                        ->update($data);
                } else {
                    $data['created_at'] = now();
                    DB::table('weekly_goal_items')->insert($data);
                }
            }

            if ($canEditTargets) {
                DB::table('weekly_goals')
                    ->where('id', $goal->id)
                    ->update([
                        'leave_minutes' => $leaveMinutes,
                        'updated_at' => now(),
                    ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Weekly goals save error: '.$e->getMessage());
            return response()->json(['message' => 'Kaydedilemedi.'], 500);
        }

        $fresh = DB::table('weekly_goal_items')->where('weekly_goal_id', $goal->id)->orderBy('id')->get();
        $goal = DB::table('weekly_goals')->where('id', $goal->id)->first();

        return response()->json([
            'goal' => $goal,
            'items' => $fresh,
            'locks' => $locks,
            'summary' => $this->computeSummary($fresh, (int)($goal->leave_minutes ?? 0)),
            'message' => 'Kaydedildi'
        ]);
    }
}
