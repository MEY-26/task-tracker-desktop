import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveRequests } from '../../api';
import { getMonday, fmtYMD, addDays, isWeekday, isPast } from '../../utils/date';

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Expand leave_request item to Set of date strings (YYYY-MM-DD) */
function itemToDates(item) {
  const set = new Set();
  if (!item?.week_start) return set;
  const mon = new Date(item.week_start + 'T12:00:00');
  WEEKDAY_KEYS.forEach((key, i) => {
    if (item[key]) set.add(fmtYMD(addDays(mon, i)));
  });
  return set;
}

/** Build monday..friday from selectedDates for a given week_start */
function weekFlagsFromDates(weekStart, selectedDates) {
  const mon = new Date(weekStart + 'T12:00:00');
  const flags = {};
  WEEKDAY_KEYS.forEach((key, i) => {
    flags[key] = selectedDates.has(fmtYMD(addDays(mon, i)));
  });
  return flags;
}

export function LeaveRequestModal({ open, onClose, onLeaveSaved }) {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const { addNotification } = useNotification();
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSelectPast = ['admin', 'team_leader'].includes(user?.role);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await LeaveRequests.list();
      setItems(res.items || []);
    } catch {
      addNotification('İzin listesi yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (open) {
      loadItems();
      setViewMonth(new Date());
    }
  }, [open, loadItems]);

  useEffect(() => {
    if (!open) return;
    const next = new Set();
    items.forEach((item) => {
      itemToDates(item).forEach((d) => next.add(d));
    });
    setSelectedDates(next);
  }, [open, items]);

  const toggleDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    if (!isWeekday(d)) return;
    if (!canSelectPast && isPast(d)) return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const weeksToWrite = new Set();
      selectedDates.forEach((dateStr) => {
        const mon = getMonday(new Date(dateStr + 'T12:00:00'));
        weeksToWrite.add(fmtYMD(mon));
      });

      for (const ws of weeksToWrite) {
        const flags = weekFlagsFromDates(ws, selectedDates);
        await LeaveRequests.create({
          week_start: ws,
          ...flags,
        });
      }

      for (const item of items) {
        const flags = weekFlagsFromDates(item.week_start, selectedDates);
        if (!Object.values(flags).some(Boolean)) {
          await LeaveRequests.delete(item.id);
        }
      }

      addNotification('İzin kaydedildi.', 'success');
      loadItems();
      onLeaveSaved?.();
    } catch (err) {
      addNotification(err.response?.data?.message || 'Kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await LeaveRequests.delete(id);
      const item = items.find((x) => x.id === id);
      if (item) {
        const toRemove = itemToDates(item);
        setSelectedDates((prev) => {
          const next = new Set(prev);
          toRemove.forEach((d) => next.delete(d));
          return next;
        });
      }
      addNotification('İzin silindi.', 'success');
      loadItems();
      onLeaveSaved?.();
    } catch (err) {
      addNotification(err.response?.data?.message || 'Silinemedi.', 'error');
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

  return (
    <div className="fixed inset-0 z-[999998]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} style={{ pointerEvents: 'auto' }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div
          className="fixed z-[100260] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[420px] rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
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
              İzin Bildirimi
            </h3>
            <button
              onClick={onClose}
              className="rounded px-2 py-1 transition-colors justify-self-end"
              style={{ color: currentTheme.text, backgroundColor: 'transparent' }}
            >
              ✕
            </button>
          </div>
          <div className="space-y-4" style={{ padding: '24px 32px' }}>
            <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
              Takvimden izinli olduğunuz günleri seçin. İzin süresi haftalık hedeflerde otomatik yansır.
            </p>
            {!canSelectPast && (
              <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                Takım üyeleri sadece ileriye yönelik izin girebilir.
              </p>
            )}

            <div className="flex items-center justify-between">
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

            <div className="grid grid-cols-7 gap-0.5 text-center">
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
                const disabled = isSatSun || (!canSelectPast && isPast(date));
                const selected = selectedDates.has(dateStr);
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => !disabled && toggleDate(dateStr)}
                    disabled={disabled}
                    className="rounded py-1.5 text-sm transition-colors"
                    style={{
                      backgroundColor: selected ? (currentTheme.accent || '#3b82f6') : 'transparent',
                      color: selected ? '#fff' : disabled ? (currentTheme.textSecondary || currentTheme.text) : currentTheme.text,
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 min-w-[120px] max-w-[180px] px-4 py-2 rounded font-medium"
                style={{
                  backgroundColor: currentTheme.accent,
                  color: '#fff',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
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
                Kapat
              </button>
            </div>

            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: currentTheme.text }}>
                  Kayıtlı İzinler
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {items.map((item) => {
                    const dayLabels = [];
                    if (item.monday) dayLabels.push('Pzt');
                    if (item.tuesday) dayLabels.push('Sal');
                    if (item.wednesday) dayLabels.push('Çar');
                    if (item.thursday) dayLabels.push('Per');
                    if (item.friday) dayLabels.push('Cum');
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-2 px-3 rounded"
                        style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.background }}
                      >
                        <span className="min-w-0 truncate" style={{ color: currentTheme.text }}>
                          {item.week_start} — {dayLabels.length ? dayLabels.join(', ') : '-'}
                        </span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Sil"
                          className="inline-flex items-center justify-center text-[18px] transition-colors shrink-0"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '9999px',
                            backgroundColor: currentTheme.border,
                            color: currentTheme.text,
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = currentTheme.accent;
                            e.target.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = currentTheme.border;
                            e.target.style.color = currentTheme.text;
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
