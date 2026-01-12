// src/utils/computeWeeklyScore.js

/** @typedef {{name?: string, target_minutes: number, actual_minutes: number, is_completed: boolean}} PlannedItem */
/** @typedef {{name?: string, actual_minutes: number}} UnplannedItem */

/**
 * Sınırla
 * @param {number} x
 * @param {number} lo
 * @param {number} hi
 */
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);

/**
 * Haftalık performans hesaplayıcı (yüzde döner: 0..scoreCap)
 * @param {Object} opts
 * @param {number} opts.baseMinutes   - Haftalık taban (örn 2700)
 * @param {number} opts.leaveMinutes  - İzin dk
 * @param {number} opts.overtimeMinutes - Mesai dk (2700'ü aşmak için)
 * @param {PlannedItem[]} opts.planned
 * @param {UnplannedItem[]} opts.unplanned
 * @param {Object} [opts.params]
 */
export function computeWeeklyScore({ baseMinutes, leaveMinutes, overtimeMinutes, planned, unplanned, params = {} }) {
  const cfg = {
    alpha:   params.alpha   ?? 0.10,  // hız bonus ağırlığı
    beta:    params.beta    ?? 0.25,  // plandışı bonus ağırlığı
    B_max:   params.B_max   ?? 0.20,  // toplam bonus tavanı (+%20)
    eta_max: params.eta_max ?? 2.0,   // tamamlanan görev için verim tavanı (2x)

    kappa:   params.kappa   ?? 0.50,  // W>=T_allow iken açık cezası
    lambda_: params.lambda_ ?? 0.75,  // W< T_allow iken açık cezası
    mu:      params.mu      ?? 2.5,   // EASA: eksik görev varken kullanılmayan süre cezası

    scoreCap: params.scoreCap ?? 130, // puan üst sınırı
    incompletePenalty: params.incompletePenalty ?? 0.10, // tamamlanmamış ama hedefe ulaşmış iş için sabit ceza
  };

  const T_cap   = Math.max(0, Math.round(baseMinutes || 0));
  const T_leave = Math.min(T_cap, Math.max(0, Math.round(leaveMinutes || 0)));
  const T_overtime = Math.max(0, Math.round(overtimeMinutes || 0));
  const T_allow = Math.max(0, T_cap - T_leave + T_overtime);

  const pl = Array.isArray(planned) ? planned : [];
  const unpl = Array.isArray(unplanned) ? unplanned : [];

  const P = pl.map(p => Math.max(0, Math.round(p?.target_minutes || 0)));
  const A = pl.map(p => Math.max(0, Math.round(p?.actual_minutes || 0)));
  const Done = pl.map(p => !!p?.is_completed);

  const U = unpl.reduce((s, u) => s + Math.max(0, Math.round(u?.actual_minutes || 0)), 0);
  const sumPlannedMinutes = P.reduce((s, x) => s + x, 0);
  const sumActualPlanned  = A.reduce((s, x) => s + x, 0);

  if (T_allow <= 0) {
    return {
      T_cap, T_leave, T_allow,
      sumPlannedMinutes, sumActualPlanned, U,
      W: 0, L: 0,
      Pg: 0, Def: 0, F: 0, D: 0, unfinishedCount: 0,
      PlanlyScore: 0, UnplannedScore: 0, BonusB: 0,
      PenaltyP1: 0, PenaltyEASA: 0,
      ScoreRaw: 0, Score: 0,
    };
  }

  // A) Planlı skor (verim katsayısı ile) — affetmeyi (F) dağıtarak hesaplayacağız
  // (PlanlyScore hesaplaması, affetme hesaplarından sonra yapılacak)
  let PlanlyScore = 0;
  let IncompleteCapPenaltyRaw = 0; // satır içi tamamlanmama tavanından kaynaklı kayıp (ham, 0..1)
  let SpeedBonusRaw = 0; // görev bazında hız/tasarruf bonusu (ham, 0..1)

  // C) Affetme (time-credit)
  let Pg = 0;
  const deficits = [];
  for (let i = 0; i < pl.length; i++) {
    const t = P[i];
    const a = A[i];
    Pg += Done[i] ? t : Math.min(a, t);
    const def_i = Done[i] ? 0 : Math.max(0, t - a);
    deficits.push(def_i);
  }
  const Def = Math.max(0, T_allow - Pg);
  const F   = Math.min(U, Def);
  const D   = Def - F;

  const W = sumActualPlanned + U;
  const L = Math.max(0, T_allow - W);
  const unfinishedCount = Done.filter(d => !d).length;

  // E) Cezalar
  let PenaltyP1 = 0;
  // Eğer plandışı süre planlı eksikliği karşılıyorsa (D = 0 veya F >= Def), ceza yok
  if (D > 1e-9) {
    PenaltyP1 = (W >= T_allow ? cfg.kappa : cfg.lambda_) * (D / T_allow);
  }
  const PenaltyEASA = (unfinishedCount > 0 && L > 0) ? (cfg.mu * (L / T_allow)) : 0;

  // B) Plandışı skor (oran)
  // Eğer plandışı süre planlı eksikliği karşılıyorsa (F > 0), karşılanan eksiklik oranı kadar eklenir
  // Böylece Planlı Skor (örn 80%) + Plandışı Skor (örn 20%) = 100% olur
  const U_extra = Math.max(0, U - F);
  let UnplannedScore = 0;
  if (F > 1e-9) {
    // Plandışı süre planlı eksikliği karşılıyor → karşılanan eksiklik oranı kadar skor ekle
    UnplannedScore = F / T_allow;
  } else if (unfinishedCount === 0 && U_extra > 0) {
    // Tüm planlılar tamamlandı ve fazladan plandışı süre var → bonus olarak ekle
    UnplannedScore = U_extra / T_allow;
  }

  // A devamı) Planlı Skor — affetmeyi satırlara dağıtarak hesapla
  for (let i = 0; i < pl.length; i++) {
    const t = P[i];
    const a = A[i];
    if (t <= 0) continue;
    const w = t / T_allow;

    if (Done[i]) {
      // Verim katsayısı için üst sınır yok (eta_max kaldırıldı)
      const eff = Math.max(1.0, t / Math.max(a, 1));
      // Temel skor: w * 1.0 (bonus ayrı hesaplanacak)
      PlanlyScore += w * 1.0;
      // Hız bonusu: w * (eff - 1.0) (verim katsayısı 1.0'ı aşan kısım)
      if (eff > 1.0) {
        SpeedBonusRaw += w * (eff - 1.0);
      }
    } else {
      // Planlı skor, planlı işte harcanan gerçek süre oranına göre hesaplanır.
      // Plandışı süre, planlı skoru ARTIRMAZ; sadece cezaları önler.
      // Tamamlanmamış görev için tamamlanmadı cezası uygula
      // ANCAK: Plana dahil olmayan işler varsa (U > 0), tamamlanmadı cezası uygulanmaz
      // çünkü plandışı işler yüzünden planlı işler tamamlanamamış olabilir
      const hasUnplannedWork = U > 0;
      if (!hasUnplannedWork) {
        IncompleteCapPenaltyRaw += w * cfg.incompletePenalty;
      }
      
      let eff;
      if (a < t) {
        // Eksik süre var: gerçekleşen oran - tamamlanmadı cezası (sadece plandışı iş yoksa)
        if (hasUnplannedWork) {
          eff = Math.min(a / t, 1.0);
        } else {
          eff = Math.max(0, Math.min(a / t, 1.0) - cfg.incompletePenalty);
        }
      } else {
        // Hedefe ulaşmış ama tamamlanmamış: sabit tavan uygulanır (ceza zaten içinde)
        if (hasUnplannedWork) {
          eff = 1.0; // Plandışı iş varsa ceza yok
        } else {
          eff = clamp(1 - cfg.incompletePenalty, 0, 1);
        }
      }
      PlanlyScore += w * eff;
    }
  }

  // D) Bonus
  // Görev bazında hız/tasarruf bonusu (her görev için verim katsayısı 1.0'ı aşan kısım)
  let BonusB = SpeedBonusRaw;
  
  // Ekstra bonus (yalnız tüm planlılar bitti ve D==0 ise)
  if (unfinishedCount === 0 && Math.abs(D) < 1e-9) {
    const Saved = pl.reduce((s, p, i) => s + (Done[i] ? Math.max(0, P[i] - A[i]) : 0), 0);
    const s = Saved / T_allow;
    const U_extra = Math.max(0, U - F);
    const e = U_extra / T_allow;
    const extraBonus = Math.min(cfg.B_max, cfg.alpha * s + cfg.beta * e);
    BonusB += extraBonus;
  }

  // G) Mesai Bonusu (1.5x çarpan ile)
  // Mesai süresi kullanıldığında (W > T_cap), kullanılan mesai süresine göre bonus
  const T_overtime_used = Math.max(0, Math.min(T_overtime, W - T_cap));
  const OvertimeBonus = T_overtime_used > 0 ? (T_overtime_used / T_cap) * 1.5 : 0;

  // F) Final
  const ScoreRaw = PlanlyScore + UnplannedScore + BonusB + OvertimeBonus - (PenaltyP1 + PenaltyEASA);
  const Score = 100 * clamp(ScoreRaw, 0, cfg.scoreCap); // yüzde

  return {
    T_cap, T_leave, T_overtime, T_allow,
    sumPlannedMinutes, sumActualPlanned, U, W, L,
    Pg, Def, F, D, unfinishedCount,
    PlanlyScore, UnplannedScore, BonusB, OvertimeBonus,
    PenaltyP1, PenaltyEASA,
    IncompleteCapPenaltyRaw,
    ScoreRaw,
    Score,
    T_overtime_used,
  };
}
