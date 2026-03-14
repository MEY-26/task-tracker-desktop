import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getMonday, fmtYMD, isoWeekNumber, getPeriodRange } from '../../utils/date.js';
import { getPerformanceGrade } from '../../utils/performance.js';
import { getDepartments } from '../../api';

const PERIOD_OPTIONS = [
  { value: 'single', label: 'Bu Hafta' },
  { value: '1m', label: 'Son 1 Ay' },
  { value: '3m', label: 'Son 3 Ay' },
  { value: '6m', label: 'Son 6 Ay' },
  { value: '1y', label: 'Son 1 Yıl' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'team_leader', label: 'Takım Lideri' },
  { value: 'team_member', label: 'Üye' },
];

export function WeeklyOverviewView({
  user,
  weeklyOverview,
  weeklyOverviewLoading,
  weeklyOverviewError,
  effectiveWeeklyOverviewWeekStart,
  multiWeekOverview,
  multiWeekOverviewLoading,
  multiWeekOverviewError,
  multiWeekFilters,
  setMultiWeekFilters,
  loadWeeklyOverview,
  loadMultiWeekOverview,
  onClose,
  onLoadOverview,
  onOpenWeeklyGoals,
  onOpenPerformanceDetail,
  onExportExcel
}) {
  const onLoadOverviewFn = onLoadOverview || loadWeeklyOverview;
  const { currentTheme } = useTheme();
  const isAdmin = user?.role === 'admin';
  const canShowFullScore = isAdmin;
  const canShowGradeOnly = user?.role === 'team_leader';
  const [periodMode, setPeriodMode] = useState('single');
  const [weeklyOverviewSort, setWeeklyOverviewSort] = useState({ key: null, dir: 'asc' });
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      getDepartments().then(setDepartmentOptions);
    }
  }, [user?.role]);

  useEffect(() => {
    if (periodMode === 'single') {
      loadWeeklyOverview(null);
    } else if (periodMode !== 'single' && periodMode !== 'custom') {
      const { start_date, end_date } = getPeriodRange(periodMode);
      loadMultiWeekOverview({
        start_date,
        end_date,
        roles: multiWeekFilters.roles.join(','),
        departments: multiWeekFilters.departments?.join(',') || '',
        exclude_user_ids: multiWeekFilters.exclude_user_ids.join(',')
      });
    }
  }, [periodMode]);

  const handlePeriodChange = (value) => {
    setPeriodMode(value);
    if (value === 'single') {
      loadWeeklyOverview(null);
    } else if (value !== 'custom') {
      const { start_date, end_date } = getPeriodRange(value);
      loadMultiWeekOverview({
        start_date,
        end_date,
        roles: multiWeekFilters.roles.join(','),
        departments: multiWeekFilters.departments?.join(',') || '',
        exclude_user_ids: multiWeekFilters.exclude_user_ids.join(',')
      });
    }
  };

  const handleApplyMultiWeekFilters = () => {
    const filterParams = {
      roles: multiWeekFilters.roles.join(','),
      departments: multiWeekFilters.departments?.join(',') || '',
      exclude_user_ids: multiWeekFilters.exclude_user_ids.join(',')
    };
    if (periodMode === 'custom' && customStartDate && customEndDate) {
      loadMultiWeekOverview({
        start_date: customStartDate,
        end_date: customEndDate,
        ...filterParams
      });
    } else if (periodMode !== 'single' && periodMode !== 'custom') {
      const { start_date, end_date } = getPeriodRange(periodMode);
      loadMultiWeekOverview({
        start_date,
        end_date,
        ...filterParams
      });
    }
  };

  const toggleRole = (role) => {
    setMultiWeekFilters(prev => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles };
    });
  };

  const setDepartmentFilter = (dep) => {
    setMultiWeekFilters(prev => {
      const departments = dep ? [dep] : [];
      return { ...prev, departments };
    });
  };

  const toggleWeeklyOverviewSort = (key) => {
    setWeeklyOverviewSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: null, dir: 'asc' };
      return { key, dir: 'asc' };
    });
  };

  const isMultiWeekMode = periodMode !== 'single';
  const displayItems = isMultiWeekMode ? (multiWeekOverview?.items || []) : (weeklyOverview?.items || []);
  const isLoading = isMultiWeekMode ? multiWeekOverviewLoading : weeklyOverviewLoading;
  const error = isMultiWeekMode ? multiWeekOverviewError : weeklyOverviewError;

  const numericKeysSingle = new Set(['total_target_minutes', 'total_actual_minutes', 'unplanned_minutes', 'planned_score', 'unplanned_bonus', 'final_score']);
  const numericKeysMulti = new Set(['avg_target_minutes', 'avg_actual_minutes', 'avg_final_score', 'avg_final_score_approved', 'avg_planned_score', 'avg_unplanned_bonus', 'total_weeks_with_data', 'weeks_approved']);

  const sortedItems = useMemo(() => {
    const items = Array.isArray(displayItems) ? [...displayItems] : [];
    const { key, dir } = weeklyOverviewSort;
    if (!key) return items;

    const direction = dir === 'desc' ? -1 : 1;
    const numericKeys = isMultiWeekMode ? numericKeysMulti : numericKeysSingle;
    return items.sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];
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
  }, [displayItems, weeklyOverviewSort, isMultiWeekMode]);

  const handleRowClick = (item) => {
    if (isMultiWeekMode) {
      let start_date, end_date;
      if (periodMode === 'custom' && customStartDate && customEndDate) {
        start_date = customStartDate;
        end_date = customEndDate;
      } else if (periodMode !== 'custom') {
        const range = getPeriodRange(periodMode);
        start_date = range.start_date;
        end_date = range.end_date;
      } else {
        const range = getPeriodRange('6m');
        start_date = range.start_date;
        end_date = range.end_date;
      }
      onOpenPerformanceDetail?.(item.user_id, start_date, end_date);
    } else {
      const targetWeek = weeklyOverview?.week_start || effectiveWeeklyOverviewWeekStart;
      onOpenWeeklyGoals?.(targetWeek, item.user_id);
    }
  };

  const handleExportExcel = () => {
    if (isMultiWeekMode) {
      onExportExcel?.('overview', {
        ...multiWeekOverview,
        filters: multiWeekFilters,
        periodMode
      });
    } else {
      onExportExcel?.('overview', {
        week_start: weeklyOverview?.week_start || effectiveWeeklyOverviewWeekStart,
        items: weeklyOverview?.items || [],
        periodMode: 'single'
      });
    }
  };

  return (
    <div className="flex justify-center">
      <div className="px-2 xs:px-3 sm:px-4 lg:px-6" style={{ width: '1440px' }}>
        <div className="space-y-4" style={{ minWidth: '1440px', paddingTop: '10px', paddingBottom: '10px' }}>
          <div className="flex flex-wrap items-center gap-3 border-b pb-3 overflow-x-auto" style={{ paddingBottom: '10px', borderColor: currentTheme.border }}>
            <button
              onClick={onClose}
              className="px-4 xs:px-5 sm:px-6 py-2.5 text-[18px] font-medium rounded-lg transition-colors whitespace-nowrap border"
              style={{
                backgroundColor: currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border
              }}
            >
              Görev Listesine Dön
            </button>

            {isAdmin && (
              <>
                <span className="w-[10px]"></span>
                <select
                  value={periodMode}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="rounded-lg border px-3 py-2.5 text-[18px] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.border,
                    borderRadius: 8,
                    height: '40px'
                  }}
                >
                  {PERIOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  <option value="custom">Özel Aralık</option>
                </select>
              </>
            )}

            {periodMode === 'single' && (
              <>
                <span className="w-[10px]"></span>
                <button
                  className="rounded px-3 py-1 border text-[18px] transition-colors"
                  style={{
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.border
                  }}
                    onClick={() => {
                    const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                    base.setDate(base.getDate() - 7);
                    onLoadOverviewFn(fmtYMD(getMonday(base)));
                  }}
                >
                  ◀ Önceki
                </button>
                <span className="w-[10px]"></span>
                <input
                  type="date"
                  className="rounded border px-3 py-1 text-[18px] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.border,
                    height: '40px'
                  }}
                  value={effectiveWeeklyOverviewWeekStart}
                  onChange={(e) => onLoadOverviewFn(e.target.value)}
                />
                <span className="w-[10px]"></span>
                <button
                  className="rounded px-3 py-1 border text-[18px] transition-colors"
                  style={{
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.border
                  }}
                    onClick={() => {
                    const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                    base.setDate(base.getDate() + 7);
                    onLoadOverviewFn(fmtYMD(getMonday(base)));
                  }}
                >
                  Sonraki ▶
                </button>
              </>
            )}

            {isAdmin && isMultiWeekMode && (
              <>
                <span className="w-[10px]"></span>
                <div className="flex flex-wrap items-center gap-2">
                  {ROLE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={multiWeekFilters.roles.includes(opt.value)}
                        onChange={() => toggleRole(opt.value)}
                        className="w-4 h-4"
                        style={{ accentColor: currentTheme.accent, height: '20px', width: '20px' }}
                      />
                      <span className="text-[18px]" style={{ color: currentTheme.text }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {departmentOptions.length > 0 && (
                  <select
                    value={multiWeekFilters.departments?.[0] || ''}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="rounded-lg border px-3 py-2.5 text-[18px] focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                      borderRadius: 8,
                      height: '40px',
                      marginLeft: '10px',
                      minWidth: '220px'
                    }}
                  >
                    <option value="">Tüm Departmanlar</option>
                    {departmentOptions.map(dep => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                )}
                {periodMode === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="rounded-lg border px-3 py-2.5 text-xs xs:text-sm"
                      style={{
                        backgroundColor: currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                        borderRadius: 8
                      }}
                    />
                    <span style={{ color: currentTheme.text }}>-</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="rounded-lg border px-3 py-2.5 text-xs xs:text-sm"
                      style={{
                        backgroundColor: currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                        borderRadius: 8
                      }}
                    />
                  </>
                )}
                <button
                  onClick={handleApplyMultiWeekFilters}
                  className="rounded-lg px-4 py-2.5 text-xs xs:text-sm font-medium border"
                  style={{
                    backgroundColor: currentTheme.accent,
                    color: '#fff',
                    borderColor: currentTheme.accent,
                    borderRadius: 8
                  }}
                >
                  Filtrele
                </button>
              </>
            )}

            {onExportExcel && (
              <>
                <span className="w-[10px]"></span>
                <button
                  onClick={handleExportExcel}
                  className="rounded-lg px-4 py-2.5 text-xs xs:text-sm font-medium border"
                  style={{
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.border,
                    borderRadius: 8
                  }}
                >
                  Excel'e Aktar
                </button>
              </>
            )}

            <div className="ml-auto text-sm whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>
              {periodMode === 'single' ? (
                (() => {
                  const cur = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                  const next = new Date(cur);
                  next.setDate(next.getDate() + 7);
                  return `Bu hafta: ${isoWeekNumber(cur)} • Gelecek hafta: ${isoWeekNumber(next)}`;
                })()
              ) : isMultiWeekMode && multiWeekOverview?.weeks_count ? (
                `${multiWeekOverview.start_date} - ${multiWeekOverview.end_date} (${multiWeekOverview.weeks_count} hafta)`
              ) : null}
            </div>
          </div>

          {error && (
            <div className="border px-4 py-3 rounded-lg" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div className="rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: currentTheme.background }}>
            {isLoading ? (
              <div className="py-12 text-center text-sm" style={{ color: currentTheme.textSecondary }}>
                {isMultiWeekMode ? 'Rapor yükleniyor...' : 'Haftalık hedef listesi yükleniyor...'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y text-[18px] cursor-pointer" style={{ borderColor: currentTheme.border }}>
                  <thead className="text-white text-[18px]" style={{ backgroundColor: currentTheme.tableHeader }}>
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('name')} role="button">Kullanıcı</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('leader_name')} role="button">Lider</th>
                      {isMultiWeekMode && departmentOptions.length > 0 ? (
                        <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('department')} role="button">Departman</th>
                      ) : null}
                      {isMultiWeekMode ? (
                        <>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('avg_target_minutes')} role="button">Ort. Hedef</th>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('avg_actual_minutes')} role="button">Ort. Gerçekleşme</th>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('avg_final_score_approved')} role="button" title="Sadece onaylanmış haftalar">Ort. Skor (Onaylı)</th>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('avg_final_score')} role="button" title="Tüm haftalar (onaylı, bekleyen, reddedilen)">Ort. Skor (Tümü)</th>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('grade')} role="button">Derece</th>
                          <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('total_weeks_with_data')} role="button">Verili Hafta</th>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.length === 0 ? (
                      <tr>
                        <td colSpan={isMultiWeekMode ? (departmentOptions.length > 0 ? 9 : 8) : (canShowFullScore ? 10 : (canShowGradeOnly ? 8 : 7))} className="px-4 py-6 text-center text-sm" style={{ color: currentTheme.textSecondary }}>
                          Listelenecek kullanıcı bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      sortedItems.map((item, index) => {
                        const score = isMultiWeekMode ? (item.avg_final_score || 0) : (item.final_score || 0);
                        const grade = getPerformanceGrade(Number(score));
                        const baseBg = index % 2 === 0
                          ? (currentTheme.tableBackground || currentTheme.background)
                          : (currentTheme.tableRowAlt || currentTheme.background);
                        return (
                          <tr
                            key={item.user_id}
                            onClick={() => handleRowClick(item)}
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
                            {isMultiWeekMode && departmentOptions.length > 0 ? (
                              <td className="px-4 py-3 text-sm text-left" style={{ color: currentTheme.text }}>{item.department || '-'}</td>
                            ) : null}
                            {isMultiWeekMode ? (
                              <>
                                <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.avg_target_minutes || 0).toLocaleString('tr-TR')}</td>
                                <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.avg_actual_minutes || 0).toLocaleString('tr-TR')}</td>
                                <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: item.avg_final_score_approved != null ? getPerformanceGrade(Number(item.avg_final_score_approved)).color : currentTheme.textSecondary }}>
                                  {item.avg_final_score_approved != null ? Number(item.avg_final_score_approved).toFixed(1) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: grade.color }}>{Number(item.avg_final_score || 0).toFixed(1)}</td>
                                <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: grade.color }}>{item.grade || grade.grade}</td>
                                <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{item.total_weeks_with_data || 0}</td>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
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
