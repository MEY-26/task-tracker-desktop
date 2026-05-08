import { fmtYMD } from './date';
import { getHolidayByDate } from './turkishHolidays';

export function monthGridRange(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const start = new Date(first);
  const dow = start.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + diffToMon);
  const end = new Date(last);
  const dowEnd = end.getDay();
  const diffToSun = dowEnd === 0 ? 0 : 7 - dowEnd;
  end.setDate(end.getDate() + diffToSun);
  return { from: fmtYMD(start), to: fmtYMD(end) };
}

export function normalizeCalendarRow(row) {
  let targets = row.targets;
  if (typeof targets === 'string') {
    try {
      targets = JSON.parse(targets);
    } catch {
      targets = {};
    }
  }
  const source = row.source != null && row.source !== '' ? String(row.source) : 'manual';
  return { ...row, targets: targets || {}, source };
}

export function buildCalendarItemsByDate(items) {
  const map = {};
  for (const it of items) {
    const d = it.date;
    if (!map[d]) map[d] = [];
    map[d].push(it);
  }
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => Number(a.id) - Number(b.id));
  }
  return map;
}

export function workingCalendarDayInfo(d, itemsByDate) {
  const ds = fmtYMD(d);
  const list = itemsByDate[ds] || [];
  const dow = d.getDay();
  const weekend = dow === 0 || dow === 6;
  const preset = getHolidayByDate(ds);
  let baseHoliday = null;
  if (weekend) {
    if (preset && preset.type === 'non_working') {
      baseHoliday = { kind: 'official', title: preset.title };
    } else {
      baseHoliday = { kind: 'weekend', title: null };
    }
  } else if (preset && preset.type === 'non_working') {
    baseHoliday = { kind: 'official', title: preset.title };
  }
  return { ds, list, baseHoliday };
}

export function workingCalendarCellColor(list, baseHoliday) {
  const first = list[0];
  if (first) {
    if (first.type === 'working') return 'rgba(16,185,129,0.35)';
    if (first.type === 'custom') return 'rgba(234,179,8,0.4)';
    if (first.type === 'non_working') {
      const src = first.source || 'manual';
      if (src === 'preset') return 'rgba(239,68,68,0.3)';
      return 'rgba(245,158,11,0.35)';
    }
  }
  if (baseHoliday) return 'rgba(239,68,68,0.28)';
  return 'transparent';
}

export function defaultTitleForCalendarType(type) {
  if (type === 'working' || type === 'custom') return 'Çalışma';
  if (type === 'non_working') return 'Tatil';
  return 'Çalışma';
}

export function workingCalendarCellTitle(list, baseHoliday) {
  const first = list[0];
  if (first) {
    const t = first.title != null ? String(first.title).trim() : '';
    return t || defaultTitleForCalendarType(first.type);
  }
  if (baseHoliday?.kind === 'official' && baseHoliday.title) {
    return baseHoliday.title;
  }
  return '';
}
