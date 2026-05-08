<?php

namespace App\Http\Controllers;

use App\Helpers\TurkishHolidayPresets;
use App\Helpers\WorkingCalendarHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CalendarOverrideController extends Controller
{
    public function presetsTurkish(Request $request)
    {
        $auth = $request->user();
        if (! $auth || $auth->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
        ]);
        $items = TurkishHolidayPresets::forYear((int) $request->input('year'));

        return response()->json(['items' => $items]);
    }

    public function index(Request $request)
    {
        $auth = $request->user();
        if (! $auth) {
            return response()->json(['message' => 'Yetkisiz.'], 401);
        }

        $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ]);

        $from = $request->input('from');
        $to = $request->input('to');

        $q = DB::table('calendar_overrides')
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->orderBy('id');

        $rows = $q->get();

        if ($auth->role === 'admin') {
            return response()->json(['items' => $rows]);
        }

        $visible = $rows->filter(function ($row) use ($auth) {
            return WorkingCalendarHelper::rowVisibleToUser($row, $auth);
        })->values();

        return response()->json(['items' => $visible]);
    }

    /**
     * Authenticated user's effective working minutes per date (0 = no work that day).
     * Used by the leave calendar to allow selection only on real workdays (including calendar overrides).
     */
    public function effectiveDayMinutes(Request $request)
    {
        $auth = $request->user();
        if (! $auth) {
            return response()->json(['message' => 'Yetkisiz.'], 401);
        }

        $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ]);

        $from = $request->input('from');
        $to = $request->input('to');

        WorkingCalendarHelper::preloadOverridesForRange($from, $to);

        $minutesByDay = [];
        $c = Carbon::parse($from, 'Europe/Istanbul')->startOfDay();
        $end = Carbon::parse($to, 'Europe/Istanbul')->startOfDay();
        while ($c->lte($end)) {
            $d = $c->toDateString();
            $minutesByDay[$d] = WorkingCalendarHelper::dayMinutes((int) $auth->id, $d);
            $c->addDay();
        }

        WorkingCalendarHelper::clearRequestCache();

        return response()->json(['minutes_by_day' => $minutesByDay]);
    }

    public function store(Request $request)
    {
        $auth = $request->user();
        if (! $auth || $auth->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'dates' => 'required|array|min:1',
            'dates.*' => 'date',
            'type' => ['required', Rule::in([WorkingCalendarHelper::TYPE_NON_WORKING, WorkingCalendarHelper::TYPE_WORKING, WorkingCalendarHelper::TYPE_CUSTOM])],
            'scope' => ['required', Rule::in([WorkingCalendarHelper::SCOPE_GLOBAL, WorkingCalendarHelper::SCOPE_DEPARTMENT, WorkingCalendarHelper::SCOPE_TEAM, WorkingCalendarHelper::SCOPE_USER])],
            'targets' => 'nullable|array',
            'targets.departments' => 'nullable|array',
            'targets.departments.*' => 'string|max:100',
            'targets.leaders' => 'nullable|array',
            'targets.leaders.*' => 'integer|exists:users,id',
            'targets.user_ids' => 'nullable|array',
            'targets.user_ids.*' => 'integer|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'full_day_minutes' => 'nullable|integer|min:0|max:1440',
            'work_start' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'work_end' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'breaks' => 'nullable|array',
            'breaks.*' => 'array|size:2',
            'breaks.*.*' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'source' => 'nullable|in:preset,manual',
        ]);

        $scope = $validated['scope'];
        $targets = $validated['targets'] ?? null;
        if ($scope !== WorkingCalendarHelper::SCOPE_GLOBAL) {
            if (! is_array($targets)) {
                return response()->json(['message' => 'Hedef (targets) bu kapsam için zorunludur.'], 422);
            }
            if ($scope === WorkingCalendarHelper::SCOPE_USER && empty($targets['user_ids'])) {
                return response()->json(['message' => 'En az bir kullanıcı seçin.'], 422);
            }
            if ($scope === WorkingCalendarHelper::SCOPE_DEPARTMENT && empty($targets['departments'])) {
                return response()->json(['message' => 'En az bir departman seçin.'], 422);
            }
            if ($scope === WorkingCalendarHelper::SCOPE_TEAM && empty($targets['leaders'])) {
                return response()->json(['message' => 'En az bir takım lideri seçin.'], 422);
            }
        } else {
            $targets = null;
        }

        $type = $validated['type'];
        if ($type === WorkingCalendarHelper::TYPE_CUSTOM) {
            $hasMinutes = isset($validated['full_day_minutes']) && $validated['full_day_minutes'] !== null;
            $hasTimes = ! empty($validated['work_start']) && ! empty($validated['work_end']);
            if (! $hasMinutes && ! $hasTimes) {
                return response()->json(['message' => 'Özel gün için başlangıç ve bitiş saati girin veya tam gün dakikasını girin.'], 422);
            }
        }

        $now = now();
        $created = [];
        foreach ($validated['dates'] as $date) {
            $id = DB::table('calendar_overrides')->insertGetId([
                'date' => $date,
                'type' => $type,
                'full_day_minutes' => $validated['full_day_minutes'] ?? null,
                'work_start' => $validated['work_start'] ?? null,
                'work_end' => $validated['work_end'] ?? null,
                'breaks' => isset($validated['breaks']) ? json_encode($validated['breaks']) : null,
                'scope' => $scope,
                'targets' => $targets ? json_encode($targets) : null,
                'source' => $validated['source'] ?? 'manual',
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'created_by' => $auth->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $created[] = $id;
        }

        WorkingCalendarHelper::clearRequestCache();

        return response()->json([
            'message' => 'Kaydedildi',
            'ids' => $created,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $auth = $request->user();
        if (! $auth || $auth->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }

        $row = DB::table('calendar_overrides')->where('id', $id)->first();
        if (! $row) {
            return response()->json(['message' => 'Kayıt bulunamadı.'], 404);
        }

        $validated = $request->validate([
            'date' => 'sometimes|date',
            'type' => ['sometimes', Rule::in([WorkingCalendarHelper::TYPE_NON_WORKING, WorkingCalendarHelper::TYPE_WORKING, WorkingCalendarHelper::TYPE_CUSTOM])],
            'scope' => ['sometimes', Rule::in([WorkingCalendarHelper::SCOPE_GLOBAL, WorkingCalendarHelper::SCOPE_DEPARTMENT, WorkingCalendarHelper::SCOPE_TEAM, WorkingCalendarHelper::SCOPE_USER])],
            'targets' => 'nullable|array',
            'targets.departments' => 'nullable|array',
            'targets.departments.*' => 'string|max:100',
            'targets.leaders' => 'nullable|array',
            'targets.leaders.*' => 'integer|exists:users,id',
            'targets.user_ids' => 'nullable|array',
            'targets.user_ids.*' => 'integer|exists:users,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'full_day_minutes' => 'nullable|integer|min:0|max:1440',
            'work_start' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'work_end' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'breaks' => 'nullable|array',
            'breaks.*' => 'array|size:2',
            'breaks.*.*' => 'nullable|string|regex:/^\d{1,2}:\d{2}$/',
            'source' => 'nullable|in:preset,manual',
        ]);

        $scope = $validated['scope'] ?? $row->scope;
        $targets = array_key_exists('targets', $validated) ? $validated['targets'] : json_decode($row->targets ?? 'null', true);

        if ($scope !== WorkingCalendarHelper::SCOPE_GLOBAL) {
            if (! is_array($targets)) {
                return response()->json(['message' => 'Hedef (targets) bu kapsam için zorunludur.'], 422);
            }
            if ($scope === WorkingCalendarHelper::SCOPE_USER && empty($targets['user_ids'])) {
                return response()->json(['message' => 'En az bir kullanıcı seçin.'], 422);
            }
            if ($scope === WorkingCalendarHelper::SCOPE_DEPARTMENT && empty($targets['departments'])) {
                return response()->json(['message' => 'En az bir departman seçin.'], 422);
            }
            if ($scope === WorkingCalendarHelper::SCOPE_TEAM && empty($targets['leaders'])) {
                return response()->json(['message' => 'En az bir takım lideri seçin.'], 422);
            }
        } else {
            $targets = null;
        }

        $type = $validated['type'] ?? $row->type;
        if ($type === WorkingCalendarHelper::TYPE_CUSTOM) {
            $ws = $validated['work_start'] ?? $row->work_start;
            $we = $validated['work_end'] ?? $row->work_end;
            $fd = array_key_exists('full_day_minutes', $validated) ? $validated['full_day_minutes'] : $row->full_day_minutes;
            $hasMinutes = $fd !== null && $fd !== '';
            $hasTimes = ! empty($ws) && ! empty($we);
            if (! $hasMinutes && ! $hasTimes) {
                return response()->json(['message' => 'Özel gün için saat veya tam gün dakikası girin.'], 422);
            }
        }

        $update = [];
        foreach (['date', 'type', 'title', 'description', 'full_day_minutes', 'work_start', 'work_end', 'source'] as $f) {
            if (array_key_exists($f, $validated)) {
                $update[$f] = $validated[$f];
            }
        }
        if (array_key_exists('scope', $validated)) {
            $update['scope'] = $validated['scope'];
        }
        if (array_key_exists('targets', $validated) || array_key_exists('scope', $validated)) {
            $update['targets'] = $targets ? json_encode($targets) : null;
        }
        if (array_key_exists('breaks', $validated)) {
            $update['breaks'] = $validated['breaks'] !== null ? json_encode($validated['breaks']) : null;
        }
        $update['updated_at'] = now();

        DB::table('calendar_overrides')->where('id', $id)->update($update);
        WorkingCalendarHelper::clearRequestCache();

        return response()->json(['message' => 'Güncellendi']);
    }

    public function destroy(Request $request, int $id)
    {
        $auth = $request->user();
        if (! $auth || $auth->role !== 'admin') {
            return response()->json(['message' => 'Bu işlem için yetkiniz yok.'], 403);
        }
        DB::table('calendar_overrides')->where('id', $id)->delete();
        WorkingCalendarHelper::clearRequestCache();

        return response()->json(['message' => 'Silindi']);
    }
}
