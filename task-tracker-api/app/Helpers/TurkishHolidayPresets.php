<?php

namespace App\Helpers;

/**
 * Türkiye resmi tatil preset listesi: sabit (Miladi) günler + ICU ile hesaplanan dini bayramlar.
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
        if ($year < self::MIN_YEAR || $year > self::MAX_YEAR) {
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

    private const MIN_YEAR = 1990;

    private const MAX_YEAR = 2100;

    /**
     * Her yıl aynı ay-güne denk gelen millî ve kurumsal resmi tatiller.
     *
     * @return list<array{date:string,title:string,type:string}>
     */
    private static function fixedGregorianHolidays(int $year): array
    {
        $y = sprintf('%04d', $year);

        return [
            ['date' => "{$y}-01-01", 'title' => 'Yılbaşı', 'type' => 'non_working'],
            ['date' => "{$y}-04-23", 'title' => 'Ulusal Egemenlik ve Çocuk Bayramı', 'type' => 'non_working'],
            ['date' => "{$y}-05-01", 'title' => 'Emek ve Dayanışma Günü', 'type' => 'non_working'],
            ['date' => "{$y}-05-19", 'title' => 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', 'type' => 'non_working'],
            ['date' => "{$y}-07-15", 'title' => 'Demokrasi ve Milli Birlik Günü', 'type' => 'non_working'],
            ['date' => "{$y}-08-30", 'title' => 'Zafer Bayramı', 'type' => 'non_working'],
            ['date' => "{$y}-10-28", 'title' => 'Cumhuriyet Bayramı (Yarım gün — işyerine göre)', 'type' => 'non_working'],
            ['date' => "{$y}-10-29", 'title' => 'Cumhuriyet Bayramı', 'type' => 'non_working'],
        ];
    }

    /**
     * @return list<array{date:string,title:string,type:string}>
     */
    public static function forYear(int $year): array
    {
        if ($year < self::MIN_YEAR || $year > self::MAX_YEAR) {
            return [];
        }

        $items = array_merge(
            self::fixedGregorianHolidays($year),
            IslamicHolidayGregorian::presetsForGregorianYear($year)
        );

        usort($items, fn ($a, $b) => strcmp($a['date'], $b['date']));

        return $items;
    }
}
