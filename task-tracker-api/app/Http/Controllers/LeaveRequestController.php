<?php

namespace App\Http\Controllers;

use App\Helpers\SystemSettingsHelper;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeaveRequestController extends Controller
{
    private const WEEKLY_BASE_MINUTES = 2700;
    private const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    private function mondayOfWeek(?string $date = null): string
    {
        $tz = 'Europe/Istanbul';
        $c = $date ? Carbon::parse($date, $tz) : Carbon::now($tz);
        return $c->startOfWeek(Carbon::MONDAY)->toDateString();
    }

    /**
     * Calculate leave minutes for a single day, subtracting break overlaps.
     * $dayOfWeek: 1=Monday, 2=Tuesday, ..., 5=Friday
     */
    private function calculateLeaveMinutesForDay(int $dayOfWeek, ?string $start, ?string $end): int
    {
        $workStart = SystemSettingsHelper::workStart();
        $workEnd = SystemSettingsHelper::workEnd();
        $fullDayMinutes = SystemSettingsHelper::fullDayMinutes();
        $isFriday = ($dayOfWeek === 5);
        $breaks = $isFriday ? SystemSettingsHelper::breaksFriday() : SystemSettingsHelper::breaksDefault();

        $startTime = $start ?? $workStart;
        $endTime = $end ?? $workEnd;

        if ($startTime === $workStart && $endTime === $workEnd) {
            return $fullDayMinutes;
        }

        $leaveStartMinutes = $this->timeToMinutes($startTime);
        $leaveEndMinutes = $this->timeToMinutes($endTime);
        $rawMinutes = max(0, $leaveEndMinutes - $leaveStartMinutes);

        $breakOverlapMinutes = 0;
        foreach ($breaks as [$bStart, $bEnd]) {
            $bStartM = $this->timeToMinutes($bStart);
            $bEndM = $this->timeToMinutes($bEnd);
            $overlapStart = max($leaveStartMinutes, $bStartM);
            $overlapEnd = min($leaveEndMinutes, $bEndM);
            if ($overlapStart < $overlapEnd) {
                $breakOverlapMinutes += ($overlapEnd - $overlapStart);
            }
        }

        return max(0, $rawMinutes - $breakOverlapMinutes);
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        $h = (int)($parts[0] ?? 0);
        $m = (int)($parts[1] ?? 0);
        return $h * 60 + $m;
    }

    /**
     * List leave requests for the authenticated user.
     * Admin: optional user_ids (comma-separated or array) to list selected users' records (İzin Yönetimi).
     */
    public function index(Request $request)
    {
        $request->validate([
            'week_start' => 'nullable|date',
            'user_ids' => 'nullable',
        ]);

        $auth = $request->user();

        $query = DB::table('leave_requests as lr')
            ->join('users as u', 'u.id', '=', 'lr.user_id')
            ->select('lr.*', 'u.name as user_name', 'u.email as user_email');

        if ($auth->role === 'admin' && $request->filled('user_ids')) {
            $raw = $request->input('user_ids');
            $ids = is_array($raw)
                ? array_values(array_filter(array_map('intval', $raw)))
                : array_values(array_filter(array_map('intval', explode(',', (string) $raw))));
            if (!empty($ids)) {
                $query->whereIn('lr.user_id', $ids);
            } else {
                $query->where('lr.user_id', $auth->id);
            }
        } else {
            $query->where('lr.user_id', $auth->id);
        }

        if ($request->filled('week_start')) {
            $weekStart = $this->mondayOfWeek($request->input('week_start'));
            $query->where('lr.week_start', $weekStart);
        }

        $items = $query->orderBy('lr.week_start', 'desc')->orderBy('u.name')->get();

        return response()->json(['items' => $items]);
    }

    /**
     * Create or update a leave request
     */
    public function store(Request $request)
    {
        $rules = [
            'week_start' => 'required|date',
            'monday' => 'boolean',
            'tuesday' => 'boolean',
            'wednesday' => 'boolean',
            'thursday' => 'boolean',
            'friday' => 'boolean',
        ];
        foreach (self::WEEKDAY_KEYS as $key) {
            $rules[$key . '_start'] = 'nullable|string|regex:/^\d{1,2}:\d{2}$/';
            $rules[$key . '_end'] = 'nullable|string|regex:/^\d{1,2}:\d{2}$/';
        }
        $request->validate($rules);

        $auth = $request->user();
        $weekStart = $this->mondayOfWeek($request->input('week_start'));

        if ($auth->role === 'team_member') {
            $thisWeek = $this->mondayOfWeek();
            if ($weekStart < $thisWeek) {
                return response()->json(['message' => 'Takım üyeleri sadece ileriye yönelik izin girebilir.'], 422);
            }
        }

        $data = [
            'user_id' => $auth->id,
            'week_start' => $weekStart,
            'monday' => (bool)($request->input('monday') ?? false),
            'tuesday' => (bool)($request->input('tuesday') ?? false),
            'wednesday' => (bool)($request->input('wednesday') ?? false),
            'thursday' => (bool)($request->input('thursday') ?? false),
            'friday' => (bool)($request->input('friday') ?? false),
            'updated_at' => now(),
        ];

        foreach (self::WEEKDAY_KEYS as $key) {
            $data[$key . '_start'] = $request->input($key . '_start');
            $data[$key . '_end'] = $request->input($key . '_end');
        }

        $existing = DB::table('leave_requests')
            ->where('user_id', $auth->id)
            ->where('week_start', $weekStart)
            ->first();

        if ($existing) {
            DB::table('leave_requests')
                ->where('id', $existing->id)
                ->update($data);
            $item = DB::table('leave_requests')->where('id', $existing->id)->first();
        } else {
            $data['created_at'] = now();
            $id = DB::table('leave_requests')->insertGetId($data);
            $item = DB::table('leave_requests')->where('id', $id)->first();
        }

        $this->syncWeeklyGoalLeaveMinutes($auth->id, $weekStart, $item);

        return response()->json(['item' => $item, 'message' => 'Kaydedildi']);
    }

    /**
     * Delete a leave request (whole week row). Admin may delete any user's row.
     */
    public function destroy(Request $request, $id)
    {
        $auth = $request->user();
        $item = DB::table('leave_requests')->where('id', $id)->first();

        if (!$item) {
            return response()->json(['message' => 'İzin kaydı bulunamadı.'], 404);
        }

        $isOwner = (int) $item->user_id === (int) $auth->id;
        if (!$isOwner && $auth->role !== 'admin') {
            return response()->json(['message' => 'İzin kaydı bulunamadı.'], 404);
        }

        $userId = (int) $item->user_id;
        $weekStart = $item->week_start;
        DB::table('leave_requests')->where('id', $id)->delete();
        $this->syncWeeklyGoalLeaveMinutes($userId, $weekStart, null);

        return response()->json(['message' => 'Silindi']);
    }

    /**
     * Clear a single weekday from a leave row (admin or row owner). Recalculates weekly goal leave minutes.
     */
    public function clearWeekday(Request $request, $id)
    {
        $request->validate([
            'weekday' => 'required|string|in:monday,tuesday,wednesday,thursday,friday',
        ]);

        $auth = $request->user();
        $item = DB::table('leave_requests')->where('id', $id)->first();

        if (!$item) {
            return response()->json(['message' => 'İzin kaydı bulunamadı.'], 404);
        }

        $isOwner = (int) $item->user_id === (int) $auth->id;
        if (!$isOwner && $auth->role !== 'admin') {
            return response()->json(['message' => 'Yetkiniz yok.'], 403);
        }

        $key = $request->input('weekday');
        $update = [
            $key => false,
            $key.'_start' => null,
            $key.'_end' => null,
            'updated_at' => now(),
        ];

        DB::table('leave_requests')->where('id', $id)->update($update);
        $fresh = DB::table('leave_requests')->where('id', $id)->first();

        $hasAny = false;
        foreach (self::WEEKDAY_KEYS as $k) {
            if ($fresh && ($fresh->{$k} ?? false)) {
                $hasAny = true;
                break;
            }
        }

        $userId = (int) $item->user_id;
        $weekStart = $item->week_start;

        if (!$hasAny) {
            DB::table('leave_requests')->where('id', $id)->delete();
            $this->syncWeeklyGoalLeaveMinutes($userId, $weekStart, null);
        } else {
            $this->syncWeeklyGoalLeaveMinutes($userId, $weekStart, $fresh);
        }

        return response()->json(['message' => 'Gün kaldırıldı.']);
    }

    private function syncWeeklyGoalLeaveMinutes(int $userId, string $weekStart, $leaveRequest): void
    {
        $leaveMinutes = 0;
        if ($leaveRequest) {
            $dayIndex = 1;
            foreach (self::WEEKDAY_KEYS as $key) {
                if ($leaveRequest->{$key}) {
                    $start = $leaveRequest->{$key . '_start'} ?? null;
                    $end = $leaveRequest->{$key . '_end'} ?? null;
                    $leaveMinutes += $this->calculateLeaveMinutesForDay($dayIndex, $start, $end);
                }
                $dayIndex++;
            }
            $leaveMinutes = min(self::WEEKLY_BASE_MINUTES, $leaveMinutes);
        }

        $goal = DB::table('weekly_goals')->where('user_id', $userId)->where('week_start', $weekStart)->first();
        if ($goal) {
            DB::table('weekly_goals')->where('id', $goal->id)->update([
                'leave_minutes' => $leaveMinutes,
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Bulk create leave for users (admin only). Used for public holidays or selected users.
     * Accepts: dates (array of date strings or array of {date, start?, end?}), user_ids (optional)
     */
    public function bulkStore(Request $request)
    {
        $auth = $request->user();
        if (!$auth || $auth->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $request->validate([
            'dates' => 'required|array',
            'dates.*' => function ($attr, $val, $fail) {
                if (is_string($val)) {
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                        $fail('Geçersiz tarih formatı.');
                    }
                } elseif (is_array($val)) {
                    if (empty($val['date']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $val['date'])) {
                        $fail('Geçersiz tarih formatı.');
                    }
                } else {
                    $fail('Geçersiz tarih formatı.');
                }
            },
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $datesInput = $request->input('dates');
        $userIdsInput = $request->input('user_ids');

        $datesWithTimes = [];
        foreach ($datesInput as $item) {
            if (is_string($item)) {
                $datesWithTimes[] = ['date' => $item, 'start' => null, 'end' => null];
            } else {
                $datesWithTimes[] = [
                    'date' => $item['date'],
                    'start' => $item['start'] ?? null,
                    'end' => $item['end'] ?? null,
                ];
            }
        }

        $workingDays = SystemSettingsHelper::workingDays();
        $allowedDays = array_values(array_intersect([1, 2, 3, 4, 5], $workingDays));
        $weekdayFilter = fn ($d) => in_array(Carbon::parse($d['date'])->dayOfWeekIso, $allowedDays ?: [1, 2, 3, 4, 5], true);
        $datesWithTimes = array_values(array_filter($datesWithTimes, $weekdayFilter));
        $seen = [];
        $datesWithTimes = array_values(array_filter($datesWithTimes, function ($d) use (&$seen) {
            if (isset($seen[$d['date']])) return false;
            $seen[$d['date']] = true;
            return true;
        }));

        if (empty($datesWithTimes)) {
            return response()->json(['message' => 'En az bir hafta içi tarihi seçin.'], 422);
        }

        $usersQuery = User::where('role', '!=', 'observer');
        if (!empty($userIdsInput)) {
            $usersQuery->whereIn('id', $userIdsInput);
        }
        $users = $usersQuery->pluck('id');

        $weeksProcessed = [];
        foreach ($datesWithTimes as $item) {
            $dateStr = $item['date'];
            $weekStart = $this->mondayOfWeek($dateStr);
            $dayOfWeek = Carbon::parse($dateStr)->dayOfWeekIso;
            $key = $weekStart;
            if (!isset($weeksProcessed[$key])) {
                $weeksProcessed[$key] = [
                    'monday' => ['active' => false, 'start' => null, 'end' => null],
                    'tuesday' => ['active' => false, 'start' => null, 'end' => null],
                    'wednesday' => ['active' => false, 'start' => null, 'end' => null],
                    'thursday' => ['active' => false, 'start' => null, 'end' => null],
                    'friday' => ['active' => false, 'start' => null, 'end' => null],
                ];
            }
            $dayKey = self::WEEKDAY_KEYS[$dayOfWeek - 1];
            $weeksProcessed[$key][$dayKey] = [
                'active' => true,
                'start' => $item['start'],
                'end' => $item['end'],
            ];
        }

        foreach ($users as $userId) {
            foreach ($weeksProcessed as $weekStart => $dayData) {
                $existing = DB::table('leave_requests')
                    ->where('user_id', $userId)
                    ->where('week_start', $weekStart)
                    ->first();

                $mergeFlags = [];
                $mergeStarts = [];
                $mergeEnds = [];
                foreach (self::WEEKDAY_KEYS as $key) {
                    $dayInfo = $dayData[$key];
                    $existingActive = (bool)($existing->{$key} ?? false);
                    $newActive = $dayInfo['active'];
                    $mergeFlags[$key] = $existingActive || $newActive;
                    if ($newActive) {
                        $mergeStarts[$key] = $dayInfo['start'];
                        $mergeEnds[$key] = $dayInfo['end'];
                    } else {
                        $mergeStarts[$key] = $existing->{$key . '_start'} ?? null;
                        $mergeEnds[$key] = $existing->{$key . '_end'} ?? null;
                    }
                }

                $data = [
                    'user_id' => $userId,
                    'week_start' => $weekStart,
                    'monday' => $mergeFlags['monday'],
                    'tuesday' => $mergeFlags['tuesday'],
                    'wednesday' => $mergeFlags['wednesday'],
                    'thursday' => $mergeFlags['thursday'],
                    'friday' => $mergeFlags['friday'],
                    'monday_start' => $mergeStarts['monday'],
                    'monday_end' => $mergeEnds['monday'],
                    'tuesday_start' => $mergeStarts['tuesday'],
                    'tuesday_end' => $mergeEnds['tuesday'],
                    'wednesday_start' => $mergeStarts['wednesday'],
                    'wednesday_end' => $mergeEnds['wednesday'],
                    'thursday_start' => $mergeStarts['thursday'],
                    'thursday_end' => $mergeEnds['thursday'],
                    'friday_start' => $mergeStarts['friday'],
                    'friday_end' => $mergeEnds['friday'],
                    'updated_at' => now(),
                ];

                if ($existing) {
                    DB::table('leave_requests')->where('id', $existing->id)->update($data);
                    $leaveRequest = DB::table('leave_requests')->where('id', $existing->id)->first();
                } else {
                    $data['created_at'] = now();
                    $id = DB::table('leave_requests')->insertGetId($data);
                    $leaveRequest = DB::table('leave_requests')->where('id', $id)->first();
                }

                $this->syncWeeklyGoalLeaveMinutes($userId, $weekStart, $leaveRequest);
            }
        }

        return response()->json([
            'message' => 'Toplu izin kaydedildi.',
            'users_count' => $users->count(),
            'dates_count' => count($datesWithTimes),
        ]);
    }

}
