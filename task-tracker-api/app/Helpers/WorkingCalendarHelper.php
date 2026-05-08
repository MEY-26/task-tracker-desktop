<?php

namespace App\Helpers;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class WorkingCalendarHelper
{
    public const SCOPE_GLOBAL = 'global';

    public const SCOPE_DEPARTMENT = 'department';

    public const SCOPE_TEAM = 'team';

    public const SCOPE_USER = 'user';

    public const TYPE_NON_WORKING = 'non_working';

    public const TYPE_WORKING = 'working';

    public const TYPE_CUSTOM = 'custom';

    /** @var array<string, list<object>>|null */
    private static ?array $overridesByDate = null;

    public static function clearRequestCache(): void
    {
        self::$overridesByDate = null;
    }

    private static function scopeRank(string $scope): int
    {
        return match ($scope) {
            self::SCOPE_USER => 4,
            self::SCOPE_TEAM => 3,
            self::SCOPE_DEPARTMENT => 2,
            default => 1,
        };
    }

    private static function isoWeekday(Carbon $date): int
    {
        $d = $date->dayOfWeek;

        return $d === 0 ? 7 : $d;
    }

    public static function preloadOverridesForRange(string $fromDate, string $toDate): void
    {
        $rows = DB::table('calendar_overrides')
            ->whereBetween('date', [$fromDate, $toDate])
            ->orderBy('id')
            ->get();

        self::$overridesByDate = [];
        foreach ($rows as $row) {
            $d = (string) $row->date;
            if (! isset(self::$overridesByDate[$d])) {
                self::$overridesByDate[$d] = [];
            }
            self::$overridesByDate[$d][] = $row;
        }
    }

    /**
     * @return list<object>
     */
    private static function overridesForDate(string $date): array
    {
        if (self::$overridesByDate !== null) {
            return self::$overridesByDate[$date] ?? [];
        }

        return DB::table('calendar_overrides')->where('date', $date)->orderBy('id')->get()->all();
    }

    public static function appliesToRow(object $row, User $user): bool
    {
        $scope = (string) ($row->scope ?? '');
        $targets = json_decode($row->targets ?? 'null', true);
        if (! is_array($targets)) {
            $targets = [];
        }

        return match ($scope) {
            self::SCOPE_GLOBAL => true,
            self::SCOPE_USER => in_array((int) $user->id, array_map('intval', $targets['user_ids'] ?? []), true),
            self::SCOPE_DEPARTMENT => $user->department && in_array((string) $user->department, array_map('strval', $targets['departments'] ?? []), true),
            self::SCOPE_TEAM => $user->leader_id && in_array((int) $user->leader_id, array_map('intval', $targets['leaders'] ?? []), true),
            default => false,
        };
    }

    public static function pickOverrideForUser(User $user, string $date): ?object
    {
        $candidates = [];
        foreach (self::overridesForDate($date) as $row) {
            if (self::appliesToRow($row, $user)) {
                $candidates[] = $row;
            }
        }

        if (empty($candidates)) {
            return null;
        }

        usort($candidates, function ($a, $b) {
            $ra = self::scopeRank((string) $a->scope);
            $rb = self::scopeRank((string) $b->scope);
            if ($ra !== $rb) {
                return $rb <=> $ra;
            }

            return (int) $b->id <=> (int) $a->id;
        });

        return $candidates[0];
    }

    /**
     * Tek bir tarih için kullanıcıya uygulanan en spesifik override satırı veya null.
     */
    public static function pickOverride(int $userId, string $date): ?object
    {
        $user = User::find($userId);
        if (! $user) {
            return null;
        }

        return self::pickOverrideForUser($user, $date);
    }

    public static function netWorkMinutesFromWindow(string $workStart, string $workEnd, array $breaks): int
    {
        $startM = self::timeToMinutes($workStart);
        $endM = self::timeToMinutes($workEnd);
        $raw = max(0, $endM - $startM);
        $breakOverlap = 0;
        foreach ($breaks as $pair) {
            if (! is_array($pair) || count($pair) < 2) {
                continue;
            }
            $bStartM = self::timeToMinutes((string) $pair[0]);
            $bEndM = self::timeToMinutes((string) $pair[1]);
            $overlapStart = max($startM, $bStartM);
            $overlapEnd = min($endM, $bEndM);
            if ($overlapStart < $overlapEnd) {
                $breakOverlap += ($overlapEnd - $overlapStart);
            }
        }

        return max(0, $raw - $breakOverlap);
    }

