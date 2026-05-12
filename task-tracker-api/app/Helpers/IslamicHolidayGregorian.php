<?php

namespace App\Helpers;

/**
 * Dini bayramların Miladi karşılığı: ICU islamic-umalqura (UTC öğlesi).
 * php-intl gerekir; yoksa boş dizi döner. Resmi Diyanet ile ara sıra 1 gün fark olabilir.
 */
final class IslamicHolidayGregorian
{
    private const MIN_YEAR = 1990;

    private const MAX_YEAR = 2100;

    /** @return list<array{date:string,title:string,type:string}> */
    public static function presetsForGregorianYear(int $year): array
    {
        if ($year < self::MIN_YEAR || $year > self::MAX_YEAR) {
            return [];
        }
        if (! class_exists(\IntlGregorianCalendar::class)) {
            return [];
        }

        $ramazan1 = self::findGregorianYmdForIslamicDate($year, 10, 1);
        $kurban1 = self::findGregorianYmdForIslamicDate($year, 12, 10);
        if ($ramazan1 === null || $kurban1 === null) {
            return [];
        }

        $i = [
            'ramazanArefe' => self::addDaysYmd($ramazan1, -1),
            'ramazan1' => $ramazan1,
            'ramazan2' => self::addDaysYmd($ramazan1, 1),
            'ramazan3' => self::addDaysYmd($ramazan1, 2),
            'kurbanArefe' => self::addDaysYmd($kurban1, -1),
            'kurban1' => $kurban1,
            'kurban2' => self::addDaysYmd($kurban1, 1),
            'kurban3' => self::addDaysYmd($kurban1, 2),
            'kurban4' => self::addDaysYmd($kurban1, 3),
        ];

        return [
            ['date' => $i['ramazanArefe'], 'title' => 'Ramazan Bayramı Arefesi', 'type' => 'non_working'],
            ['date' => $i['ramazan1'], 'title' => 'Ramazan Bayramı (1. gün)', 'type' => 'non_working'],
            ['date' => $i['ramazan2'], 'title' => 'Ramazan Bayramı (2. gün)', 'type' => 'non_working'],
            ['date' => $i['ramazan3'], 'title' => 'Ramazan Bayramı (3. gün)', 'type' => 'non_working'],
            ['date' => $i['kurbanArefe'], 'title' => 'Kurban Bayramı Arefesi', 'type' => 'non_working'],
            ['date' => $i['kurban1'], 'title' => 'Kurban Bayramı (1. gün)', 'type' => 'non_working'],
            ['date' => $i['kurban2'], 'title' => 'Kurban Bayramı (2. gün)', 'type' => 'non_working'],
            ['date' => $i['kurban3'], 'title' => 'Kurban Bayramı (3. gün)', 'type' => 'non_working'],
            ['date' => $i['kurban4'], 'title' => 'Kurban Bayramı (4. gün)', 'type' => 'non_working'],
        ];
    }

    private static function findGregorianYmdForIslamicDate(int $gregorianYear, int $islamicMonthOneBased, int $islamicDay): ?string
    {
        $gCal = new \IntlGregorianCalendar('UTC', 'en_US');

        for ($mo = 1; $mo <= 12; $mo++) {
            $dim = cal_days_in_month(CAL_GREGORIAN, $mo, $gregorianYear);
            for ($da = 1; $da <= $dim; $da++) {
                $gCal->clear();
                $gCal->set($gregorianYear, $mo - 1, $da, 12, 0, 0);

                $iCal = \IntlCalendar::createInstance('UTC', 'en_US@calendar=islamic-umalqura');
                $iCal->setTime($gCal->getTime());

                $im = (int) $iCal->get(\IntlCalendar::FIELD_MONTH) + 1;
                $id = (int) $iCal->get(\IntlCalendar::FIELD_DAY_OF_MONTH);

                if ($im === $islamicMonthOneBased && $id === $islamicDay) {
                    return sprintf('%04d-%02d-%02d', $gregorianYear, $mo, $da);
                }
            }
        }

        return null;
    }

    private static function addDaysYmd(string $ymd, int $delta): string
    {
        $dt = \DateTimeImmutable::createFromFormat('Y-m-d|', $ymd, new \DateTimeZone('UTC'));
        if (! $dt) {
            return $ymd;
        }
        $dt = $dt->modify(($delta >= 0 ? '+' : '').$delta.' days');

        return $dt->format('Y-m-d');
    }
}
