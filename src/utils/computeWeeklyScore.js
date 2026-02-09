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
 *
 * Hesaplama mantığı:
 * - Her görev için Gerçekleşme(%) hesaplanır (tablodaki değerle aynı)
 * - Tamamlanan görev: rate = (hedef/gerçekleşme) * ağırlık → hız bonusu otomatik dahil
 * - Tamamlanmayan görev: ceza eklenerek effectiveActual bulunur, rate = (hedef/effectiveActual) * ağırlık
 * - Performans Skoru = Σ rate + plandışı skor + mesai bonusu - P1 cezası - EASA cezası
 *
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
    kappa:   params.kappa   ?? 0.50,  // W>=T_allow iken açık cezası
    lambda_: params.lambda_ ?? 0.75,  // W< T_allow iken açık cezası
    mu:      params.mu      ?? 2.5,   // EASA: eksik görev varken kullanılmayan süre cezası

    scoreCap: params.scoreCap ?? 130, // puan üst sınırı
    incompletePenalty: params.incompletePenalty ?? 0.10, // tamamlanmamış görev için sabit ceza oranı (hedefin %10'u)
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

  // A) Planlı skor — Tablodaki Gerçekleşme(%) formülüyle aynı hesaplama
  // Her görev için: rate = (t / effectiveActual) * w
  // Tamamlanan görev: effectiveActual = a (hız bonusu otomatik dahil)
  // Tamamlanmayan görev: effectiveActual = t + ceza (hız cezası + tamamlanmadı cezası dahil)
  let PlanlyScore = 0;
  let SpeedBonusRaw = 0; // hız bonusu (tamamlanan görevlerde rate > w olan fark)
  let IncompleteCapPenaltyRaw = 0; // tamamlanmama cezası (gösterim için)

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

  // E) Cezalar (P1 ve EASA)
  let PenaltyP1 = 0;
  if (D > 1e-9) {
    PenaltyP1 = (W >= T_allow ? cfg.kappa : cfg.lambda_) * (D / T_allow);
  }
  const PenaltyEASA = (unfinishedCount > 0 && L > 0) ? (cfg.mu * (L / T_allow)) : 0;

  // B) Plandışı skor
  const U_extra = Math.max(0, U - F);
  let UnplannedScore = 0;
  if (F > 1e-9) {
    UnplannedScore = F / T_allow;
  } else if (unfinishedCount === 0 && U_extra > 0) {
    UnplannedScore = U_extra / T_allow;
  }

  // A devamı) Planlı Skor — tablodaki Gerçekleşme(%) ile birebir aynı formül
  const hasUnplannedWork = U > 0;
  for (let i = 0; i < pl.length; i++) {
    const t = P[i];
    const a = A[i];
    if (t <= 0) continue;
    const w = t / T_allow; // ağırlık (0..1 arası)

    let effectiveActual;

    if (a === 0) {
      // Hiç çalışılmamışsa verimlilik 0
      effectiveActual = Infinity; // rate = 0
    } else if (Done[i]) {
      // Tamamlanan görev: effectiveActual = gerçekleşme (hız bonusu otomatik dahil)
      effectiveActual = a;
    } else {
      // Tamamlanmayan görev: ceza hesaplanır
      // Plandışı iş varsa tamamlanmadı cezası uygulanmaz
      if (hasUnplannedWork) {
        if (a > t) {
          // Gecikme cezası: (a - t) kadar fazla süre harcanmış
          effectiveActual = a; // sadece gecikme etkisi (tamamlanmadı cezası yok)
        } else if (a === t) {
          effectiveActual = a; // tam süre ama tamamlanmadı (ceza yok)
        } else {
          effectiveActual = a; // eksik süre (ceza yok)
        }
      } else {
        // Plandışı iş yoksa hem gecikme/eksik cezası hem tamamlanmadı cezası
        if (a > t) {
          // Gecikme + tamamlanmadı cezası
          const pen = (a - t) + (cfg.incompletePenalty * t);
          effectiveActual = t + pen;
        } else if (a === t) {
          // Tam süre ama tamamlanmadı: sadece tamamlanmadı cezası
          effectiveActual = t + (cfg.incompletePenalty * t);
        } else {
          // Eksik süre + tamamlanmadı cezası
          const shortage = Math.max(0, t - a);
          const pen = shortage + (cfg.incompletePenalty * t);
          effectiveActual = t + pen;
        }
      }
    }

    // Görevin Gerçekleşme(%) katkısı = (t / effectiveActual) * w
    const eff = effectiveActual > 0 && isFinite(effectiveActual) ? (t / effectiveActual) : 0;
    const rate = eff * w; // 0..1+ arası

    PlanlyScore += rate;

    // Hız bonusu/cezası takibi (gösterim için)
    if (Done[i] && rate > w) {
      // Tamamlanan görevde hız bonusu: rate > w demek daha hızlı tamamlanmış
      SpeedBonusRaw += (rate - w);
    }
    if (!Done[i] && !hasUnplannedWork) {
      // Tamamlanmama cezası (gösterim için)
      IncompleteCapPenaltyRaw += w * cfg.incompletePenalty;
    }
  }

  // D) Bonus — Hız bonusu doğrudan PlanlyScore'a dahil, ayrıca BonusB olarak takip
  const BonusB = SpeedBonusRaw;

  // G) Mesai Bonusu (1.5x çarpan ile)
  const T_overtime_used = Math.max(0, Math.min(T_overtime, W - T_cap));
  const OvertimeBonus = T_overtime_used > 0 ? (T_overtime_used / T_cap) * 1.5 : 0;

  // F) Final
  // PlanlyScore zaten hız bonusu/cezası dahil, ayrıca BonusB eklemeye gerek yok
  const ScoreRaw = PlanlyScore + UnplannedScore + OvertimeBonus - (PenaltyP1 + PenaltyEASA);
  const Score = 100 * clamp(ScoreRaw, 0, cfg.scoreCap); // yüzde

  return {
    T_cap, T_leave, T_overtime, T_allow,
    sumPlannedMinutes, sumActualPlanned, U, W, L,
    Pg, Def, F, D, unfinishedCount,
    PlanlyScore, UnplannedScore, BonusB, OvertimeBonus,
    PenaltyP1, PenaltyEASA,
    IncompleteCapPenaltyRaw,
    SpeedBonusRaw,
    ScoreRaw,
    Score,
    T_overtime_used,
  };
}
