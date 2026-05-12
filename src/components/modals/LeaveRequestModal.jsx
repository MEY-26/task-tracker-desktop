import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveRequests, SystemSettings, CalendarOverrides } from '../../api';
import {
  monthGridRange,
  normalizeCalendarRow,
  buildCalendarItemsByDate,
  workingCalendarDayInfo,
  workingCalendarCellColor,
  workingCalendarCellTitle,
  workingCalendarCellWorkTimeLine,
  workingCalendarCellNativeTooltipLines,
  workingCalendarCellBreakRangeLines,
} from '../../utils/workingCalendarShared';
import { getMonday, fmtYMD, addDays, isWeekday, isPast } from '../../utils/date';
import { useOutsideClickClose } from '../../hooks/useOutsideClickClose';
import { WorkingCalendarMonthGrid } from '../calendar/WorkingCalendarMonthGrid';
import { WORKING_CALENDAR_CELL_BUTTON_CLASS } from '../calendar/workingCalendarStyles';
import { ModalHeader } from '../shared/ModalHeader';

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAY_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const LEAVE_DAY_BLUE = 'rgba(37, 99, 235, 0.58)';
const LEAVE_SELECTION_BLUE = 'rgba(59, 130, 246, 0.4)';
const DEFAULT_SETTINGS = {
  work_start: '08:00',
  work_end: '18:15',
  full_day_minutes: 540,
  breaks_default: [['10:00', '10:15'], ['13:00', '13:30'], ['16:00', '16:15']],
  breaks_friday: [['10:00', '10:15'], ['13:00', '14:30'], ['16:00', '16:15']],
};

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** dayOfWeek: 1=Mon .. 5=Fri, settings: { work_start, work_end, full_day_minutes, breaks_default, breaks_friday } */
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

/** Build monday_start, monday_end, ... from selectedDates and dayTimes */
function weekTimesFromDates(weekStart, selectedDates, dayTimes) {
  const mon = new Date(weekStart + 'T12:00:00');
  const out = {};
  WEEKDAY_KEYS.forEach((key, i) => {
    const dateStr = fmtYMD(addDays(mon, i));
    if (selectedDates.has(dateStr) && dayTimes[dateStr]) {
      out[`${key}_start`] = dayTimes[dateStr].start;
      out[`${key}_end`] = dayTimes[dateStr].end;
    }
  });
  return out;
}

/** 1=Mon .. 5=Fri from dateStr */
function getDayOfWeekFromDateStr(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function formatDateWithWeekday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const wd = WEEKDAY_SHORT_TR[d.getDay()] || '';
  return `${dd}.${mm}.${yyyy} - ${wd}`;
}

