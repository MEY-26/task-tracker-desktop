import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getMonday, fmtYMD, isoWeekNumber } from '../../utils/date.js';
import { getPerformanceGrade } from '../../utils/performance.js';

export function WeeklyOverviewView({
  user,
  weeklyOverview,
  weeklyOverviewLoading,
  weeklyOverviewError,
  effectiveWeeklyOverviewWeekStart,
  onClose,
  onLoadOverview,
  onOpenWeeklyGoals
}) {
  const { currentTheme } = useTheme();
  const canShowFullScore = user?.role === 'admin';
  const canShowGradeOnly = user?.role === 'team_leader';
  const [weeklyOverviewSort, setWeeklyOverviewSort] = useState({ key: null, dir: 'asc' });

  const toggleWeeklyOverviewSort = (key) => {
    setWeeklyOverviewSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: null, dir: 'asc' };
      return { key, dir: 'asc' };
    });
  };

  const sortedWeeklyOverview = useMemo(() => {
    const items = Array.isArray(weeklyOverview.items) ? [...weeklyOverview.items] : [];
    const { key, dir } = weeklyOverviewSort;
    if (!key) return items;

    const direction = dir === 'desc' ? -1 : 1;
    return items.sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];

      const numericKeys = new Set(['total_target_minutes', 'total_actual_minutes', 'unplanned_minutes', 'planned_score', 'unplanned_bonus', 'final_score']);

      if (numericKeys.has(key)) {
        const numA = Number(av || 0);
        const numB = Number(bv || 0);
        if (numA === numB) return 0;
        return numA > numB ? direction : -direction;
      }

      av = (av ?? '').toString().toLowerCase();
      bv = (bv ?? '').toString().toLowerCase();
      if (av === bv) return 0;
      return av > bv ? direction : -direction;
    });
  }, [weeklyOverview.items, weeklyOverviewSort]);

  return (
    <div className="flex justify-center">
      <div className="px-2 xs:px-3 sm:px-4 lg:px-6" style={{ width: '1440px' }}>
        <div className="space-y-4" style={{ minWidth: '1440px', paddingTop: '10px', paddingBottom: '10px' }}>
          <div className="flex flex-wrap items-center gap-3 border-b pb-3 overflow-x-auto" style={{ paddingBottom: '10px', borderColor: currentTheme.border }}>
            <button
              onClick={onClose}
              className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
              style={{
                backgroundColor: currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border
              }}
            >
              Görev Listesine Dön
            </button>
            <span className="w-[10px]"></span>
            <button
              className="rounded px-3 py-1 border text-sm transition-colors"
              style={{
                backgroundColor: currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border
              }}
              onClick={() => {
                const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                base.setDate(base.getDate() - 7);
                onLoadOverview(fmtYMD(getMonday(base)));
              }}
            >
              ◀ Önceki
            </button>
            <span className="w-[10px]"></span>
            <input
              type="date"
              className="rounded border px-3 py-1 text-[24px] focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border
              }}
              value={effectiveWeeklyOverviewWeekStart}
              onChange={(e) => onLoadOverview(e.target.value)}
            />
            <span className="w-[10px]"></span>
            <button
              className="rounded px-3 py-1 border text-sm transition-colors"
              style={{
                backgroundColor: currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border
              }}
              onClick={() => {
                const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                base.setDate(base.getDate() + 7);
                onLoadOverview(fmtYMD(getMonday(base)));
              }}
            >
              Sonraki ▶
            </button>
            <div className="ml-auto text-sm whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>
              {(() => {
                const cur = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                const next = new Date(cur);
                next.setDate(next.getDate() + 7);
                return `Bu hafta: ${isoWeekNumber(cur)} • Gelecek hafta: ${isoWeekNumber(next)}`;
              })()}
            </div>
          </div>
          {weeklyOverviewError && (
            <div className="border px-4 py-3 rounded-lg" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>
              {weeklyOverviewError}
            </div>
          )}
          <div className="rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: currentTheme.background }}>
            {weeklyOverviewLoading ? (
              <div className="py-12 text-center text-sm" style={{ color: currentTheme.textSecondary }}>
                Haftalık hedef listesi yükleniyor...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y text-[18px] cursor-pointer" style={{ borderColor: currentTheme.border }}>
                  <thead className="text-white text-[18px]" style={{ backgroundColor: currentTheme.tableHeader }}>
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('name')} role="button">Kullanıcı</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('leader_name')} role="button">Lider</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('total_target_minutes')} role="button">Hedef</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('total_actual_minutes')} role="button">Gerçekleşme</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('unplanned_minutes')} role="button">Plandışı</th>
                      {(canShowFullScore || canShowGradeOnly) && (
                        <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('approval_status')} role="button">Onay Durumu</th>
                      )}
                      {canShowFullScore && (
                        <>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('planned_score')} role="button">Planlı</th>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('unplanned_bonus')} role="button">Plandışı</th>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('final_score')} role="button">Final Skor</th>
                        </>
                      )}
                      {canShowGradeOnly && (
                        <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('final_score')} role="button">Değerlendirme</th>
                      )}
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('total_actual_minutes')} role="button">Toplam Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyOverview.items.length === 0 ? (
                      <tr>
                        <td colSpan={canShowFullScore ? 10 : (canShowGradeOnly ? 8 : 7)} className="px-4 py-6 text-center text-sm" style={{ color: currentTheme.textSecondary }}>
                          Listelenecek kullanıcı bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      sortedWeeklyOverview.map((item, index) => {
                        const grade = getPerformanceGrade(Number(item.final_score || 0));
                        const targetWeek = weeklyOverview.week_start || effectiveWeeklyOverviewWeekStart;
                        const baseBg = index % 2 === 0
                          ? (currentTheme.tableBackground || currentTheme.background)
                          : (currentTheme.tableRowAlt || currentTheme.background);
                        return (
                          <tr
                            key={item.user_id}
                            onClick={() => onOpenWeeklyGoals(targetWeek, item.user_id)}
                            className="transition-colors"
                            style={{
                              backgroundColor: baseBg,
                              height: '50px',
                              borderColor: currentTheme.border
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.accent + '40';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = baseBg;
                            }}
                          >
                            <td className="px-4 py-3 text-sm text-left" style={{ color: currentTheme.accent }}>{item.name}</td>
                            <td className="px-4 py-3 text-sm text-left" style={{ color: currentTheme.text }}>{item.leader_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.total_target_minutes || 0).toLocaleString('tr-TR')}</td>
                            <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.total_actual_minutes || 0).toLocaleString('tr-TR')}</td>
                            <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.unplanned_minutes || 0).toLocaleString('tr-TR')}</td>
                            {(canShowFullScore || canShowGradeOnly) && (
                              <td className="px-4 py-3 text-sm text-center">
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: (item.approval_status || 'pending') === 'approved' ? 'rgba(16, 185, 129, 0.2)' : (item.approval_status || 'pending') === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                    color: (item.approval_status || 'pending') === 'approved' ? '#059669' : (item.approval_status || 'pending') === 'rejected' ? '#dc2626' : '#b45309'
                                  }}
                                >
                                  {(item.approval_status || 'pending') === 'approved' ? 'Onaylandı' : (item.approval_status || 'pending') === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor'}
                                </span>
                              </td>
                            )}
                            {canShowFullScore && (
                              <>
                                <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.planned_score || 0).toFixed(1)}</td>
                                <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.unplanned_bonus || 0).toFixed(1)}</td>
                                <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: grade.color }}>{Number(item.final_score || 0).toFixed(1)}</td>
                              </>
                            )}
                            {canShowGradeOnly && (
                              <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: grade.color }}>{grade.grade}</td>
                            )}
                            <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number((item.total_actual_minutes || 0) + (item.unplanned_minutes || 0))}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
