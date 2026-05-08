<?php

namespace App\Helpers;

/**
 * Yıllık güncellenmesi gereken resmi / dini tatil preset listesi (hızlı ekleme).
 *
 * @return list<array{date:string,title:string,type:string}>
 */
class TurkishHolidayPresets
{
    /** @var array<int, array<string, array{date:string,title:string,type:string}>> */
    private static array $byDateCache = [];

    /**
     * @return array{date:string,title:string,type:string}|null
     */
    public static function findByDate(string $date): ?array
    {
        $year = (int) substr($date, 0, 4);
        if ($year < 2020 || $year > 2100) {
            return null;
        }
        if (! isset(self::$byDateCache[$year])) {
            $map = [];
            foreach (self::forYear($year) as $item) {
                $map[$item['date']] = $item;
            }
            self::$byDateCache[$year] = $map;
        }

        return self::$byDateCache[$year][$date] ?? null;
    }

    public static function forYear(int $year): array
    {
        return match ($year) {
            2026 => [
                ['date' => '2026-01-01', 'title' => 'Yılbaşı', 'type' => 'non_working'],
                ['date' => '2026-03-19', 'title' => 'Ramazan Bayramı Arefesi', 'type' => 'non_working'],
                ['date' => '2026-03-20', 'title' => 'Ramazan Bayramı (1. gün)', 'type' => 'non_working'],
                ['date' => '2026-03-21', 'title' => 'Ramazan Bayramı (2. gün)', 'type' => 'non_working'],
                ['date' => '2026-03-22', 'title' => 'Ramazan Bayramı (3. gün)', 'type' => 'non_working'],
                ['date' => '2026-04-23', 'title' => 'Ulusal Egemenlik ve Çocuk Bayramı', 'type' => 'non_working'],
                ['date' => '2026-05-01', 'title' => 'Emek ve Dayanışma Günü', 'type' => 'non_working'],
                ['date' => '2026-05-19', 'title' => 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', 'type' => 'non_working'],
                ['date' => '2026-05-25', 'title' => 'Kurban Bayramı Arefesi', 'type' => 'non_working'],
                ['date' => '2026-05-26', 'title' => 'Kurban Bayramı (1. gün)', 'type' => 'non_working'],
                ['date' => '2026-05-27', 'title' => 'Kurban Bayramı (2. gün)', 'type' => 'non_working'],
                ['date' => '2026-05-28', 'title' => 'Kurban Bayramı (3. gün)', 'type' => 'non_working'],
                ['date' => '2026-05-29', 'title' => 'Kurban Bayramı (4. gün)', 'type' => 'non_working'],
                ['date' => '2026-07-15', 'title' => 'Demokrasi ve Milli Birlik Günü', 'type' => 'non_working'],
                ['date' => '2026-08-30', 'title' => 'Zafer Bayramı', 'type' => 'non_working'],
                ['date' => '2026-10-28', 'title' => 'Cumhuriyet Bayramı (Yarım gün — işyerine göre)', 'type' => 'non_working'],
                ['date' => '2026-10-29', 'title' => 'Cumhuriyet Bayramı', 'type' => 'non_working'],
            ],
            2027 => [
                ['date' => '2027-01-01', 'title' => 'Yılbaşı', 'type' => 'non_working'],
                ['date' => '2027-03-09', 'title' => 'Ramazan Bayramı Arefesi', 'type' => 'non_working'],
                ['date' => '2027-03-10', 'title' => 'Ramazan Bayramı (1. gün)', 'type' => 'non_working'],
                ['date' => '2027-03-11', 'title' => 'Ramazan Bayramı (2. gün)', 'type' => 'non_working'],
                ['date' => '2027-03-12', 'title' => 'Ramazan Bayramı (3. gün)', 'type' => 'non_working'],
                ['date' => '2027-04-23', 'title' => 'Ulusal Egemenlik ve Çocuk Bayramı', 'type' => 'non_working'],
                ['date' => '2027-05-01', 'title' => 'Emek ve Dayanışma Günü', 'type' => 'non_working'],
                ['date' => '2027-05-19', 'title' => 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', 'type' => 'non_working'],
                ['date' => '2027-06-15', 'title' => 'Kurban Bayramı Arefesi', 'type' => 'non_working'],
                ['date' => '2027-06-16', 'title' => 'Kurban Bayramı (1. gün)', 'type' => 'non_working'],
                ['date' => '2027-06-17', 'title' => 'Kurban Bayramı (2. gün)', 'type' => 'non_working'],
                ['date' => '2027-06-18', 'title' => 'Kurban Bayramı (3. gün)', 'type' => 'non_working'],
                ['date' => '2027-06-19', 'title' => 'Kurban Bayramı (4. gün)', 'type' => 'non_working'],
                ['date' => '2027-07-15', 'title' => 'Demokrasi ve Milli Birlik Günü', 'type' => 'non_working'],
                ['date' => '2027-08-30', 'title' => 'Zafer Bayramı', 'type' => 'non_working'],
                ['date' => '2027-10-28', 'title' => 'Cumhuriyet Bayramı (Yarım gün — işyerine göre)', 'type' => 'non_working'],
                ['date' => '2027-10-29', 'title' => 'Cumhuriyet Bayramı', 'type' => 'non_working'],
            ],
            default => [],
        };
    }
}
