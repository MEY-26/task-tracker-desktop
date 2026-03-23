import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { LeaveRequests, EditGrants, SystemSettings } from '../../api';
import { getMonday, fmtYMD, isWeekday, addDays } from '../../utils/date';

const LEAVE_WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const DEFAULT_SETTINGS = {
  work_start: '08:00',
  work_end: '18:15',
  full_day_minutes: 540,
  breaks_default: [['10:00', '10:15'], ['13:00', '13:30'], ['16:00', '16:15']],
  breaks_friday: [['10:00', '10:15'], ['13:00', '14:30'], ['16:00', '16:15']],
};

const DURATION_OPTIONS = [
  { value: 1, label: '1 saat' },
  { value: 2, label: '2 saat' },
  { value: 4, label: '4 saat' },
  { value: 8, label: '8 saat' },
  { value: 24, label: '1 gün' },
  { value: 48, label: '2 gün' },
  { value: 72, label: '3 gün' },
  { value: 168, label: '1 hafta' },
];

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calculateLeaveMinutesForDay(dayOfWeek, start, end, settings = DEFAULT_SETTINGS) {
  const workStart = settings.work_start || DEFAULT_SETTINGS.work_start;
  const workEnd = settings.work_end || DEFAULT_SETTINGS.work_end;
  const fullDay = settings.full_day_minutes ?? DEFAULT_SETTINGS.full_day_minutes;
  const isFriday = dayOfWeek === 5;
  const breaks = (isFriday ? settings.breaks_friday : settings.breaks_default) || (isFriday ? DEFAULT_SETTINGS.breaks_friday : DEFAULT_SETTINGS.breaks_default);
  const startTime = start || workStart;
  const endTime = end || workEnd;

  if (startTime === workStart && endTime === workEnd) {
    return fullDay;
  }

  const leaveStartM = timeToMinutes(startTime);
  const leaveEndM = timeToMinutes(endTime);
  let rawMinutes = Math.max(0, leaveEndM - leaveStartM);

  let breakOverlap = 0;
  for (const [bStart, bEnd] of breaks) {
    const bStartM = timeToMinutes(bStart);
    const bEndM = timeToMinutes(bEnd);
    const overlapStart = Math.max(leaveStartM, bStartM);
    const overlapEnd = Math.min(leaveEndM, bEndM);
    if (overlapStart < overlapEnd) {
      breakOverlap += overlapEnd - overlapStart;
    }
  }

  return Math.max(0, rawMinutes - breakOverlap);
}

