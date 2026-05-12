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
    if (first.type === 'working' || first.type === 'custom') {
      // Hafta sonu veya resmi tatilde çalışma istisnası: sıcak turuncu
      if (baseHoliday) return 'rgba(234, 88, 12, 0.48)';
      return 'rgba(16, 185, 129, 0.32)';
    }
    if (first.type === 'non_working') {
      const src = first.source || 'manual';
      if (src === 'preset') return 'rgba(22, 163, 74, 0.42)';
      return 'rgba(74, 222, 128, 0.38)';
    }
  }
  if (baseHoliday) return 'rgba(22, 163, 74, 0.38)';
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

/** @returns {{ mode: 'system' } | { mode: 'explicit', items: [string,string][] }} */
export function calendarBreaksDisplayState(raw) {
  if (raw == null || raw === '') return { mode: 'system' };
  if (Array.isArray(raw)) return { mode: 'explicit', items: raw };
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t === '' || t === 'null') return { mode: 'system' };
    try {
      const v = JSON.parse(t);
      if (Array.isArray(v)) return { mode: 'explicit', items: v };
    } catch {
      /* ignore */
    }
  }
  return { mode: 'system' };
}

export function trimCalendarTime(s) {
  if (s == null || s === '') return '';
  const t = String(s).trim();
  return t.length >= 5 ? t.slice(0, 5) : t;
}

/**
 * Çalışma / custom satırı için efektif [başlangıç, bitiş] mola çiftleri
 * @returns {Array<[string,string]|[unknown,unknown]>}
 */
export function workingCalendarEffectiveBreakPairs(list, dateObj, settings) {
  const first = list[0];
  if (!first || (first.type !== 'working' && first.type !== 'custom')) return [];
  const st = calendarBreaksDisplayState(first.breaks);
  let pairs;
  if (st.mode === 'system') {
    const dow = dateObj.getDay();
    const isFriday = dow === 5;
    const fb = isFriday ? settings?.breaks_friday : settings?.breaks_default;
    pairs = Array.isArray(fb) ? fb : [];
  } else {
    pairs = Array.isArray(st.items) ? st.items : [];
  }
  return pairs.filter((p) => Array.isArray(p) && p.length >= 2);
}

/** Hücre içi listeleme: ['10:00-10:15', …] */
export function workingCalendarCellBreakRangeLines(list, dateObj, settings) {
  return workingCalendarEffectiveBreakPairs(list, dateObj, settings)
    .map((p) => {
      const a = trimCalendarTime(p[0]);
      const b = trimCalendarTime(p[1]);
      if (!a || !b) return null;
      return `${a}-${b}`;
    })
    .filter(Boolean);
}

/**
 * Çalışma / özel çalışma hücrelerinde gösterilecek mesai satırı.
 * @param {object} settings - { work_start, work_end, breaks_default, breaks_friday } (opsiyonel)
 */
export function workingCalendarCellWorkTimeLine(list, dateObj, settings) {
  void dateObj; // API tutarlılığı (mola satırı günü kullanıyor)
  const first = list[0];
  if (!first || (first.type !== 'working' && first.type !== 'custom')) return '';
  const ws = trimCalendarTime(first.work_start) || trimCalendarTime(settings?.work_start) || '08:00';
  const we = trimCalendarTime(first.work_end) || trimCalendarTime(settings?.work_end) || '18:15';
  if (!ws || !we) return '';
  return `${ws}-${we}`;
}

export function workingCalendarCellBreaksTooltipLine(list, dateObj, settings) {
  const first = list[0];
  if (!first || (first.type !== 'working' && first.type !== 'custom')) return '';
  const pairs = workingCalendarEffectiveBreakPairs(list, dateObj, settings);
  if (!pairs.length) return 'Molalar: yok';
  const parts = pairs
    .map((p) => {
      const a = trimCalendarTime(p[0]);
      const b = trimCalendarTime(p[1]);
      if (!a || !b) return '';
      return `${a}-${b}`;
    })
    .filter(Boolean);
  return parts.length ? `Molalar: ${parts.join(', ')}` : 'Molalar: yok';
}

/**
 * Native `title` için çok satırlı ipucu (mesai + mola).
 * @param {string[]} prepend – örn. kayıtlı izin uyarısı
 */
export function workingCalendarCellNativeTooltipLines(list, baseHoliday, dateObj, settings, prepend = []) {
  const subtitle = workingCalendarCellTitle(list, baseHoliday);
  const timeLine = workingCalendarCellWorkTimeLine(list, dateObj, settings);
  const breaksLine = workingCalendarCellBreaksTooltipLine(list, dateObj, settings);
  const out = [...prepend, subtitle, timeLine, breaksLine].filter(Boolean);
  return out.join('\n');
}
