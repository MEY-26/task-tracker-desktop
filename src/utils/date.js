export function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** 1=Mon .. 5=Fri, 0=Sat, 6=Sun */
export function getWeekday(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export function isWeekday(date) {
  const wd = getWeekday(date);
  return wd >= 1 && wd <= 5;
}

/** date is before today (start of day) */
export function isPast(date) {
  return fmtYMD(date) < fmtYMD(new Date());
}

export function fmtYMD(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function at10AM(date) {
  const d = new Date(date);
  d.setHours(10, 0, 0, 0);
  return d;
}

export function at1330(d) {
  const x = new Date(d);
  x.setHours(13, 30, 0, 0);
  return x;
}

export function formatDate(dateLike) {
  if (!dateLike) return '-';
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  try {
    const opts = {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return new Intl.DateTimeFormat('tr-TR', opts).format(d);
  } catch {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

export function formatDateOnly(dateLike) {
  if (!dateLike) return '-';
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  try {
    const opts = {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    return new Intl.DateTimeFormat('tr-TR', opts).format(d);
  } catch {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
}
