import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WeeklyGoals } from '../../api';
import { getPerformanceGrade } from '../../utils/performance.js';
import { formatDateOnly } from '../../utils/date.js';

export function PerformanceDetailModal({
  open,
  onClose,
  userId,
  startDate,
  endDate,
  currentTheme,
  onExportExcel
}) {
  const theme = currentTheme || { background: '#1e293b', text: '#e2e8f0', textSecondary: '#94a3b8', border: '#334155', accent: '#3b82f6', tableBackground: '#1e293b', tableRowAlt: '#1a2332' };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());

  const loadDetail = useCallback(async () => {
    if (!userId || !startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await WeeklyGoals.userDetail({
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        include_items: 1
      });
      setData(res);
    } catch (err) {
      console.error('User detail load error:', err);
      setError(err.response?.data?.message || 'Kullanıcı detayı yüklenemedi');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    if (open && userId && startDate && endDate) {
      loadDetail();
    }
  }, [open, userId, startDate, endDate, loadDetail]);

  const toggleWeek = (weekStart) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekStart)) next.delete(weekStart);
      else next.add(weekStart);
      return next;
    });
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999997]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${theme.background}CC` }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div
          className="fixed z-[100200] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[900px] max-h-[90vh] rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden flex flex-col"
          style={{
            pointerEvents: 'auto',
            backgroundColor: theme.tableBackground || theme.background,
            borderColor: theme.border,
            color: theme.text
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
            <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
              Performans Detayı
              {data?.user?.name && ` - ${data.user.name}`}
            </h2>
            <div className="flex items-center gap-2">
              {onExportExcel && data && (
                <button
                  onClick={() => onExportExcel('detail', data)}
                  className="rounded px-3 py-1.5 text-sm font-medium border"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#fff',
                    borderColor: theme.accent
                  }}
                >
                  Excel'e Aktar
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded px-2 py-1 transition-colors"
                style={{ color: theme.textSecondary, backgroundColor: 'transparent' }}
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ padding: '10px' }}>
            {loading ? (
              <div className="py-12 text-center text-sm" style={{ color: theme.textSecondary }}>
                Yükleniyor...
              </div>
            ) : error ? (
              <div className="py-6 px-4 rounded-lg" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>
                {error}
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div className="rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background, padding: '10px' }}>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text }}>Özet</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs" style={{ color: theme.textSecondary }}>Ortalama Skor (Onaylı): <b style={{ color: getPerformanceGrade(data.summary?.avg_final_score_approved || 0).color }}>{data.summary?.avg_final_score_approved != null ? data.summary.avg_final_score_approved.toFixed(1) : '-'}</b></div>
                      <div className="text-xs" style={{ color: theme.textSecondary }}>
                        {data.summary?.weeks_approved != null ? `Onaylı Hafta: ${data.summary.weeks_approved}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: theme.textSecondary }}>Ortalama Skor (Tümü): <b style={{ color: getPerformanceGrade(data.summary?.avg_final_score || 0).color }}>{(data.summary?.avg_final_score || 0).toFixed(1)}</b></div>
                      <div className="text-xs" style={{ color: theme.textSecondary }}>
                        {data.summary?.grade ? `Derece: ${data.summary.grade}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: theme.textSecondary }}>Toplam Hafta: {data.summary?.total_weeks || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: theme.textSecondary }}>Dönem: {startDate} - {endDate}</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '10px' }}>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text }}>Haftalık Detaylar</h3>
                  {(data.weeks || []).length === 0 ? (
                    <div className="py-6 text-center text-sm rounded-lg border" style={{ color: theme.textSecondary, borderColor: theme.border, backgroundColor: theme.background }}>
                      Bu dönemde veri bulunamadı. (İçinde bulunulan hafta hariç tutulur.)
                    </div>
                  ) : (
                  <div className="space-y-2">
                    <div
                      className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2 rounded-t-lg text-xs font-semibold uppercase"
                      style={{ backgroundColor: theme.tableRowAlt || theme.background, borderColor: theme.border, borderWidth: '1px 1px 0 1px', color: theme.textSecondary, padding: '10px' }}
                    >
                      <span>Tarih</span>
                      <span>Hedef</span>
                      <span>Gerçekleşme</span>
                      <span>Skor</span>
                      <span>Durum</span>
                      <span></span>
                    </div>
                    {(data.weeks || []).map((week) => {
                      const isExpanded = expandedWeeks.has(week.week_start);
                      const grade = getPerformanceGrade(week.final_score || 0);
                      return (
                        <div
                          key={week.week_start}
                          className="rounded-lg border overflow-hidden"
                          style={{ borderColor: theme.border, backgroundColor: theme.background, padding: '10px' }}
                        >
                          <div
                            className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-3 items-center px-4 py-3 cursor-pointer"
                            style={{ backgroundColor: theme.tableRowAlt || theme.background, padding: '10px' }}
                            onClick={() => toggleWeek(week.week_start)}
                          >
                            <span className="text-sm font-medium" style={{ color: theme.text }}>
                              {formatDateOnly(week.week_start)}
                            </span>
                            <span className="text-sm" style={{ color: theme.textSecondary }}>
                              {Number(week.total_target_minutes || 0).toLocaleString('tr-TR')}
                            </span>
                            <span className="text-sm" style={{ color: theme.textSecondary }}>
                              {Number(week.total_actual_minutes || 0).toLocaleString('tr-TR')}
                            </span>
                            <span className="font-semibold" style={{ color: grade.color }}>
                              {(week.final_score || 0).toFixed(1)}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: (week.approval_status || 'pending') === 'approved' ? 'rgba(16, 185, 129, 0.2)' : (week.approval_status || 'pending') === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                color: (week.approval_status || 'pending') === 'approved' ? '#059669' : (week.approval_status || 'pending') === 'rejected' ? '#dc2626' : '#b45309'
                              }}
                            >
                              {(week.approval_status || 'pending') === 'approved' ? 'Onaylandı' : (week.approval_status || 'pending') === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                            </span>
                            <span className="text-lg justify-self-end" style={{ color: theme.textSecondary }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                          {isExpanded && Array.isArray(week.items) && week.items.length > 0 && (
                            <div className="px-4 py-3 border-t overflow-x-auto" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                              <table className="min-w-full text-sm" style={{ borderColor: theme.border }}>
                                <thead>
                                  <tr style={{ borderColor: theme.border, borderBottomWidth: '1px' }}>
                                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: theme.textSecondary }}>Başlık</th>
                                    <th className="text-right py-2 pr-4 font-semibold" style={{ color: theme.textSecondary }}>Hedef (dk)</th>
                                    <th className="text-right py-2 pr-4 font-semibold" style={{ color: theme.textSecondary }}>Gerçekleşen (dk)</th>
                                    <th className="text-center py-2 pr-4 font-semibold" style={{ color: theme.textSecondary }}>Tamamlandı</th>
                                    <th className="text-center py-2 font-semibold" style={{ color: theme.textSecondary }}>Plandışı</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {week.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderColor: theme.border, borderBottomWidth: idx < week.items.length - 1 ? '1px' : 0 }}>
                                      <td className="py-2 pr-4" style={{ color: theme.text }}>{item.title || '(Başlıksız)'}</td>
                                      <td className="text-right py-2 pr-4" style={{ color: theme.text }}>{item.target_minutes || 0}</td>
                                      <td className="text-right py-2 pr-4" style={{ color: theme.text }}>{item.actual_minutes || 0}</td>
                                      <td className="text-center py-2 pr-4" style={{ color: theme.text }}>{item.is_completed ? 'Evet' : 'Hayır'}</td>
                                      <td className="text-center py-2" style={{ color: theme.text }}>{item.is_unplanned ? 'Evet' : 'Hayır'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
