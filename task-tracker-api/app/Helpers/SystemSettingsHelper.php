<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

class SystemSettingsHelper
{
    private static ?array $cache = null;

    public static function get(string $key, $default = null)
    {
        if (self::$cache === null) {
            self::$cache = [];
            $rows = DB::table('system_settings')->get();
            foreach ($rows as $row) {
                $decoded = json_decode($row->value, true);
                self::$cache[$row->key] = $decoded !== null ? $decoded : $row->value;
            }
        }
        return self::$cache[$key] ?? $default;
    }

    public static function clearCache(): void
    {
        self::$cache = null;
    }

    public static function workStart(): string
    {
        return (string) (self::get('work_start') ?? '08:00');
    }

    public static function workEnd(): string
    {
        return (string) (self::get('work_end') ?? '18:15');
    }

    public static function fullDayMinutes(): int
    {
        return (int) (self::get('full_day_minutes') ?? 540);
    }

    public static function breaksDefault(): array
    {
        $v = self::get('breaks_default');
        return is_array($v) ? $v : [['10:00', '10:15'], ['13:00', '13:30'], ['16:00', '16:15']];
    }

    public static function breaksFriday(): array
    {
        $v = self::get('breaks_friday');
        return is_array($v) ? $v : [['10:00', '10:15'], ['13:00', '14:30'], ['16:00', '16:15']];
    }

    public static function workingDays(): array
    {
        $v = self::get('working_days');
        return is_array($v) ? $v : [1, 2, 3, 4, 5];
    }
}