function formatCompactDateGroups(dateStrings) {
  const sorted = [...dateStrings]
    .map((s) => ({ raw: s, date: new Date(s + 'T12:00:00') }))
    .filter((x) => !Number.isNaN(x.date.getTime()))
    .sort((a, b) => a.date - b.date);

  const groups = [];
  for (const item of sorted) {
    const current = item.date;
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup) {
      groups.push([item]);
      continue;
    }
    const last = lastGroup[lastGroup.length - 1].date;
    const diffDays = Math.round((current - last) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      lastGroup.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups.map((group) => {
    const first = group[0].raw;
    const firstLabel = formatDateWithWeekday(first);
    if (group.length === 1) return firstLabel;
    const weekdays = group
      .slice(1)
      .map((g) => WEEKDAY_SHORT_TR[g.date.getDay()] || '')
      .filter(Boolean);
    return `${firstLabel}, ${weekdays.join(', ')}`;
  });
}

/** Aynı leave_request satırını tam gün (gruplu gösterim) ve saatlik (ayrı satır) olarak ayırır. */
function splitLeaveItemDisplay(item, settings) {
  const mon = new Date(item.week_start + 'T12:00:00');
  const ws = settings.work_start || DEFAULT_SETTINGS.work_start;
  const we = settings.work_end || DEFAULT_SETTINGS.work_end;
  const fullDayDateStrs = [];
  const fullDayKeys = [];
  const hourlyRows = [];
  WEEKDAY_KEYS.forEach((key, i) => {
    if (!item[key]) return;
    const dateStr = fmtYMD(addDays(mon, i));
    const st = item[`${key}_start`];
    const en = item[`${key}_end`];
    const startTime = st || ws;
    const endTime = en || we;
    const dow = getDayOfWeekFromDateStr(dateStr);
    if (startTime === ws && endTime === we) {
      fullDayDateStrs.push(dateStr);
      fullDayKeys.push(key);
    } else {
      const minutes = calculateLeaveMinutesForDay(dow, st, en, settings);
      const startLabel = (st || ws).slice(0, 5);
      const endLabel = (en || we).slice(0, 5);
      hourlyRows.push({
        weekdayKey: key,
        dateStr,
        startLabel,
        endLabel,
        minutes,
      });
    }
  });
  return { fullDayDateStrs, fullDayKeys, hourlyRows };
}

/** Kayıtlı izin takvim hücresi: tam gün yalnız "İzin"; saatlikte saat aralığı */
function savedLeaveLabelForDate(dateStr, leaveItems, settings) {
  const ws = settings.work_start || DEFAULT_SETTINGS.work_start;
  const we = settings.work_end || DEFAULT_SETTINGS.work_end;
  for (const item of leaveItems) {
    if (!item?.week_start) continue;
    const mon = new Date(item.week_start + 'T12:00:00');
    for (let i = 0; i < WEEKDAY_KEYS.length; i += 1) {
      const key = WEEKDAY_KEYS[i];
      if (!item[key]) continue;
      const dStr = fmtYMD(addDays(mon, i));
      if (dStr !== dateStr) continue;
      const st = item[`${key}_start`];
      const en = item[`${key}_end`];
      const startPad = (st || ws).slice(0, 5);
      const endPad = (en || we).slice(0, 5);
      const wsPad = ws.slice(0, 5);
      const wePad = we.slice(0, 5);
      if (startPad === wsPad && endPad === wePad) {
        return { mode: 'full' };
      }
      return { mode: 'hourly', range: `${startPad}–${endPad}` };
    }
  }
  return { mode: 'full' };
}

export function LeaveRequestModal({ open, onClose, onLeaveSaved }) {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const { addNotification } = useNotification();
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SETTINGS);
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [dayTimes, setDayTimes] = useState({});
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [historyRange, setHistoryRange] = useState('1y');
  const [selectedHistoryYear, setSelectedHistoryYear] = useState(String(new Date().getFullYear()));
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearingLine, setClearingLine] = useState(null);
  const [calendarOverrideItems, setCalendarOverrideItems] = useState([]);
  /** null = loading; object = map date -> minutes (empty {} after error) */
  const [minuteMap, setMinuteMap] = useState(null);
  const modalRef = useRef(null);

  const canSelectPast = ['admin', 'team_leader'].includes(user?.role);

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
    if (!open) return undefined;
    const { from, to } = monthGridRange(viewMonth.getFullYear(), viewMonth.getMonth());
    setMinuteMap(null);
    let cancelled = false;
    (async () => {
      try {
        const [cal, eff] = await Promise.all([
          CalendarOverrides.list({ from, to }),
          CalendarOverrides.effectiveDayMinutes({ from, to }),
        ]);
        if (cancelled) return;
        setCalendarOverrideItems((cal.items || []).map(normalizeCalendarRow));
        setMinuteMap(eff.minutes_by_day || {});
      } catch (err) {
        if (!cancelled) {
          addNotification(err.response?.data?.message || 'Takvim senkronize edilemedi.', 'error');
          setCalendarOverrideItems([]);
          setMinuteMap({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, viewMonth, addNotification]);

  useOutsideClickClose(open, modalRef, onClose);

  const savedDates = useMemo(() => {
    const dates = new Set();
    items.forEach((item) => itemToDates(item).forEach((d) => dates.add(d)));
    return dates;
  }, [items]);

  const itemsByDate = useMemo(
    () => buildCalendarItemsByDate(calendarOverrideItems),
    [calendarOverrideItems]
  );

  const calendarCells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const { from: gridStartStr } = monthGridRange(y, m);
    const startDate = new Date(`${gridStartStr}T12:00:00`);
    const out = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [viewMonth]);

  const calendarReady = minuteMap !== null;

  const canSelectDateForLeave = useCallback(
    (dateStr, d) => {
      if (!calendarReady) return false;
      if (Object.prototype.hasOwnProperty.call(minuteMap, dateStr)) {
        return minuteMap[dateStr] > 0;
      }
      return isWeekday(d);
    },
    [calendarReady, minuteMap]
  );

  const toggleDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    if (!canSelectDateForLeave(dateStr, d)) return;
    if (!canSelectPast && isPast(d)) return;
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
    setDayTimes((prev) => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || { start: DEFAULT_SETTINGS.work_start, end: DEFAULT_SETTINGS.work_end }),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (selectedDates.size === 0) {
      addNotification('Kaydetmek için en az bir gün seçin.', 'error');
      return;
    }
    setSaving(true);
    try {
      const weeksToWrite = new Set();
      selectedDates.forEach((dateStr) => {
        const mon = getMonday(new Date(dateStr + 'T12:00:00'));
        weeksToWrite.add(fmtYMD(mon));
      });

      for (const ws of weeksToWrite) {
        const flags = weekFlagsFromDates(ws, selectedDates);
        const times = weekTimesFromDates(ws, selectedDates, dayTimes);
        await LeaveRequests.create({
          week_start: ws,
          ...flags,
          ...times,
        });
      }

      addNotification('İzin kaydedildi.', 'success');
      setSelectedDates(new Set());
      setDayTimes({});
      await loadItems();
      onLeaveSaved?.();
    } catch (err) {
      addNotification(err.response?.data?.message || 'Kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeCalendarSelectionForDates = (dateStrs) => {
    if (!dateStrs?.length) return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      dateStrs.forEach((d) => next.delete(d));
      return next;
    });
    setDayTimes((prev) => {
      const t2 = { ...prev };
      dateStrs.forEach((d) => {
        delete t2[d];
      });
      return t2;
    });
  };

  const handleClearFullDayGroup = async (item, fullDayKeys) => {
    if (fullDayKeys.length === 0) return;
    if (!window.confirm('Bu tam gün izin günlerini kaldırmak istediğinize emin misiniz?')) return;
    setClearingLine(`fd-${item.id}`);
    try {
      const toClearDates = splitLeaveItemDisplay(item, systemSettings).fullDayDateStrs;
      for (const wk of fullDayKeys) {
        await LeaveRequests.clearWeekday(item.id, wk);
      }
      removeCalendarSelectionForDates(toClearDates);
      addNotification('Tam gün izinler kaldırıldı.', 'success');
      await loadItems();
      onLeaveSaved?.();
    } catch (err) {
      addNotification(err?.response?.data?.message || 'Kaldırılamadı.', 'error');
    } finally {
      setClearingLine(null);
    }
  };

  const handleClearOneWeekday = async (leaveId, weekdayKey, dateStr) => {
    setClearingLine(`${leaveId}-${weekdayKey}`);
    try {
      await LeaveRequests.clearWeekday(leaveId, weekdayKey);
      if (dateStr) removeCalendarSelectionForDates([dateStr]);
      addNotification('İzin günü kaldırıldı.', 'success');
      await loadItems();
      onLeaveSaved?.();
    } catch (err) {
      addNotification(err?.response?.data?.message || 'Kaldırılamadı.', 'error');
    } finally {
      setClearingLine(null);
    }
  };

  const sortedSelectedDates = [...selectedDates].sort();
  const filteredItems = useMemo(() => {
    const monthsByRange = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
    };
    const months = monthsByRange[historyRange] ?? 12;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const rangeStart = new Date(now);
    rangeStart.setMonth(rangeStart.getMonth() - months);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(now);
    rangeEnd.setMonth(rangeEnd.getMonth() + months);
    rangeEnd.setHours(23, 59, 59, 999);

    const rangeFiltered = items.filter((item) => {
      const dates = [...itemToDates(item)];
      if (dates.length === 0) return false;
      return dates.some((dateStr) => {
        const d = new Date(dateStr + 'T12:00:00');
        if (Number.isNaN(d.getTime())) return false;
        return d >= rangeStart && d <= rangeEnd;
      });
    });

    return rangeFiltered.filter((item) => {
      const dates = [...itemToDates(item)];
      return dates.some((dateStr) => {
        const d = new Date(dateStr + 'T12:00:00');
        if (Number.isNaN(d.getTime())) return false;
        return String(d.getFullYear()) === selectedHistoryYear;
      });
    });
  }, [items, historyRange, selectedHistoryYear]);

  if (!open) return null;

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const prevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1));
  const nextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

  return createPortal(
    <div className="fixed inset-0 z-[999998]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} style={{ pointerEvents: 'auto' }} />
      <div
        className="relative z-10 flex min-h-full items-center justify-center p-4"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          ref={modalRef}
          className="fixed z-[100260] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[960px] max-h-[90vh] rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden flex flex-col"
          style={{
            pointerEvents: 'auto',
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader title="İzin Bildirimi" onClose={onClose} theme={currentTheme} />
          <div className="space-y-4 overflow-y-auto no-scrollbar" style={{ padding: '24px 32px' }}>
            <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
              Hafta sonu ve resmi tatiller yeşil; şirket tatilleri daha açık yeşil. Hafta sonu veya tatilde çalışma istisnaları sıcak turuncu. Kayıtlı izin günleriniz mavi ve hücrede "İzin" yazar; saatlik izinde saat aralığı gösterilir.
              Tam gün yerine saatlik izin için başlangıç ve bitiş saatlerini girin; mola süreleri otomatik düşülür.
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

            {!calendarReady && (
              <div className="text-xs text-center py-1" style={{ color: currentTheme.textSecondary }}>
                Takvim yükleniyor…
              </div>
            )}

            <WorkingCalendarMonthGrid headerColor={currentTheme.textSecondary}>
              {calendarCells.map((dateObj) => {
                const dateStr = fmtYMD(dateObj);
                const inMonth = dateObj.getMonth() === month;
                const info = workingCalendarDayInfo(dateObj, itemsByDate);
                let baseBg = workingCalendarCellColor(info.list, info.baseHoliday);
                if (baseBg === 'transparent') {
                  baseBg = `${currentTheme.tableRowAlt || currentTheme.border}33`;
                }
                const subtitle = workingCalendarCellTitle(info.list, info.baseHoliday);
                const workTimeLine = workingCalendarCellWorkTimeLine(info.list, dateObj, systemSettings);
                const firstRow = info.list[0];
                const isWorkCell = firstRow && (firstRow.type === 'working' || firstRow.type === 'custom');
                const breakLines = isWorkCell ? workingCalendarCellBreakRangeLines(info.list, dateObj, systemSettings) : [];
                let hoverTip = workingCalendarCellNativeTooltipLines(
                  info.list,
                  info.baseHoliday,
                  dateObj,
                  systemSettings,
                );
                const isSaved = savedDates.has(dateStr);
                const savedLeaveHint = isSaved ? savedLeaveLabelForDate(dateStr, items, systemSettings) : null;
                if (isSaved) {
                  const tipExtra =
                    savedLeaveHint?.mode === 'hourly'
                      ? `İzin: ${savedLeaveHint.range}`
                      : 'İzin (tam gün)';
                  hoverTip = [tipExtra, hoverTip].filter(Boolean).join('\n');
                }
                const selected = selectedDates.has(dateStr);
                const pastBlocked = !canSelectPast && isPast(dateObj);
                const workSelectable = canSelectDateForLeave(dateStr, dateObj);
                const disabled =
                  !inMonth || !calendarReady || isSaved || pastBlocked || !workSelectable;

                let bg = baseBg;
                if (isSaved) bg = LEAVE_DAY_BLUE;
                else if (selected) bg = LEAVE_SELECTION_BLUE;

                const selOutline = selected && !isSaved;
                const borderColor = selOutline
                  ? (currentTheme.accent || '#3b82f6')
                  : isSaved
                    ? 'rgba(37, 99, 235, 0.95)'
                    : (currentTheme.border || '#444');

                const textColor =
                  isSaved || selected
                    ? '#fff'
                    : disabled
                      ? (currentTheme.textSecondary || currentTheme.text)
                      : currentTheme.text;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => !disabled && toggleDate(dateStr)}
                    disabled={disabled}
                    className={`${WORKING_CALENDAR_CELL_BUTTON_CLASS} text-sm`}
                    style={{
                      opacity: inMonth ? 1 : 0.35,
                      backgroundColor: bg,
                      color: textColor,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      borderWidth: selOutline ? 2 : 1,
                      borderStyle: 'solid',
                      borderColor,
                      boxShadow: selOutline ? `0 0 0 1px ${currentTheme.accent || '#3b82f6'}40` : 'none',
                    }}
                    title={
                      isSaved
                        ? [
                            'Bu gün zaten kayıtlı izinlerde. Değiştirmek için kaydı silip yeniden ekleyin.',
                            hoverTip,
                          ]
                            .filter(Boolean)
                            .join('\n')
                        : hoverTip || dateStr
                    }
                  >
                    {isSaved ? (
                      <div
                        className="flex flex-1 min-h-0 min-w-0 w-full flex-row items-start"
                        style={{ opacity: selected ? 0.92 : 1 }}
                      >
                        <div className="font-semibold shrink-0 tabular-nums leading-none" style={{ fontSize: '17px' }}>
                          {dateObj.getDate()}
                        </div>
                        <div className="min-h-0 min-w-0 max-w-[72%] ml-auto flex flex-col gap-0.5 text-right">
                          <div className="shrink-0 text-[12px] font-semibold leading-snug">İzin</div>
                          {savedLeaveHint?.mode === 'hourly' ? (
                            <div className="shrink-0 text-[11px] leading-tight">{savedLeaveHint.range}</div>
                          ) : null}
                        </div>
                      </div>
                    ) : isWorkCell ? (
                      <div
                        className="flex flex-1 min-h-0 min-w-0 w-full flex-row items-start"
                        style={{ opacity: isSaved || selected ? 0.92 : 1 }}
                      >
                        <div className="font-semibold shrink-0 tabular-nums leading-none" style={{ fontSize: '17px' }}>
                          {dateObj.getDate()}
                        </div>
                        <div className="min-h-0 min-w-0 max-w-[72%] ml-auto flex flex-col gap-0.5 text-right">
                          <div className="shrink-0 text-[12px] leading-snug break-words">{subtitle}</div>
                          <div className="shrink-0 text-[11px] leading-tight">{workTimeLine}</div>
                          <div className="shrink-0 h-4 min-h-[16px]" aria-hidden />
                          <div className="shrink-0 text-[11px] font-medium leading-tight">Molalar</div>
                          <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-0.5 w-full min-w-0 text-right">
                            {(breakLines.length ? breakLines : ['yok']).map((line, idx) => (
                              <div key={`${dateStr}-b-${idx}`} className="shrink-0 text-[11px] leading-tight">
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (subtitle || workTimeLine) ? (
                      <div className="flex flex-1 min-h-0 min-w-0 w-full flex-row items-start">
                        <div className="font-semibold shrink-0 tabular-nums leading-none" style={{ fontSize: '17px' }}>
                          {dateObj.getDate()}
                        </div>
                        <div className="min-h-0 min-w-0 max-w-[72%] ml-auto flex flex-col gap-0.5 text-right">
                          {subtitle ? (
                            <div
                              className="min-h-0 flex-1 overflow-hidden break-words leading-snug text-[12px]"
                              style={{ opacity: isSaved || selected ? 0.92 : 1 }}
                            >
                              {subtitle}
                            </div>
                          ) : (
                            <div className="flex-1 min-h-0" aria-hidden />
                          )}
                          {workTimeLine ? (
                            <div
                              className="shrink-0 min-w-0 w-full leading-tight text-[11px]"
                              style={{ opacity: isSaved || selected ? 0.92 : 0.95 }}
                            >
                              {workTimeLine}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="font-semibold shrink-0 tabular-nums leading-none" style={{ fontSize: '17px' }}>
                        {dateObj.getDate()}
                      </div>
                    )}
                  </button>
                );
              })}
            </WorkingCalendarMonthGrid>

            {sortedSelectedDates.length > 0 && (
              <div className="pt-4 border-t space-y-3" style={{ borderColor: currentTheme.border }}>
                <h4 className="text-sm font-medium" style={{ color: currentTheme.text }}>
                  Seçili günler – saat aralığı
                </h4>
                <div className="w-full space-y-2 max-h-40 overflow-y-auto no-scrollbar">
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
                        className="flex items-center justify-between gap-4 py-2 px-3 rounded"
                        style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.background, height: '40px' }}
                      >
                        <span className="text-[16px] font-medium shrink-0" style={{ color: currentTheme.text, minWidth: '110px' }}>
                          {label}
                        </span>
                        <label className="flex items-center gap-1 text-xs shrink-0" style={{ color: currentTheme.textSecondary }}>
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
                              marginLeft: '5px',
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-1 text-xs shrink-0" style={{ color: currentTheme.textSecondary }}>
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
                              marginLeft: '5px',
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

            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !calendarReady}
                className="w-full px-4 py-2 rounded font-medium"
                style={{
                  backgroundColor: currentTheme.accent,
                  color: '#fff',
                  opacity: saving || !calendarReady ? 0.7 : 1,
                }}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>

            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-medium" style={{ color: currentTheme.text }}>
                    Kayıtlı İzinler
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const numericYear = parseInt(selectedHistoryYear, 10);
                        const nextYear = Number.isFinite(numericYear) ? numericYear - 1 : new Date().getFullYear();
                        setSelectedHistoryYear(String(nextYear));
                      }}
                      className="rounded px-2 py-1 text-xs"
                      style={{
                        backgroundColor: currentTheme.tableBackground || currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                      title="Önceki yıl"
                    >
                      {'<'}
                    </button>
                    <span className="text-sm font-semibold min-w-[52px] text-center" style={{ color: currentTheme.text }}>
                      {selectedHistoryYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const numericYear = parseInt(selectedHistoryYear, 10);
                        const nextYear = Number.isFinite(numericYear) ? numericYear + 1 : new Date().getFullYear();
                        setSelectedHistoryYear(String(nextYear));
                      }}
                      className="rounded px-2 py-1 text-xs"
                      style={{
                        backgroundColor: currentTheme.tableBackground || currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                      title="Sonraki yıl"
                    >
                      {'>'}
                    </button>
                  </div>
                  <select
                    value={historyRange}
                    onChange={(e) => setHistoryRange(e.target.value)}
                    className="rounded px-2 py-1 text-xs"
                    style={{
                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      height: '44px',
                      fontSize: '16px',
                      padding: '10px',
                    }}
                  >
                    <option value="1m">Son 1 Ay</option>
                    <option value="3m">Son 3 Ay</option>
                    <option value="6m">Son 6 Ay</option>
                    <option value="1y">Son 1 Yıl</option>
                  </select>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                  {filteredItems.map((item) => {
                    const { fullDayDateStrs, fullDayKeys, hourlyRows } = splitLeaveItemDisplay(item, systemSettings);
                    const fullDayLabels =
                      fullDayDateStrs.length > 0
                        ? formatCompactDateGroups(
                            [...fullDayDateStrs].sort((a, b) => a.localeCompare(b))
                          )
                        : [];
                    return (
                      <React.Fragment key={item.id}>
                        {fullDayDateStrs.length > 0 && fullDayLabels.map((label, idx) => (
                          <div
                            key={`fd-${item.id}-${idx}`}
                            className="flex items-center justify-between gap-3 py-2 px-3 rounded"
                            style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.background }}
                          >
                            <span className="min-w-0 truncate" style={{ color: currentTheme.text }}>
                              {label || '-'}
                            </span>
                            {idx === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleClearFullDayGroup(item, fullDayKeys)}
                                disabled={clearingLine === `fd-${item.id}`}
                                title="Tam gün izinlerini kaldır"
                                aria-label="Tam gün izinlerini kaldır"
                                className="inline-flex items-center justify-center text-[18px] transition-colors shrink-0"
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '9999px',
                                  backgroundColor: currentTheme.border,
                                  color: currentTheme.text,
                                  opacity: clearingLine === `fd-${item.id}` ? 0.6 : 1,
                                  cursor: clearingLine === `fd-${item.id}` ? 'not-allowed' : 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  if (clearingLine === `fd-${item.id}`) return;
                                  e.currentTarget.style.backgroundColor = currentTheme.accent;
                                  e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = currentTheme.border;
                                  e.currentTarget.style.color = currentTheme.text;
                                }}
                              >
                                {clearingLine === `fd-${item.id}` ? '…' : '🗑️'}
                              </button>
                            ) : (
                              <span className="shrink-0" style={{ width: '40px', height: '40px' }} />
                            )}
                          </div>
                        ))}
                        {hourlyRows.map((row) => (
                          <div
                            key={`${item.id}-${row.weekdayKey}`}
                            className="flex items-center justify-between gap-3 py-2 px-3 rounded"
                            style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.background }}
                          >
                            <span className="min-w-0 flex-1 text-sm" style={{ color: currentTheme.text }}>
                              <span className="font-medium">{formatDateWithWeekday(row.dateStr)}</span>
                              <span className="mx-1" style={{ color: currentTheme.textSecondary }}>—</span>
                              {row.startLabel} – {row.endLabel}
                              <span className="ml-1 font-semibold" style={{ color: currentTheme.accent }}>
                                {row.minutes} dk
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleClearOneWeekday(item.id, row.weekdayKey, row.dateStr)}
                              disabled={clearingLine === `${item.id}-${row.weekdayKey}`}
                              title="Bu günü kaldır"
                              aria-label="Bu günü kaldır"
                              className="inline-flex items-center justify-center text-[18px] transition-colors shrink-0"
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '9999px',
                                backgroundColor: currentTheme.border,
                                color: currentTheme.text,
                                opacity: clearingLine === `${item.id}-${row.weekdayKey}` ? 0.6 : 1,
                                cursor: clearingLine === `${item.id}-${row.weekdayKey}` ? 'not-allowed' : 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                if (clearingLine === `${item.id}-${row.weekdayKey}`) return;
                                e.currentTarget.style.backgroundColor = currentTheme.accent;
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = currentTheme.border;
                                e.currentTarget.style.color = currentTheme.text;
                              }}
                            >
                              {clearingLine === `${item.id}-${row.weekdayKey}` ? '…' : '🗑️'}
                            </button>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="text-xs py-2 px-1" style={{ color: currentTheme.textSecondary }}>
                      Seçilen dönemde kayıtlı izin bulunamadı.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
