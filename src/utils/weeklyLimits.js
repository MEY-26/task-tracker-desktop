/**
 * Günlük gerçekleşme limitlerini döndürür (varsayılan: her iş günü 540 dk)
 */
export function getDailyActualLimits() {
  return {
    1: 540,
    2: 1080,
    3: 1620,
    4: 2160,
    5: 2700,
  };
}

const DEFAULT_WEEK_TOTAL = 2700;

/**
 * API'den gelen haftalık günlük dökümünden Pazartesi–Cuma kümülatif limit map'i (1..5).
 * @param {Array<{ weekday?: number, minutes?: number }>|null|undefined} dailyBreakdown
 * @returns {Record<number, number>}
 */
export function getDailyActualLimitsFromBreakdown(dailyBreakdown) {
  if (!Array.isArray(dailyBreakdown) || dailyBreakdown.length < 7) {
    return getDailyActualLimits();
  }
  let cumulative = 0;
  /** @type {Record<number, number>} */
  const map = {};
  for (const entry of dailyBreakdown) {
    const wd = Number(entry.weekday);
    if (wd >= 1 && wd <= 5) {
      cumulative += Math.max(0, Number(entry.minutes || 0));
      map[wd] = cumulative;
    }
  }
  return Object.keys(map).length ? map : getDailyActualLimits();
}

/**
 * @param {Array<{ minutes?: number }>|null|undefined} dailyBreakdown
 */
export function getWeekTotalMinutesFromBreakdown(dailyBreakdown) {
  if (!Array.isArray(dailyBreakdown)) return DEFAULT_WEEK_TOTAL;
  return dailyBreakdown.reduce((s, e) => s + Math.max(0, Number(e.minutes || 0)), 0);
}

export function getDailyOvertimeLimits() {
  return {
    1: 150,
    2: 300,
    3: 450,
    4: 600,
    5: 750,
    6: 540,
    0: 540,
  };
}

/**
 * @param {string} weekStart YYYY-MM-DD (Pazartesi)
 * @param {number} overtimeMinutes
 * @param {Array<{ weekday?: number, minutes?: number }>|null|undefined} dailyBreakdown
 */
export function getMaxActualLimitForToday(weekStart, overtimeMinutes = 0, dailyBreakdown = null) {
  const monday = new Date(weekStart);
  monday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < monday) {
    return 0;
  }

  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  if (today >= nextMonday) {
    return getWeekTotalMinutesFromBreakdown(dailyBreakdown);
  }

  const dayOfWeek = today.getDay();
  const limits = getDailyActualLimitsFromBreakdown(dailyBreakdown);

  let baseLimit = getWeekTotalMinutesFromBreakdown(dailyBreakdown);
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    baseLimit = limits[dayOfWeek] ?? baseLimit;
  }

  const maxOvertimeLimit = getMaxOvertimeLimitForToday(weekStart);
  const allowedOvertime = Math.min(overtimeMinutes, maxOvertimeLimit);

  return baseLimit + allowedOvertime;
}

export function getMaxOvertimeLimitForToday(weekStart) {
  const monday = new Date(weekStart);
  monday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < monday) {
    return 0;
  }

  const dayOfWeek = today.getDay();
  const limits = getDailyOvertimeLimits();

  return limits[dayOfWeek] ?? 750;
}
