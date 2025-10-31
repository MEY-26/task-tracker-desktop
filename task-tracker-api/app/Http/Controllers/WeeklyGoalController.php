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

    private function weekCapacity(int $leaveMinutes, int $overtimeMinutes = 0): int
    {
        $leave = $this->normalizeLeaveMinutes($leaveMinutes);
        $overtime = max(0, (int)$overtimeMinutes);
        return max(0, self::WEEKLY_BASE_MINUTES - $leave + $overtime);
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
                    'summary' => $this->computeSummary([], 0, 0),
                    'message' => 'Observer kullanıcılar için haftalık hedef oluşturulamaz.'
                ]);
            }
            $id = DB::table('weekly_goals')->insertGetId([
                'user_id' => $userId,
                'week_start' => $weekStart,
                'leave_minutes' => 0,
                'overtime_minutes' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $goal = DB::table('weekly_goals')->where('id', $id)->first();
        }

        if (!isset($goal->leave_minutes)) {
            $goal->leave_minutes = 0;
        }
        if (!isset($goal->overtime_minutes)) {
            $goal->overtime_minutes = 0;
        }

        $items = DB::table('weekly_goal_items')->where('weekly_goal_id', $goal->id)->orderBy('id')->get();

        $summary = $this->computeSummary($items, (int)($goal->leave_minutes ?? 0), (int)($goal->overtime_minutes ?? 0));

        return response()->json([
            'goal' => $goal,
            'items' => $items,
            'locks' => $locks,
            'summary' => $summary,
        ]);
    }

    private function computeSummary($items, int $leaveMinutes = 0, int $overtimeMinutes = 0)
    {
        $collection = collect($items);
        $planned = $collection->where('is_unplanned', false);
        $unplanned = $collection->where('is_unplanned', true);

        $leaveMinutes = $this->normalizeLeaveMinutes($leaveMinutes);
        $overtimeMinutes = max(0, (int)$overtimeMinutes);
        $availableMinutes = $this->weekCapacity($leaveMinutes, $overtimeMinutes);

        // Toplam hedef ve ağırlık
        $totalTarget = (int)$planned->sum(function ($it) {
            return max(0, (int)($it->target_minutes ?? 0));
        });

        $totalWeightRaw = $availableMinutes > 0
            ? (($totalTarget / $availableMinutes) * 100.0)
            : 0.0;
        $totalWeight = min(100.0, $totalWeightRaw);

        // Plandışı dakika toplamı
        $unplannedMinutes = (int)$unplanned->sum(function ($it) {
            return max(0, (int)($it->actual_minutes ?? 0));
        });

        // Planlı gerçekleşen toplam
        $plannedActual = (int)$planned->sum(function ($it) {
            return max(0, (int)($it->actual_minutes ?? 0));
        });

        // Toplam eksik süre (sadece tamamlanmamış ve a < t olanlar)
        $totalShortfall = (int)$planned->sum(function ($it) {
            $t = max(0, (int)($it->target_minutes ?? 0));
            $a = max(0, (int)($it->actual_minutes ?? 0));
            $isCompleted = (bool)($it->is_completed ?? false);
            if (!$isCompleted && $a < $t) {
                return $t - $a;
            }
            return 0;
        });

        // Plandışı affı: eksikleri kapatmak için kullanılabilir, fazlası bonus olur
        $unplannedForgiveness = min($unplannedMinutes, $totalShortfall);

        // Toplam eksik (Def) ve affetme (F) hesaplama
        $Pg = 0;
        $deficits = [];
        foreach ($planned as $it) {
            $t = max(0, (int)($it->target_minutes ?? 0));
            $a = max(0, (int)($it->actual_minutes ?? 0));
            $isCompleted = (bool)($it->is_completed ?? false);
            $Pg += $isCompleted ? $t : min($a, $t);
            $def = $isCompleted ? 0 : max(0, $t - $a);
            $deficits[] = $def;
        }
        $Def = max(0, $availableMinutes - $Pg);
        $F = min($unplannedMinutes, $Def);
        $D = $Def - $F;

        $W = $plannedActual + $unplannedMinutes;
        $L = max(0, $availableMinutes - $W);
        $unfinishedCount = $planned->filter(function ($it) {
            return !(bool)($it->is_completed ?? false);
        })->count();

        // Planlı skor hesaplama (frontend ile aynı mantık)
        $plannedScore = 0.0;
        $incompleteCapPenaltyRaw = 0.0;
        if ($availableMinutes > 0) {
            foreach ($planned as $it) {
                $t = max(0, (int)($it->target_minutes ?? 0));
                if ($t <= 0) {
                    continue;
                }
                $a = max(0, (int)($it->actual_minutes ?? 0));
                $w = ($t / $availableMinutes) * 100.0;
                $isCompleted = (bool)($it->is_completed ?? false);

                if ($isCompleted) {
                    // Tamamlanmış: hız bonusu uygulanır (2x tavan)
                    $efficiency = $a > 0 ? min(2.0, ($t / $a)) : 0.0;
                    $plannedScore += $w * $efficiency;
                } else {
                    // Tamamlanmamış: gerçek süre oranına göre hesaplanır
                    if ($a < $t) {
                        $eff = min(1.0, $a / $t);
                        $plannedScore += $w * $eff;
                    } else {
                        // Hedefe ulaşmış ama tamamlanmamış: sabit tavan
                        $effCap = max(0, min(1.0, 1.0 - 0.10)); // 90% tavan
                        $plannedScore += $w * $effCap;
                        $incompleteCapPenaltyRaw += $w * (1.0 - $effCap);
                    }
                }
            }
        }

        // Plandışı skor (frontend ile aynı mantık)
        $unplannedScore = 0.0;
        if ($F > 1e-6) {
            // Plandışı süre planlı eksikliği karşılıyor → karşılanan eksiklik oranı kadar skor ekle
            $unplannedScore = ($F / $availableMinutes) * 100.0;
        } elseif ($unfinishedCount === 0 && ($unplannedMinutes - $F) > 1e-6) {
            // Tüm planlılar tamamlandı ve fazladan plandışı süre var → bonus olarak ekle
            $U_extra = max(0, $unplannedMinutes - $F);
            $unplannedScore = ($U_extra / $availableMinutes) * 100.0;
        }

        // Bonus (hız/tasarruf bonusu)
        $bonusB = 0.0;
        if ($unfinishedCount === 0 && abs($D) < 1e-6) {
            $saved = 0.0;
            foreach ($planned as $idx => $it) {
                if ((bool)($it->is_completed ?? false)) {
                    $t = max(0, (int)($it->target_minutes ?? 0));
                    $a = max(0, (int)($it->actual_minutes ?? 0));
                    $saved += max(0, $t - $a);
                }
            }
            $s = $availableMinutes > 0 ? ($saved / $availableMinutes) : 0.0;
            $U_extra = max(0, $unplannedMinutes - $F);
            $e = $availableMinutes > 0 ? ($U_extra / $availableMinutes) : 0.0;
            $bonusB = min(0.20, (0.10 * $s) + (0.25 * $e)); // B_max = 0.20
        }

        // Cezalar
        $penaltyP1 = 0.0;
        if ($D > 1e-6) {
            $penaltyP1 = ($W >= $availableMinutes ? 0.50 : 0.75) * ($D / $availableMinutes); // kappa veya lambda_
        }
        $penaltyEASA = ($unfinishedCount > 0 && $L > 0) ? (2.5 * ($L / $availableMinutes)) : 0.0; // mu = 2.5

        // Mesai bonusu (1.5x çarpan ile)
        $T_cap = self::WEEKLY_BASE_MINUTES;
        $T_overtime_used = max(0, min($overtimeMinutes, $W - $T_cap));
        $overtimeBonus = $T_overtime_used > 0 ? (($T_overtime_used / $T_cap) * 1.5) : 0.0;

        // Final skor (frontend ile aynı formül)
        // Frontend'de PlanlyScore ve UnplannedScore 0-1 arası normalize edilmiş değerler
        // Burada yüzde olarak hesapladık, normalize edelim
        $plannedScoreNormalized = $plannedScore / 100.0;
        $unplannedScoreNormalized = $unplannedScore / 100.0;
        $scoreRaw = $plannedScoreNormalized + $unplannedScoreNormalized + $bonusB + $overtimeBonus - $penaltyP1 - $penaltyEASA;
        $final = min(130.0, max(0.0, $scoreRaw * 100.0)); // scoreCap = 130

        return [
            'total_target_minutes' => $totalTarget,
            'total_weight_percent' => round($totalWeight, 2),
            'unplanned_minutes' => $unplannedMinutes,
            'planned_score' => round($plannedScore, 2),
            'unplanned_bonus' => round($unplannedScore, 2),
            'final_score' => round($final, 2),
            'available_minutes' => $availableMinutes,
            'leave_minutes' => $leaveMinutes,
            'overtime_minutes' => $overtimeMinutes,
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
                    'wg.overtime_minutes',
                    'wgi.id as item_id',
                    'wgi.target_minutes',
                    'wgi.actual_minutes',
                    'wgi.weight_percent',
                    'wgi.is_unplanned',
                    'wgi.is_completed'
                )
                ->where('wg.week_start', $weekStart)
                ->whereIn('wg.user_id', $userIds)
                ->get();

            $itemsByUser = $rawItems
                ->groupBy('user_id')
                ->map(function ($rows) {
                    $leave = (int)($rows->first()->leave_minutes ?? 0);
                    $overtime = (int)($rows->first()->overtime_minutes ?? 0);
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
                                'is_completed' => (bool)($row->is_completed ?? false),
                            ];
                        })
                        ->values();

                    return (object) [
                        'leave_minutes' => $leave,
                        'overtime_minutes' => $overtime,
                        'items' => $items,
                    ];
                });
        }

        $items = $users->map(function ($user) use ($itemsByUser) {
            $userData = $itemsByUser->get($user->id, (object) [
                'leave_minutes' => 0,
                'overtime_minutes' => 0,
                'items' => collect(),
            ]);

            $leaveMinutes = (int)($userData->leave_minutes ?? 0);
            $overtimeMinutes = (int)($userData->overtime_minutes ?? 0);
            $userItems = $userData->items instanceof \Illuminate\Support\Collection
                ? $userData->items
                : collect($userData->items ?? []);

            $summary = $this->computeSummary($userItems, $leaveMinutes, $overtimeMinutes);
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
                'available_minutes' => $summary['available_minutes'] ?? $this->weekCapacity($leaveMinutes, $overtimeMinutes),
                'leave_minutes' => $summary['leave_minutes'] ?? $leaveMinutes,
                'overtime_minutes' => $summary['overtime_minutes'] ?? $overtimeMinutes,
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
            'overtime_minutes' => 'nullable|integer|min:0',
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
                'overtime_minutes' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $goal = DB::table('weekly_goals')->where('id', $id)->first();
        }

        $requestedLeave = $this->normalizeLeaveMinutes($request->input('leave_minutes'));
        $existingLeave = $this->normalizeLeaveMinutes($goal->leave_minutes ?? 0);
        $requestedOvertime = max(0, (int)($request->input('overtime_minutes') ?? 0));
        $existingOvertime = max(0, (int)($goal->overtime_minutes ?? 0));
        $canEditTargets = !$locks['targets_locked'] || $auth->role === 'admin';
        $leaveMinutes = $canEditTargets ? $requestedLeave : $existingLeave;
        $overtimeMinutes = $canEditTargets ? $requestedOvertime : $existingOvertime;
        $capacity = $this->weekCapacity($leaveMinutes, $overtimeMinutes);

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

        // Admin için kapasite kontrollerini bypass et
        if ($auth->role !== 'admin') {
            if ($totalTarget > $capacity) {
                return response()->json(['message' => 'Haftalık hedef toplamı izin sonrası kullanılabilir süreyi aşamaz.'], 422);
            }
            if ($capacity > 0 && $totalWeight > 100.0 + 0.001) {
                return response()->json(['message' => "Hedef ağırlık toplamı %100'ü aşamaz."], 422);
            }
            if ($capacity === 0 && $totalTarget > 0) {
                return response()->json(['message' => 'İzin süresi bu hafta için planlı hedef bırakmıyor.'], 422);
            }
        }

        DB::beginTransaction();
        try {
            $submittedIds = []; // Gönderilen item ID'lerini takip et
            
            foreach ($items as $it) {
                $isUnplanned = (bool)($it['is_unplanned'] ?? false);
                $data = [
                    'weekly_goal_id' => $goal->id,
                    'title' => $it['title'],
                    'action_plan' => $it['action_plan'] ?? null,
                    'description' => $it['description'] ?? null,
                    'updated_at' => now(),
                    'is_unplanned' => $isUnplanned,
                    'is_completed' => (bool)($it['is_completed'] ?? false),
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
                    $submittedIds[] = (int)$it['id'];
                } else {
                    $data['created_at'] = now();
                    $insertedId = DB::table('weekly_goal_items')->insertGetId($data);
                    $submittedIds[] = $insertedId;
                }
            }
            
            // Gönderilmeyen (silinen) items'ları veritabanından kaldır
            if (!empty($submittedIds)) {
                DB::table('weekly_goal_items')
                    ->where('weekly_goal_id', $goal->id)
                    ->whereNotIn('id', $submittedIds)
                    ->delete();
            } else {
                // Hiç item gönderilmemişse hepsini sil
                DB::table('weekly_goal_items')
                    ->where('weekly_goal_id', $goal->id)
                    ->delete();
            }

            if ($canEditTargets) {
                DB::table('weekly_goals')
                    ->where('id', $goal->id)
                    ->update([
                        'leave_minutes' => $leaveMinutes,
                        'overtime_minutes' => $overtimeMinutes,
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
            'summary' => $this->computeSummary($fresh, (int)($goal->leave_minutes ?? 0), (int)($goal->overtime_minutes ?? 0)),
            'message' => 'Kaydedildi'
        ]);
    }
}
