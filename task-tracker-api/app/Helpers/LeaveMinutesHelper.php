<?php

namespace App\Helpers;

/**
 * leave_requests satırı için izin dakikası (tam gün / saatlik, mola düşümlü).
 * LeaveRequestController::syncWeeklyGoalLeaveMinutes ile aynı mantık;
 * WeeklyGoalController GET/save bu toplamı haftalık hedefe yansıtır.
 */
class LeaveMinutesHelper
{
    private const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    public static function weeklyBaseCap(): int
    {
        $workingDays = SystemSettingsHelper::workingDays();
        $fullDay = SystemSettingsHelper::fullDayMinutes();
        $count = count(array_intersect([1, 2, 3, 4, 5], $workingDays)) ?: 5;

        return $count * $fullDay;
    }

    /**
     * @param  object  $row  leave_requests tablo satırı
     */
    public static function totalForRow(object $row): int
    {
        $total = 0;
        foreach (self::WEEKDAY_KEYS as $i => $key) {
            if (!($row->{$key} ?? false)) {
                continue;
            }
            $dayOfWeek = $i + 1;
            $start = $row->{$key . '_start'} ?? null;
            $end = $row->{$key . '_end'} ?? null;
            $total += self::minutesForWeekday($dayOfWeek, $start, $end);
        }

        return min(self::weeklyBaseCap(), $total);
    }

    /**
     * $dayOfWeek: 1=Monday … 5=Friday
     */
    public static function minutesForWeekday(int $dayOfWeek, ?string $start, ?string $end): int
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

        $leaveStartMinutes = self::timeToMinutes($startTime);
        $leaveEndMinutes = self::timeToMinutes($endTime);
        $rawMinutes = max(0, $leaveEndMinutes - $leaveStartMinutes);

        $breakOverlapMinutes = 0;
        foreach ($breaks as [$bStart, $bEnd]) {
            $bStartM = self::timeToMinutes($bStart);
            $bEndM = self::timeToMinutes($bEnd);
            $overlapStart = max($leaveStartMinutes, $bStartM);
            $overlapEnd = min($leaveEndMinutes, $bEndM);
            if ($overlapStart < $overlapEnd) {
                $breakOverlapMinutes += ($overlapEnd - $overlapStart);
            }
        }

        return max(0, $rawMinutes - $breakOverlapMinutes);
    }

    private static function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);

        return $h * 60 + $m;
    }
}
