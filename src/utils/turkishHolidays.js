/** @typedef {{ date: string, title: string, type: 'non_working' | 'working' | 'custom' }} TurkishHolidayPreset */

const PRESETS_2026 = /** @type {TurkishHolidayPreset[]} */ ([
  { date: '2026-01-01', title: 'Yılbaşı', type: 'non_working' },
  { date: '2026-03-19', title: 'Ramazan Bayramı Arefesi', type: 'non_working' },
  { date: '2026-03-20', title: 'Ramazan Bayramı (1. gün)', type: 'non_working' },
  { date: '2026-03-21', title: 'Ramazan Bayramı (2. gün)', type: 'non_working' },
  { date: '2026-03-22', title: 'Ramazan Bayramı (3. gün)', type: 'non_working' },
  { date: '2026-04-23', title: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'non_working' },
  { date: '2026-05-01', title: 'Emek ve Dayanışma Günü', type: 'non_working' },
  { date: '2026-05-19', title: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', type: 'non_working' },
  { date: '2026-05-26', title: 'Kurban Bayramı Arefesi', type: 'non_working' },
  { date: '2026-05-27', title: 'Kurban Bayramı (1. gün)', type: 'non_working' },
  { date: '2026-05-28', title: 'Kurban Bayramı (2. gün)', type: 'non_working' },
  { date: '2026-05-29', title: 'Kurban Bayramı (3. gün)', type: 'non_working' },
  { date: '2026-05-30', title: 'Kurban Bayramı (4. gün)', type: 'non_working' },
  { date: '2026-07-15', title: 'Demokrasi ve Milli Birlik Günü', type: 'non_working' },
  { date: '2026-08-30', title: 'Zafer Bayramı', type: 'non_working' },
  { date: '2026-10-28', title: 'Cumhuriyet Bayramı (yarım gün — işyerine göre)', type: 'non_working' },
  { date: '2026-10-29', title: 'Cumhuriyet Bayramı', type: 'non_working' },
]);

const PRESETS_2027 = /** @type {TurkishHolidayPreset[]} */ ([
  { date: '2027-01-01', title: 'Yılbaşı', type: 'non_working' },
  { date: '2027-03-09', title: 'Ramazan Bayramı Arefesi', type: 'non_working' },
  { date: '2027-03-10', title: 'Ramazan Bayramı (1. gün)', type: 'non_working' },
  { date: '2027-03-11', title: 'Ramazan Bayramı (2. gün)', type: 'non_working' },
  { date: '2027-03-12', title: 'Ramazan Bayramı (3. gün)', type: 'non_working' },
  { date: '2027-04-23', title: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'non_working' },
  { date: '2027-05-01', title: 'Emek ve Dayanışma Günü', type: 'non_working' },
  { date: '2027-05-19', title: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', type: 'non_working' },
  { date: '2027-06-15', title: 'Kurban Bayramı Arefesi', type: 'non_working' },
  { date: '2027-06-16', title: 'Kurban Bayramı (1. gün)', type: 'non_working' },
  { date: '2027-06-17', title: 'Kurban Bayramı (2. gün)', type: 'non_working' },
  { date: '2027-06-18', title: 'Kurban Bayramı (3. gün)', type: 'non_working' },
  { date: '2027-06-19', title: 'Kurban Bayramı (4. gün)', type: 'non_working' },
  { date: '2027-07-15', title: 'Demokrasi ve Milli Birlik Günü', type: 'non_working' },
  { date: '2027-08-30', title: 'Zafer Bayramı', type: 'non_working' },
  { date: '2027-10-28', title: 'Cumhuriyet Bayramı (yarım gün — işyerine göre)', type: 'non_working' },
  { date: '2027-10-29', title: 'Cumhuriyet Bayramı', type: 'non_working' },
]);

/**
 * @param {number} year
 * @returns {TurkishHolidayPreset[]}
 */
export function getTurkishHolidayPresets(year) {
  if (year === 2026) return [...PRESETS_2026];
  if (year === 2027) return [...PRESETS_2027];
  return [];
}

/** @type {Map<number, Map<string, TurkishHolidayPreset>>} */
const _byYearDate = new Map();

/**
 * Belirli bir tarih için resmi tatil preset kaydı (UI takvimi).
 * @param {string} dateStr YYYY-MM-DD
 * @returns {TurkishHolidayPreset | null}
 */
export function getHolidayByDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 4) return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (!Number.isFinite(year)) return null;
  if (!_byYearDate.has(year)) {
    const m = new Map();
    for (const p of getTurkishHolidayPresets(year)) {
      m.set(p.date, p);
    }
    _byYearDate.set(year, m);
  }
  return _byYearDate.get(year).get(dateStr) || null;
}