function getDayOfWeekFromDateStr(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export function PermissionManagementModal({
  open,
  onClose,
  selectedUserIds = [],
  onSuccess,
  addNotification,
  loadWeeklyGoals,
}) {
  const { currentTheme } = useTheme();
  const { addNotification: addNotificationFromContext } = useNotification();
  const notifyFn = addNotification || addNotificationFromContext;

  const [systemSettings, setSystemSettings] = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState('leave');

  const [selectedDates, setSelectedDates] = useState(new Set());
  const [dayTimes, setDayTimes] = useState({});
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [leaveSaving, setLeaveSaving] = useState(false);

  const [weekStart, setWeekStart] = useState(fmtYMD(getMonday()));
  const [durationHours, setDurationHours] = useState(4);
  const [grantSaving, setGrantSaving] = useState(false);
  const [editGrantItems, setEditGrantItems] = useState([]);
  const [editGrantListLoading, setEditGrantListLoading] = useState(false);
  const [editGrantDeletingId, setEditGrantDeletingId] = useState(null);

  const [existingLeaveRaw, setExistingLeaveRaw] = useState([]);
  const [leaveListLoading, setLeaveListLoading] = useState(false);
  const [leaveClearingKey, setLeaveClearingKey] = useState(null);

  const selectedCount = selectedUserIds?.length || 0;

  const flattenLeaveForTable = useCallback(
    (items) => {
      const ws = systemSettings.work_start || '08:00';
      const we = systemSettings.work_end || '18:15';
      const rows = [];
      if (!Array.isArray(items)) return rows;
      for (const item of items) {
        if (!item?.week_start) continue;
        const mon = new Date(`${item.week_start}T12:00:00`);
        LEAVE_WEEKDAY_KEYS.forEach((key, i) => {
          if (!item[key]) return;
          const dateStr = fmtYMD(addDays(mon, i));
          const dayOfWeek = getDayOfWeekFromDateStr(dateStr);
          const start = item[`${key}_start`] || null;
          const end = item[`${key}_end`] || null;
          const minutes = calculateLeaveMinutesForDay(dayOfWeek, start || ws, end || we, systemSettings);
          const [y, m, d] = dateStr.split('-');
          const dateLabel = d && m && y ? `${d}.${m}.${y}` : dateStr;
          rows.push({
            rowKey: `${item.id}-${key}`,
            leaveRequestId: item.id,
            weekdayKey: key,
            userId: item.user_id,
            userName: item.user_name || item.user_email || (item.user_id != null ? `Kullanıcı #${item.user_id}` : '—'),
            dateStr,
            dateLabel,
            minutes,
            timeLabel:
              !start && !end
                ? 'Tam gün'
                : `${(start || ws).slice(0, 5)} – ${(end || we).slice(0, 5)}`,
          });
        });
      }
      rows.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      return rows;
    },
    [systemSettings]
  );

  const existingLeaveRows = flattenLeaveForTable(existingLeaveRaw);

  const fetchEditGrants = useCallback(async () => {
    setEditGrantListLoading(true);
    try {
      const data = await EditGrants.list();
      setEditGrantItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error('Edit grants list error:', err);
      notifyFn?.(err?.response?.data?.message || 'Aktif izinler yüklenemedi.', 'error');
    } finally {
      setEditGrantListLoading(false);
    }
  }, [notifyFn]);

  const fetchExistingLeaves = useCallback(async () => {
    if (!selectedUserIds?.length) {
      setExistingLeaveRaw([]);
      return;
    }
    setLeaveListLoading(true);
    try {
      const data = await LeaveRequests.listForUsers(selectedUserIds);
      setExistingLeaveRaw(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error('Existing leaves list error:', err);
      notifyFn?.(err?.response?.data?.message || 'Kayıtlı izinler yüklenemedi.', 'error');
      setExistingLeaveRaw([]);
    } finally {
      setLeaveListLoading(false);
    }
  }, [selectedUserIds, notifyFn]);

  useEffect(() => {
    if (open && activeTab === 'grant') {
      fetchEditGrants();
    }
  }, [open, activeTab, fetchEditGrants]);

  useEffect(() => {
    if (open && activeTab === 'leave' && selectedCount > 0) {
      fetchExistingLeaves();
    }
    if (!open) {
      setExistingLeaveRaw([]);
    }
  }, [open, activeTab, selectedCount, fetchExistingLeaves]);

  useEffect(() => {
    if (open) {
      SystemSettings.get()
        .then((data) => setSystemSettings({
          work_start: data.work_start ?? DEFAULT_SETTINGS.work_start,
          work_end: data.work_end ?? DEFAULT_SETTINGS.work_end,
          full_day_minutes: data.full_day_minutes ?? DEFAULT_SETTINGS.full_day_minutes,
          breaks_default: Array.isArray(data.breaks_default) ? data.breaks_default : DEFAULT_SETTINGS.breaks_default,
          breaks_friday: Array.isArray(data.breaks_friday) ? data.breaks_friday : DEFAULT_SETTINGS.breaks_friday,
        }))
        .catch(() => {});
    }
  }, [open]);

  const toggleDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    if (!isWeekday(d)) return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
        setDayTimes((t) => {
          const t2 = { ...t };
          delete t2[dateStr];
          return t2;
        });
      } else {
        next.add(dateStr);
        const ws = systemSettings.work_start || '08:00';
        const we = systemSettings.work_end || '18:15';
        setDayTimes((t) => ({ ...t, [dateStr]: { start: ws, end: we } }));
      }
      return next;
    });
  };

  const setDayTime = (dateStr, field, value) => {
    const ws = systemSettings.work_start || '08:00';
    const we = systemSettings.work_end || '18:15';
    setDayTimes((prev) => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || { start: ws, end: we }),
        [field]: value,
      },
    }));
  };

  const handleLeaveSave = async () => {
    if (selectedCount === 0) return;
    if (selectedDates.size === 0) {
      notifyFn?.('En az bir tarih seçin.', 'error');
      return;
    }

    setLeaveSaving(true);
    try {
      const ws = systemSettings.work_start || '08:00';
      const we = systemSettings.work_end || '18:15';
      const dates = [...selectedDates].sort();
      const datesPayload = dates.map((d) => {
        const times = dayTimes[d] || { start: ws, end: we };
        return {
          date: d,
          start: times.start === ws && times.end === we ? null : times.start,
          end: times.start === ws && times.end === we ? null : times.end,
        };
      });

      await LeaveRequests.bulkCreate({
        user_ids: selectedUserIds,
        dates: datesPayload,
      });

      notifyFn?.('Toplu izin kaydedildi.', 'success');
      await fetchExistingLeaves();
      loadWeeklyGoals?.();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Bulk leave error:', err);
      notifyFn?.(err?.response?.data?.message || 'Kaydedilemedi.', 'error');
    } finally {
      setLeaveSaving(false);
    }
  };

  const handleGrantSave = async () => {
    if (selectedCount === 0) return;
    setGrantSaving(true);
    try {
      await EditGrants.create({
        user_ids: selectedUserIds,
        week_start: weekStart,
        duration_hours: durationHours,
      });
      notifyFn?.('Özel düzenleme izni verildi.', 'success');
      await fetchEditGrants();
      loadWeeklyGoals?.();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Edit grant error:', err);
      notifyFn?.(err?.response?.data?.message || 'İzin verilemedi', 'error');
    } finally {
      setGrantSaving(false);
    }
  };

  const handleClearLeaveDay = async (leaveRequestId, weekdayKey, rowKey) => {
    setLeaveClearingKey(rowKey);
    try {
      await LeaveRequests.clearWeekday(leaveRequestId, weekdayKey);
      notifyFn?.('İzin günü kaldırıldı.', 'success');
      await fetchExistingLeaves();
      loadWeeklyGoals?.();
    } catch (err) {
      console.error('Clear leave day error:', err);
      notifyFn?.(err?.response?.data?.message || 'Gün kaldırılamadı.', 'error');
    } finally {
      setLeaveClearingKey(null);
    }
  };

  const handleRemoveEditGrant = async (id) => {
    setEditGrantDeletingId(id);
    try {
      await EditGrants.delete(id);
      notifyFn?.('İzin kaldırıldı.', 'success');
      await fetchEditGrants();
      loadWeeklyGoals?.();
    } catch (err) {
      console.error('Edit grant delete error:', err);
      notifyFn?.(err?.response?.data?.message || 'İzin kaldırılamadı.', 'error');
    } finally {
      setEditGrantDeletingId(null);
    }
  };

  const formatGrantWeek = (weekStartStr) => {
    if (!weekStartStr) return '—';
    const [y, m, d] = weekStartStr.split('-');
    return d && m && y ? `${d}.${m}.${y}` : weekStartStr;
  };

  const formatGrantExpires = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return String(iso);
    }
  };

  if (!open) return null;

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() || 7) - 1;
  const daysInMonth = last.getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1));
  const nextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

  const sortedSelectedDates = [...selectedDates].sort();

  return createPortal(
    <div className="fixed inset-0 z-[999999]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} style={{ pointerEvents: 'auto' }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div
          className="fixed z-[100300] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[640px] rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
          style={{
            pointerEvents: 'auto',
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-3 border-b"
            style={{ backgroundColor: currentTheme.tableHeader || currentTheme.border, borderColor: currentTheme.border }}
          >
            <div />
            <h3 className="text-lg font-semibold text-center" style={{ color: currentTheme.text }}>
              İzin Yönetimi
            </h3>
            <button
              onClick={onClose}
              className="rounded px-2 py-1 transition-colors justify-self-end"
              style={{ color: currentTheme.text, backgroundColor: 'transparent' }}
            >
              ✕
            </button>
          </div>

          <div className="flex gap-0 border-b" style={{ borderColor: currentTheme.border }}>
            <button
              onClick={() => setActiveTab('leave')}
              className="flex-1 py-3 transition-colors"
              style={{
                borderBottom: activeTab === 'leave' ? `2px solid ${currentTheme.accent}` : '2px solid transparent',
                color: activeTab === 'leave' ? currentTheme.accent : currentTheme.textSecondary,
                fontWeight: activeTab === 'leave' ? 600 : 400,
                backgroundColor: 'transparent',
              }}
            >
              Tatil / İzin Girişi
            </button>
            <button
              onClick={() => setActiveTab('grant')}
              className="flex-1 py-3 transition-colors"
              style={{
                borderBottom: activeTab === 'grant' ? `2px solid ${currentTheme.accent}` : '2px solid transparent',
                color: activeTab === 'grant' ? currentTheme.accent : currentTheme.textSecondary,
                fontWeight: activeTab === 'grant' ? 600 : 400,
                backgroundColor: 'transparent',
              }}
            >
              Özel Düzenleme İzni
            </button>
          </div>

          <div className="p-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <p className="text-sm mb-4" style={{ color: currentTheme.textSecondary }}>
              {selectedCount} kullanıcı seçili
            </p>

            {activeTab === 'leave' && (
              <>
                <p className="text-sm mb-4" style={{ color: currentTheme.textSecondary }}>
                  Takvimden izin verilecek günleri seçin. Tam gün yerine saatlik izin için başlangıç ve bitiş saatlerini girin.
                </p>

                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="rounded px-2 py-1"
                    style={{ color: currentTheme.text, backgroundColor: currentTheme.tableRowAlt || 'transparent' }}
                  >
                    ‹
                  </button>
                  <span className="font-medium" style={{ color: currentTheme.text }}>
                    {MONTH_NAMES[month]} {year}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded px-2 py-1"
                    style={{ color: currentTheme.text, backgroundColor: currentTheme.tableRowAlt || 'transparent' }}
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center mb-4">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((label) => (
                    <div key={label} className="text-xs font-medium py-1" style={{ color: currentTheme.textSecondary }}>
                      {label}
                    </div>
                  ))}
                  {cells.map((d, idx) => {
                    if (d === null) return <div key={`empty-${idx}`} />;
                    const date = new Date(year, month, d);
                    const dateStr = fmtYMD(date);
                    const weekday = date.getDay();
                    const isSatSun = weekday === 0 || weekday === 6;
                    const selected = selectedDates.has(dateStr);
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => !isSatSun && toggleDate(dateStr)}
                        disabled={isSatSun}
                        className="rounded py-1.5 text-sm transition-colors"
                        style={{
                          backgroundColor: selected ? (currentTheme.accent || '#3b82f6') : 'transparent',
                          color: selected ? '#fff' : isSatSun ? (currentTheme.textSecondary || currentTheme.text) : currentTheme.text,
                          opacity: isSatSun ? 0.5 : 1,
                          cursor: isSatSun ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                {sortedSelectedDates.length > 0 && (
                  <div className="pt-4 border-t space-y-3 mb-4" style={{ borderColor: currentTheme.border }}>
                    <h4 className="text-sm font-medium" style={{ color: currentTheme.text }}>
                      Seçili günler – saat aralığı
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {sortedSelectedDates.map((dateStr) => {
                        const ws = systemSettings.work_start || '08:00';
                        const we = systemSettings.work_end || '18:15';
                        const times = dayTimes[dateStr] || { start: ws, end: we };
                        const dayOfWeek = getDayOfWeekFromDateStr(dateStr);
                        const minutes = calculateLeaveMinutesForDay(dayOfWeek, times.start, times.end, systemSettings);
                        const [d, m, y] = dateStr.split('-');
                        const label = `${d}.${m}.${y}`;
                        return (
                          <div
                            key={dateStr}
                            className="flex flex-wrap items-center gap-2 py-2 px-3 rounded"
                            style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.background, minHeight: '40px' }}
                          >
                            <span className="text-[16px] font-medium shrink-0" style={{ color: currentTheme.text, minWidth: '80px' }}>
                              {label}
                            </span>
                            <label className="flex items-center gap-1 text-xs" style={{ color: currentTheme.textSecondary }}>
                              Başlangıç:
                              <input
                                type="time"
                                value={times.start}
                                onChange={(e) => setDayTime(dateStr, 'start', e.target.value)}
                                className="rounded px-2 py-1 text-[16px]"
                                style={{
                                  backgroundColor: currentTheme.tableBackground || currentTheme.background,
                                  color: currentTheme.text,
                                  borderColor: currentTheme.border,
                                  borderWidth: '1px',
                                  borderStyle: 'solid',
                                }}
                              />
                            </label>
                            <label className="flex items-center gap-1 text-xs" style={{ color: currentTheme.textSecondary }}>
                              Bitiş:
                              <input
                                type="time"
                                value={times.end}
                                onChange={(e) => setDayTime(dateStr, 'end', e.target.value)}
                                className="rounded px-2 py-1 text-[16px]"
                                style={{
                                  backgroundColor: currentTheme.tableBackground || currentTheme.background,
                                  color: currentTheme.text,
                                  borderColor: currentTheme.border,
                                  borderWidth: '1px',
                                  borderStyle: 'solid',
                                }}
                              />
                            </label>
                            <span className="text-xs font-semibold shrink-0" style={{ color: currentTheme.accent }}>
                              {minutes} dk
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: currentTheme.text }}>
                    Kayıtlı izinler
                  </h4>
                  {leaveListLoading ? (
                    <p className="text-sm mb-4" style={{ color: currentTheme.textSecondary }}>
                      Yükleniyor...
                    </p>
                  ) : existingLeaveRows.length === 0 ? (
                    <p className="text-sm mb-4" style={{ color: currentTheme.textSecondary }}>
                      Seçili kullanıcılar için kayıtlı izin günü yok.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border mb-4" style={{ borderColor: currentTheme.border }}>
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr style={{ backgroundColor: currentTheme.tableHeader || currentTheme.border }}>
                            {selectedCount > 1 ? (
                              <th className="px-3 py-2 font-medium" style={{ color: currentTheme.text }}>
                                Kullanıcı
                              </th>
                            ) : null}
                            <th className="px-3 py-2 font-medium" style={{ color: currentTheme.text }}>
                              Tarih
                            </th>
                            <th className="px-3 py-2 font-medium" style={{ color: currentTheme.text }}>
                              İzin süresi
                            </th>
                            <th className="px-3 py-2 font-medium" style={{ color: currentTheme.text }}>
                              Zaman aralığı
                            </th>
                            <th className="px-3 py-2 font-medium w-[1%] whitespace-nowrap" style={{ color: currentTheme.text }}>
                              {' '}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {existingLeaveRows.map((row) => {
                            const hoursStr =
                              row.minutes >= 60
                                ? `${(row.minutes / 60).toFixed(row.minutes % 60 === 0 ? 0 : 1)} saat`
                                : `${row.minutes} dk`;
                            return (
                              <tr
                                key={row.rowKey}
                                style={{
                                  borderTop: `1px solid ${currentTheme.border}`,
                                  backgroundColor: currentTheme.tableRowAlt || 'transparent',
                                }}
                              >
                                {selectedCount > 1 ? (
                                  <td className="px-3 py-2 align-middle" style={{ color: currentTheme.text }}>
                                    {row.userName}
                                  </td>
                                ) : null}
                                <td className="px-3 py-2 align-middle" style={{ color: currentTheme.text }}>
                                  {row.dateLabel}
                                </td>
                                <td className="px-3 py-2 align-middle" style={{ color: currentTheme.text }}>
                                  <span className="font-semibold" style={{ color: currentTheme.accent }}>
                                    {row.minutes} dk
                                  </span>
                                  <span className="block text-xs mt-0.5" style={{ color: currentTheme.textSecondary }}>
                                    ({hoursStr})
                                  </span>
                                </td>
                                <td className="px-3 py-2 align-middle" style={{ color: currentTheme.textSecondary }}>
                                  {row.timeLabel}
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleClearLeaveDay(row.leaveRequestId, row.weekdayKey, row.rowKey)}
                                    disabled={leaveClearingKey === row.rowKey}
                                    className="rounded px-2 py-1 text-xs font-medium border transition-opacity"
                                    style={{
                                      borderColor: currentTheme.border,
                                      color: currentTheme.text,
                                      opacity: leaveClearingKey === row.rowKey ? 0.6 : 1,
                                      backgroundColor: currentTheme.accent || currentTheme.background,
                                    }}
                                  >
                                    {leaveClearingKey === row.rowKey ? '…' : 'Kaldır'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleLeaveSave}
                    disabled={leaveSaving || selectedDates.size === 0}
                    className="flex-1 min-w-[120px] max-w-[180px] px-4 py-2 rounded font-medium"
                    style={{
                      backgroundColor: currentTheme.accent,
                      color: '#fff',
                      opacity: leaveSaving || selectedDates.size === 0 ? 0.7 : 1,
                    }}
                  >
                    {leaveSaving ? 'Kaydediliyor...' : 'İzin Ver'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 min-w-[120px] max-w-[180px] px-4 py-2 rounded border"
                    style={{
                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  >
                    İptal
                  </button>
                </div>
              </>
            )}

            {activeTab === 'grant' && (
              <>
                <p className="text-base mb-4" style={{ color: currentTheme.textSecondary }}>
                  Seçili kullanıcılara haftalık hedeflerde hedef düzenleme yetkisi verilir. Süre dolunca yetki otomatik kalkar.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-medium mb-2" style={{ color: currentTheme.text }}>
                      Hafta
                    </label>
                    <input
                      type="date"
                      value={weekStart}
                      onChange={(e) => setWeekStart(e.target.value)}
                      className="rounded border px-3 w-full"
                      style={{
                        minHeight: '44px',
                        fontSize: '16px',
                        backgroundColor: currentTheme.tableRowAlt || currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium mb-2" style={{ color: currentTheme.text }}>
                      Süre
                    </label>
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value))}
                      className="rounded border px-3 w-full"
                      style={{
                        minHeight: '44px',
                        fontSize: '16px',
                        backgroundColor: currentTheme.tableRowAlt || currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                      }}
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={handleGrantSave}
                      disabled={grantSaving}
                      className="flex-1 min-w-[120px] max-w-[180px] px-4 py-2 rounded font-medium"
                      style={{
                        backgroundColor: currentTheme.accent,
                        color: '#fff',
                        opacity: grantSaving ? 0.7 : 1,
                      }}
                    >
                      {grantSaving ? 'Veriliyor...' : 'İzin Ver'}
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 min-w-[120px] max-w-[180px] px-4 py-2 rounded border"
                      style={{
                        backgroundColor: currentTheme.tableBackground || currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                      }}
                    >
                      İptal
                    </button>
                  </div>

                  <div className="mt-6 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: currentTheme.text }}>
                      Aktif izinler
                    </h4>
                    {editGrantListLoading ? (
                      <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
                        Yükleniyor...
                      </p>
                    ) : editGrantItems.length === 0 ? (
                      <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
                        Kayıtlı aktif izin yok.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: currentTheme.border }}>
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr style={{ backgroundColor: currentTheme.tableHeader || currentTheme.border }}>
                              <th className="px-3 py-2 font-medium" style={{ color: currentTheme.text }}>
                                Kullanıcı
                              </th>
                              <th className="px-3 py-2 font-medium" style={{ color: currentTheme.text }}>
                                Hafta
                              </th>
                              <th className="px-3 py-2 font-medium" style={{ color: currentTheme.text }}>
                                Bitiş
                              </th>
                              <th className="px-3 py-2 font-medium w-[1%] whitespace-nowrap" style={{ color: currentTheme.text }}>
                                {' '}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {editGrantItems.map((row) => {
                              const displayName =
                                row.user_name ||
                                row.user_email ||
                                (row.user_id != null ? `Kullanıcı #${row.user_id}` : '—');
                              return (
                                <tr
                                  key={row.id}
                                  style={{ borderTop: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.tableRowAlt || 'transparent' }}
                                >
                                  <td className="px-3 py-2 align-middle" style={{ color: currentTheme.text }}>
                                    {displayName}
                                  </td>
                                  <td className="px-3 py-2 align-middle" style={{ color: currentTheme.text }}>
                                    {formatGrantWeek(row.week_start)}
                                  </td>
                                  <td className="px-3 py-2 align-middle" style={{ color: currentTheme.text }}>
                                    {formatGrantExpires(row.expires_at)}
                                  </td>
                                  <td className="px-3 py-2 align-middle">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditGrant(row.id)}
                                      disabled={editGrantDeletingId === row.id}
                                      className="rounded px-2 py-1 text-xs font-medium border transition-opacity"
                                      style={{
                                        borderColor: currentTheme.border,
                                        color: currentTheme.text,
                                        opacity: editGrantDeletingId === row.id ? 0.6 : 1,
                                        backgroundColor: currentTheme.accent || currentTheme.background,
                                      }}
                                    >
                                      {editGrantDeletingId === row.id ? '…' : 'Kaldır'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
