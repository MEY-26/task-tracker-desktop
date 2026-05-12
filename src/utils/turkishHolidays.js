/** @typedef {{ date: string, title: string, type: 'non_working' | 'working' | 'custom' }} TurkishHolidayPreset */

import { islamicPresetsForGregorianYear } from './islamicHolidaysGregorian';

const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

/**
 * @param {number} year
 * @returns {TurkishHolidayPreset[]}
 */
function fixedGregorianHolidays(year) {
  const y = String(year);
  return [
    { date: `${y}-01-01`, title: 'Yılbaşı', type: 'non_working' },
    { date: `${y}-04-23`, title: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'non_working' },
    { date: `${y}-05-01`, title: 'Emek ve Dayanışma Günü', type: 'non_working' },
    { date: `${y}-05-19`, title: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', type: 'non_working' },
    { date: `${y}-07-15`, title: 'Demokrasi ve Milli Birlik Günü', type: 'non_working' },
    { date: `${y}-08-30`, title: 'Zafer Bayramı', type: 'non_working' },
    { date: `${y}-10-28`, title: 'Cumhuriyet Bayramı (yarım gün — işyerine göre)', type: 'non_working' },
    { date: `${y}-10-29`, title: 'Cumhuriyet Bayramı', type: 'non_working' },
  ];
}

/**
 * @param {number} year
 * @returns {TurkishHolidayPreset[]}
 */
export function getTurkishHolidayPresets(year) {
  if (year < MIN_YEAR || year > MAX_YEAR) return [];
  const islamic = islamicPresetsForGregorianYear(year);
  const merged = [...fixedGregorianHolidays(year), ...islamic];
  merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return merged;
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
