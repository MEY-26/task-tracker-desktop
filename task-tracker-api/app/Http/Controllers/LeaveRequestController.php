<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeaveRequestController extends Controller
{
    private const WEEKLY_BASE_MINUTES = 2700;

    private function mondayOfWeek(?string $date = null): string
    {
        $tz = 'Europe/Istanbul';
        $c = $date ? Carbon::parse($date, $tz) : Carbon::now($tz);
        return $c->startOfWeek(Carbon::MONDAY)->toDateString();
    }

    /**
     * List leave requests for the authenticated user
     */
    public function index(Request $request)
    {
        $request->validate([
            'week_start' => 'nullable|date',
        ]);

        $auth = $request->user();
        $query = DB::table('leave_requests')->where('user_id', $auth->id);

        if ($request->filled('week_start')) {
            $weekStart = $this->mondayOfWeek($request->input('week_start'));
            $query->where('week_start', $weekStart);
        }

        $items = $query->orderBy('week_start', 'desc')->get();

        return response()->json(['items' => $items]);
    }

    /**
     * Create or update a leave request
     */
    public function store(Request $request)
    {
        $request->validate([
            'week_start' => 'required|date',
            'monday' => 'boolean',
            'tuesday' => 'boolean',
            'wednesday' => 'boolean',
            'thursday' => 'boolean',
            'friday' => 'boolean',
        ]);

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
     * Delete a leave request
     */
    public function destroy(Request $request, $id)
    {
        $auth = $request->user();
        $item = DB::table('leave_requests')->where('id', $id)->where('user_id', $auth->id)->first();

        if (!$item) {
            return response()->json(['message' => 'İzin kaydı bulunamadı.'], 404);
        }

        DB::table('leave_requests')->where('id', $id)->delete();
        return response()->json(['message' => 'Silindi']);
    }

    private function syncWeeklyGoalLeaveMinutes(int $userId, string $weekStart, $leaveRequest): void
    {
        $minutesPerDay = (int)(self::WEEKLY_BASE_MINUTES / 5);
        $leaveMinutes = 0;
        if ($leaveRequest) {
            $days = 0;
            if ($leaveRequest->monday) $days++;
            if ($leaveRequest->tuesday) $days++;
            if ($leaveRequest->wednesday) $days++;
            if ($leaveRequest->thursday) $days++;
            if ($leaveRequest->friday) $days++;
            $leaveMinutes = min(self::WEEKLY_BASE_MINUTES, $days * $minutesPerDay);
        }

        $goal = DB::table('weekly_goals')->where('user_id', $userId)->where('week_start', $weekStart)->first();
        if ($goal) {
            DB::table('weekly_goals')->where('id', $goal->id)->update([
                'leave_minutes' => $leaveMinutes,
                'updated_at' => now(),
            ]);
        }
    }

}
