/**
 * Günlük gerçekleşme limitlerini döndürür (her gün 540 dk)
 */
export function getDailyActualLimits() {
  return {
    1: 540,   // Pazartesi
    2: 1080,  // Pazartesi + Salı
    3: 1620,  // Pazartesi + Salı + Çarşamba
    4: 2160,  // Pazartesi + Salı + Çarşamba + Perşembe
    5: 2700,  // Pazartesi + Salı + Çarşamba + Perşembe + Cuma
  };
}

/**
 * Mesai limitlerini döndürür
 */
export function getDailyOvertimeLimits() {
  return {
    1: 150,   // Pazartesi
    2: 300,   // Salı (toplam)
    3: 450,   // Çarşamba (toplam)
    4: 600,   // Perşembe (toplam)
    5: 750,   // Cuma (toplam)
    6: 540,   // Cumartesi (ek)
    0: 540,   // Pazar (ek)
  };
}

/**
 * Bugünün tarihine göre maksimum gerçekleşme limitini döndürür (mesai dahil)
 */
export function getMaxActualLimitForToday(weekStart, overtimeMinutes = 0) {
  const monday = new Date(weekStart);
  monday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < monday) {
    return 0; // Gelecek hafta
  }

  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  if (today >= nextMonday) {
    return 2700; // Geçmiş hafta için tam limit
  }

  const dayOfWeek = today.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
  const limits = getDailyActualLimits();

  // Temel günlük limit
  let baseLimit = 2700;
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    baseLimit = limits[dayOfWeek] ?? 2700;
  }

  // Mesai süresini ekle (günlük mesai limitine göre)
  const maxOvertimeLimit = getMaxOvertimeLimitForToday(weekStart);
  const allowedOvertime = Math.min(overtimeMinutes, maxOvertimeLimit);

  return baseLimit + allowedOvertime;
}

/**
 * Bugünün tarihine göre maksimum mesai limitini döndürür
 */
export function getMaxOvertimeLimitForToday(weekStart) {
  const monday = new Date(weekStart);
  monday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < monday) {
    return 0; // Gelecek hafta
  }

  const dayOfWeek = today.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
  const limits = getDailyOvertimeLimits();

  return limits[dayOfWeek] ?? 750;
}