    private static function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);

        return $h * 60 + $m;
    }

    public static function minutesFromOverrideRow(object $row): int
    {
        $type = (string) ($row->type ?? '');
        if ($type === self::TYPE_NON_WORKING) {
            return 0;
        }
        if ($type === self::TYPE_WORKING) {
            $m = $row->full_day_minutes;

            return (int) ($m !== null && $m !== '' ? $m : SystemSettingsHelper::fullDayMinutes());
        }
        if ($type === self::TYPE_CUSTOM) {
            $ws = $row->work_start ? (string) $row->work_start : SystemSettingsHelper::workStart();
            $we = $row->work_end ? (string) $row->work_end : SystemSettingsHelper::workEnd();
            $breaksJson = $row->breaks ?? null;
            $breaks = is_string($breaksJson) ? json_decode($breaksJson, true) : (array) $breaksJson;
            if (! is_array($breaks)) {
                $breaks = [];
            }
            if ($row->full_day_minutes !== null && $row->full_day_minutes !== '') {
                return max(0, (int) $row->full_day_minutes);
            }

            return self::netWorkMinutesFromWindow($ws, $we, $breaks);
        }

        return 0;
    }

    /**
     * @return array{minutes:int, kind:'weekend'|'official_holiday'|'workday', title:?string}
     */
    public static function defaultDayMeta(string $date): array
    {
        $c = Carbon::parse($date, 'Europe/Istanbul')->startOfDay();
        $iso = self::isoWeekday($c);
        if ($iso >= 6) {
            return [
                'minutes' => 0,
                'kind' => 'weekend',
                'title' => $iso === 6 ? 'Cumartesi' : 'Pazar',
            ];
        }
        $preset = TurkishHolidayPresets::findByDate($date);
        if ($preset && ($preset['type'] ?? '') === 'non_working') {
            return [
                'minutes' => 0,
                'kind' => 'official_holiday',
                'title' => $preset['title'],
            ];
        }

        return [
            'minutes' => SystemSettingsHelper::fullDayMinutes(),
            'kind' => 'workday',
            'title' => null,
        ];
    }

    /** Takvim istisnası yoksa: hafta sonu / resmi tatil / tam gün iş günü. */
    public static function defaultDayMinutes(string $date): int
    {
        return self::defaultDayMeta($date)['minutes'];
    }

    public static function dayMinutes(int $userId, string $date): int
    {
        $o = self::pickOverride($userId, $date);
        if ($o) {
            return self::minutesFromOverrideRow($o);
        }

        return self::defaultDayMinutes($date);
    }

    public static function weekWorkingMinutes(int $userId, string $weekStart): int
    {
        $tz = 'Europe/Istanbul';
        $mon = Carbon::parse($weekStart, $tz)->startOfDay()->startOfWeek(Carbon::MONDAY);
        $sum = 0;
        for ($i = 0; $i < 7; $i++) {
            $d = $mon->copy()->addDays($i)->toDateString();
            $sum += self::dayMinutes($userId, $d);
        }

        return $sum;
    }

    /**
     * @return list<array{date:string, weekday:int, minutes:int, source:string, default_kind:string, default_title:?string, override:?array}>
     */
    public static function dailyBreakdown(int $userId, string $weekStart): array
    {
        $user = User::find($userId);
        if (! $user) {
            return [];
        }

        $tz = 'Europe/Istanbul';
        $mon = Carbon::parse($weekStart, $tz)->startOfDay()->startOfWeek(Carbon::MONDAY);
        $out = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $mon->copy()->addDays($i);
            $dStr = $day->toDateString();
            $meta = self::defaultDayMeta($dStr);
            $o = self::pickOverrideForUser($user, $dStr);
            $minutes = $o ? self::minutesFromOverrideRow($o) : $meta['minutes'];
            $source = $o ? 'override' : 'default';
            $overridePayload = null;
            if ($o) {
                $targets = json_decode($o->targets ?? 'null', true);
                $overridePayload = [
                    'id' => (int) $o->id,
                    'title' => (string) $o->title,
                    'type' => (string) $o->type,
                    'scope' => (string) $o->scope,
                    'source' => (string) ($o->source ?? 'manual'),
                    'description' => $o->description ? (string) $o->description : null,
                    'targets' => is_array($targets) ? $targets : null,
                ];
            }
            $out[] = [
                'date' => $dStr,
                'weekday' => self::isoWeekday($day),
                'minutes' => $minutes,
                'source' => $source,
                'default_kind' => $meta['kind'],
                'default_title' => $meta['title'],
                'override' => $overridePayload,
            ];
        }

        return $out;
    }

    /**
     * Pazartesi=1 … Cuma=5 kümülatif gerçekleşme tavanları (o haftanın çalışma profiliyle).
     *
     * @return array<int, int>
     */
    public static function getDailyActualLimitsForWeek(int $userId, string $weekStart): array
    {
        $breakdown = self::dailyBreakdown($userId, $weekStart);
        $cumulative = 0;
        $map = [];
        foreach ($breakdown as $entry) {
            $wd = (int) $entry['weekday'];
            if ($wd >= 1 && $wd <= 5) {
                $cumulative += (int) $entry['minutes'];
                $map[$wd] = $cumulative;
            }
        }

        return $map;
    }

    public static function weekTotalForPreset(int $userId, string $weekStart): int
    {
        return self::weekWorkingMinutes($userId, $weekStart);
    }

    /** Non-admin: bu kayıt görünür mü? */
    public static function rowVisibleToUser(object $row, User $viewer): bool
    {
        if ($viewer->role === 'admin') {
            return true;
        }

        $scope = (string) ($row->scope ?? '');
        $targets = json_decode($row->targets ?? 'null', true);
        if (! is_array($targets)) {
            $targets = [];
        }

        if ($scope === self::SCOPE_GLOBAL) {
            return true;
        }

        if ($scope === self::SCOPE_USER) {
            $ids = array_map('intval', $targets['user_ids'] ?? []);

            return in_array((int) $viewer->id, $ids, true);
        }

        if ($scope === self::SCOPE_DEPARTMENT) {
            $deps = array_map('strval', $targets['departments'] ?? []);

            return $viewer->department && in_array((string) $viewer->department, $deps, true);
        }

        if ($scope === self::SCOPE_TEAM) {
            $leaders = array_map('intval', $targets['leaders'] ?? []);
            if ($viewer->role === 'team_leader' && in_array((int) $viewer->id, $leaders, true)) {
                return true;
            }
            if ($viewer->leader_id && in_array((int) $viewer->leader_id, $leaders, true)) {
                return true;
            }

            return false;
        }

        return false;
    }
}
