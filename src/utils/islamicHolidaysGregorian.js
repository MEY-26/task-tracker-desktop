/**
 * Dini bayramların Miladi tarihleri: ICU islamic-umalqura takvimi (UTC öğlesi).
 * Resmi Diyanet duyurusundan bazen 1 gün fark oluşabilir.
 */

/**
 * @param {number} y
 * @param {number} m 1-12
 * @param {number} d
 * @returns {{ iy: number, im: number, id: number }}
 */
function gregorianToIslamicUmmalqura(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat('en', {
    calendar: 'islamic-umalqura',
    timeZone: 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = fmt.formatToParts(dt);
  const o = { year: NaN, month: NaN, day: NaN };
  for (const p of parts) {
    if (p.type === 'year') o.year = Number(p.value);
    if (p.type === 'month') o.month = Number(p.value);
    if (p.type === 'day') o.day = Number(p.value);
  }
  return { iy: o.year, im: o.month, id: o.day };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** @returns {string} YYYY-MM-DD */
function ymdUTC(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addDaysYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return ymdUTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * @param {number} gregorianYear
 * @param {number} islamicMonth 1-12 (10=Şevval, 12=Zilhicce)
 * @param {number} islamicDay
 * @returns {string|null} YYYY-MM-DD
 */
export function findGregorianYmdForIslamicDate(gregorianYear, islamicMonth, islamicDay) {
  for (let mo = 1; mo <= 12; mo += 1) {
    const dim = new Date(Date.UTC(gregorianYear, mo, 0, 12, 0, 0)).getUTCDate();
    for (let da = 1; da <= dim; da += 1) {
      const { im, id } = gregorianToIslamicUmmalqura(gregorianYear, mo, da);
      if (im === islamicMonth && id === islamicDay) {
        return ymdUTC(gregorianYear, mo, da);
      }
    }
  }
  return null;
}

/**
 * @param {number} gregorianYear
 * @returns {import('./turkishHolidays.js').TurkishHolidayPreset[]}
 */
export function islamicPresetsForGregorianYear(gregorianYear) {
  try {
    const ramazan1 = findGregorianYmdForIslamicDate(gregorianYear, 10, 1);
    const kurban1 = findGregorianYmdForIslamicDate(gregorianYear, 12, 10);
    if (!ramazan1 || !kurban1) return [];

    const i = {
      ramazanArefe: addDaysYmd(ramazan1, -1),
      ramazan1,
      ramazan2: addDaysYmd(ramazan1, 1),
      ramazan3: addDaysYmd(ramazan1, 2),
      kurbanArefe: addDaysYmd(kurban1, -1),
      kurban1,
      kurban2: addDaysYmd(kurban1, 1),
      kurban3: addDaysYmd(kurban1, 2),
      kurban4: addDaysYmd(kurban1, 3),
    };

    return [
      { date: i.ramazanArefe, title: 'Ramazan Bayramı Arefesi', type: 'non_working' },
      { date: i.ramazan1, title: 'Ramazan Bayramı (1. gün)', type: 'non_working' },
      { date: i.ramazan2, title: 'Ramazan Bayramı (2. gün)', type: 'non_working' },
      { date: i.ramazan3, title: 'Ramazan Bayramı (3. gün)', type: 'non_working' },
      { date: i.kurbanArefe, title: 'Kurban Bayramı Arefesi', type: 'non_working' },
      { date: i.kurban1, title: 'Kurban Bayramı (1. gün)', type: 'non_working' },
      { date: i.kurban2, title: 'Kurban Bayramı (2. gün)', type: 'non_working' },
      { date: i.kurban3, title: 'Kurban Bayramı (3. gün)', type: 'non_working' },
      { date: i.kurban4, title: 'Kurban Bayramı (4. gün)', type: 'non_working' },
    ];
  } catch {
    return [];
  }
}
