import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarOverrides } from '../../api';
import { fmtYMD } from '../../utils/date';
import {
  monthGridRange,
  normalizeCalendarRow,
  workingCalendarDayInfo as dayInfo,
  workingCalendarCellColor as colorForCell,
  workingCalendarCellTitle as cellTitle,
} from '../../utils/workingCalendarShared';

import { WorkingCalendarMonthGrid } from '../calendar/WorkingCalendarMonthGrid';
import { WORKING_CALENDAR_CELL_BUTTON_CLASS } from '../calendar/workingCalendarStyles';

const SCOPES = [
  { id: 'global', label: 'Tüm kullanıcılar' },
  { id: 'department', label: 'Departmanlar' },
  { id: 'team', label: 'Takımlar (lider)' },
  { id: 'user', label: 'Kullanıcılar' },
];

function parseTargets(raw) {
  if (!raw) return { departments: [], leaders: [], user_ids: [] };
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || { departments: [], leaders: [], user_ids: [] };
    } catch {
      return { departments: [], leaders: [], user_ids: [] };
    }
  }
  return {
    departments: raw.departments || [],
    leaders: raw.leaders || [],
    user_ids: raw.user_ids || [],
  };
}

function parseBreaks(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

const DEFAULT_WORK_START = '08:00';
const DEFAULT_WORK_END = '18:15';
/** Sistem ayarlarıyla uyumlu varsayılan mola + 16:00–16:15 */
const DEFAULT_BREAKS = [
  ['10:00', '10:15'],
  ['13:00', '13:30'],
  ['16:00', '16:15'],
];

function copyDefaultBreaks() {
  return DEFAULT_BREAKS.map((p) => [...p]);
}

function breaksEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);
}

function selectionSubtitle(ds, baseHoliday, hasOverride) {
  if (hasOverride) return 'Kayıtlı istisna';
  if (baseHoliday?.title) return baseHoliday.title;
  if (baseHoliday?.kind === 'weekend') return 'Hafta sonu (varsayılan)';
  return 'İş günü (varsayılan)';
}

export function WorkingCalendarSection({ theme, notify, users = [], departments = [] }) {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({
    scheduleType: 'non_working',
    scope: 'global',
    targets: { departments: [], leaders: [], user_ids: [] },
    fullDayMinutes: '',
    workStart: DEFAULT_WORK_START,
    workEnd: DEFAULT_WORK_END,
    breaks: copyDefaultBreaks(),
  });
  const [saving, setSaving] = useState(false);

  const leaderOptions = useMemo(
    () => (users || []).filter((u) => u.role === 'team_leader' || u.role === 'admin'),
    [users]
  );

  const load = useCallback(async () => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const { from, to } = monthGridRange(y, m);
    setLoading(true);
    try {
      const res = await CalendarOverrides.list({ from, to });
      setItems((res.items || []).map(normalizeCalendarRow));
    } catch {
      notify?.('Takvim yüklenemedi.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [cursor, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const it of items) {
      const d = it.date;
      if (!map[d]) map[d] = [];
      map[d].push(it);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => Number(a.id) - Number(b.id));
    }
    return map;
  }, [items]);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const { from: gridStartStr } = monthGridRange(y, m);

  const cells = useMemo(() => {
    const startDate = new Date(`${gridStartStr}T12:00:00`);
    const out = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [gridStartStr]);

  const syncFormFromSelection = useCallback(
    (ds) => {
      if (!ds) return;
      const d = new Date(`${ds}T12:00:00`);
      const { list, baseHoliday } = dayInfo(d, itemsByDate);
      const row = list[0];
      if (row) {
        const isWork = row.type === 'working' || row.type === 'custom';
        const parsedBreaks = parseBreaks(row.breaks);
        setForm({
          scheduleType: isWork ? 'work' : 'non_working',
          scope: row.scope || 'global',
          targets: parseTargets(row.targets),
          fullDayMinutes:
            row.full_day_minutes != null && row.full_day_minutes !== ''
              ? String(row.full_day_minutes)
              : '',
          workStart: row.work_start || DEFAULT_WORK_START,
          workEnd: row.work_end || DEFAULT_WORK_END,
          breaks:
            row.type === 'custom' && parsedBreaks.length > 0
              ? parsedBreaks
              : copyDefaultBreaks(),
        });
        return;
      }
      const defaultSchedule = baseHoliday ? 'work' : 'non_working';
      setForm({
        scheduleType: defaultSchedule,
        scope: 'global',
        targets: { departments: [], leaders: [], user_ids: [] },
        fullDayMinutes: '',
        workStart: DEFAULT_WORK_START,
        workEnd: DEFAULT_WORK_END,
        breaks: copyDefaultBreaks(),
      });
    },
    [itemsByDate]
  );

  useEffect(() => {
    if (selectedDate) {
      syncFormFromSelection(selectedDate);
    }
  }, [selectedDate, items, syncFormFromSelection]);

  const handleCellClick = (d) => {
    const { ds } = dayInfo(d, itemsByDate);
    setSelectedDate(ds);
  };

  const handleTypeRadio = (nextSchedule) => {
    setForm((prev) => ({ ...prev, scheduleType: nextSchedule }));
  };

  const updateBreak = (i, field, value) => {
    setForm((prev) => {
      const arr = [...prev.breaks];
      if (!arr[i]) arr[i] = ['08:00', '18:00'];
      const row = [...arr[i]];
      row[field === 'start' ? 0 : 1] = value;
      arr[i] = row;
      return { ...prev, breaks: arr };
    });
  };

  const toggleTarget = (key, value) => {
    setForm((prev) => {
      const arr = [...(prev.targets[key] || [])];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(value);
      return { ...prev, targets: { ...prev.targets, [key]: arr } };
    });
  };

  const payloadTargets =
    form.scope === 'global'
      ? null
      : {
          ...(form.scope === 'department' ? { departments: form.targets.departments } : {}),
          ...(form.scope === 'team' ? { leaders: form.targets.leaders.map(Number) } : {}),
          ...(form.scope === 'user' ? { user_ids: form.targets.user_ids.map(Number) } : {}),
        };

  const handleSubmit = async () => {
    if (!selectedDate) return;
    const row = (itemsByDate[selectedDate] || [])[0];

    const fd =
      form.fullDayMinutes !== '' && form.fullDayMinutes != null
        ? parseInt(String(form.fullDayMinutes), 10)
        : null;

    if (form.scheduleType === 'work') {
      const matchesDefaultWindow =
        form.workStart === DEFAULT_WORK_START &&
        form.workEnd === DEFAULT_WORK_END &&
        breaksEqual(form.breaks, DEFAULT_BREAKS);
      if (!matchesDefaultWindow) {
        const hasMinutes = fd !== null && !Number.isNaN(fd);
        const hasTimes = form.workStart && form.workEnd;
        if (!hasMinutes && !hasTimes) {
          notify?.('Çalışma için başlangıç/bitiş veya net dakika girin.', 'error');
          return;
        }
      }
    }

    if (form.scope !== 'global') {
      if (form.scope === 'user' && (!form.targets.user_ids || form.targets.user_ids.length === 0)) {
        notify?.('En az bir kullanıcı seçin.', 'error');
        return;
      }
      if (form.scope === 'department' && (!form.targets.departments || form.targets.departments.length === 0)) {
        notify?.('En az bir departman seçin.', 'error');
        return;
      }
      if (form.scope === 'team' && (!form.targets.leaders || form.targets.leaders.length === 0)) {
        notify?.('En az bir takım lideri seçin.', 'error');
        return;
      }
    }

    let apiType;
    let title;
    let fullDayPayload;
    let workStartPayload;
    let workEndPayload;
    let breaksPayload;

    if (form.scheduleType === 'non_working') {
      apiType = 'non_working';
      title = 'Tatil';
      fullDayPayload = null;
      workStartPayload = null;
      workEndPayload = null;
      breaksPayload = null;
    } else {
      title = 'Çalışma';
      const matchesDefaultWindow =
        form.workStart === DEFAULT_WORK_START &&
        form.workEnd === DEFAULT_WORK_END &&
        breaksEqual(form.breaks, DEFAULT_BREAKS);
      if (matchesDefaultWindow) {
        apiType = 'working';
        fullDayPayload = fd !== null && !Number.isNaN(fd) ? fd : null;
        workStartPayload = null;
        workEndPayload = null;
        breaksPayload = null;
      } else {
        apiType = 'custom';
        fullDayPayload = fd !== null && !Number.isNaN(fd) ? fd : null;
        workStartPayload = form.workStart;
        workEndPayload = form.workEnd;
        breaksPayload = fullDayPayload == null ? form.breaks : null;
      }
    }

    const basePayload = {
      type: apiType,
      scope: form.scope,
      targets: payloadTargets,
      title,
      description: null,
      full_day_minutes: fullDayPayload,
      work_start: workStartPayload,
      work_end: workEndPayload,
      breaks: breaksPayload,
    };

    setSaving(true);
    try {
      if (row) {
        await CalendarOverrides.update(row.id, {
          ...basePayload,
          date: selectedDate,
        });
        notify?.('Güncellendi.', 'success');
      } else {
        await CalendarOverrides.create({
          dates: [selectedDate],
          ...basePayload,
          source: 'manual',
        });
        notify?.('Kaydedildi.', 'success');
      }
      await load();
    } catch (err) {
      notify?.(err.response?.data?.message || err.message || 'İşlem başarısız', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineDelete = async () => {
    const row = (itemsByDate[selectedDate] || [])[0];
    if (!row?.id) return;
    if (!window.confirm('Bu istisnayı silmek istiyor musunuz?')) return;
    setSaving(true);
    try {
      await CalendarOverrides.remove(row.id);
      notify?.('Silindi.', 'success');
      await load();
      syncFormFromSelection(selectedDate);
    } catch (err) {
      notify?.(err.response?.data?.message || 'Silinemedi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedDate(null);
  };

  const monthTitle = cursor.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

  const inputStyle = {
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '14px',
    backgroundColor: theme.tableRowAlt || theme.tableBackground || theme.background,
    color: theme.text,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: theme.border,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  };

  const selectedRow = selectedDate ? (itemsByDate[selectedDate] || [])[0] : null;
  const selectedDayMeta = selectedDate
    ? dayInfo(new Date(`${selectedDate}T12:00:00`), itemsByDate)
    : null;
  const inlineSubtitle = selectedDate && selectedDayMeta
    ? selectionSubtitle(selectedDate, selectedDayMeta.baseHoliday, !!selectedRow)
    : '';

  return (
    <div className="rounded-xl p-4 w-full min-w-0 max-w-full overflow-x-hidden" style={{ backgroundColor: `${theme.border}20` }}>
      <h3 className="text-lg font-medium mb-2 text-center" style={{ color: theme.text }}>
        Çalışma Takvimi (istisnalar)
      </h3>
      <p className="text-xs text-center mb-3" style={{ color: theme.textSecondary }}>
        Hafta sonları ve resmi tatiller varsayılan olarak tatildir. Bir güne tıklayıp aynı panelden çalışma saati veya ek tatil tanımlayın.
      </p>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-1 rounded-lg text-sm"
          style={{ backgroundColor: theme.accent, color: '#fff' }}
          onClick={() => setCursor(new Date(y, m - 1, 1))}
        >
          ◀
        </button>
        <span className="font-medium capitalize" style={{ color: theme.text }}>{monthTitle}</span>
        <button
          type="button"
          className="px-3 py-1 rounded-lg text-sm"
          style={{ backgroundColor: theme.accent, color: '#fff' }}
          onClick={() => setCursor(new Date(y, m + 1, 1))}
        >
          ▶
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4" style={{ color: theme.textSecondary }}>Yükleniyor...</div>
      ) : (
        <>
          <WorkingCalendarMonthGrid headerColor={theme.textSecondary}>
            {cells.map((d) => {
              const ds = fmtYMD(d);
              const inMonth = d.getMonth() === m;
              const info = dayInfo(d, itemsByDate);
              const bg = colorForCell(info.list, info.baseHoliday);
              const title = cellTitle(info.list, info.baseHoliday);
              const border = theme.border;
              const sel = selectedDate === ds;
              return (
                <button
                  key={ds}
                  type="button"
                  title={title || ds}
                  onClick={() => handleCellClick(d)}
                  className={`${WORKING_CALENDAR_CELL_BUTTON_CLASS} text-sm`}
                  style={{
                    opacity: inMonth ? 1 : 0.35,
                    backgroundColor: bg,
                    borderWidth: sel ? 2 : 1,
                    borderStyle: 'solid',
                    borderColor: sel ? '#fff' : border,
                    color: theme.text,
                    boxShadow: sel ? '0 0 0 1px rgba(255,255,255,0.35)' : 'none',
                  }}
                >
                  <div className="font-semibold shrink-0" style={{ fontSize: '17px' }}>
                    {d.getDate()}
                  </div>
                  {title ? (
                    <div
                      className="mt-1 line-clamp-4 leading-snug break-words flex-1 min-h-0"
                      style={{ fontSize: '12px' }}
                      title={title}
                    >
                      {title}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </WorkingCalendarMonthGrid>
        </>
      )}

      {selectedDate && (
        <div
          className="mt-4 rounded-xl p-4 space-y-3 min-w-0 max-w-full overflow-x-hidden"
          style={{ backgroundColor: `${theme.border}18`, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold" style={{ color: theme.text }}>
                {selectedDate} — {inlineSubtitle}
              </div>
              {selectedRow?.source === 'preset' && (
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.25)', color: theme.text }}>
                  Resmi tatil kaydı
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 min-w-0 items-start">
            <div className="min-w-0 space-y-3">
              <div className="min-w-0">
                <div className="text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>Tip</div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {[
                    { id: 'non_working', label: 'Tatil' },
                    { id: 'work', label: 'Çalışma' },
                  ].map((opt) => (
                    <label key={opt.id} className="inline-flex items-center gap-1.5 text-sm cursor-pointer shrink-0" style={{ color: theme.text }}>
                      <input
                        type="radio"
                        name="cal-override-type"
                        checked={form.scheduleType === opt.id}
                        onChange={() => handleTypeRadio(opt.id)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>Kapsam</label>
              <select
                value={form.scope}
                onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
                style={{ ...inputStyle, width: '100%', maxWidth: '100%' }}
              >
                {SCOPES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.scheduleType === 'work' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 min-w-0">
                <div>
                  <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>Başlangıç</label>
                  <input type="time" value={form.workStart} onChange={(e) => setForm((p) => ({ ...p, workStart: e.target.value }))} style={{ ...inputStyle, maxWidth: '100%' }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>Bitiş</label>
                  <input type="time" value={form.workEnd} onChange={(e) => setForm((p) => ({ ...p, workEnd: e.target.value }))} style={{ ...inputStyle, maxWidth: '100%' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: theme.textSecondary }}>Net çalışma (dk, doluysa saatler atlanır; boş = sistem ayarı)</label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={form.fullDayMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, fullDayMinutes: e.target.value }))}
                  style={{ ...inputStyle, maxWidth: '100%' }}
                />
              </div>
              {(!form.fullDayMinutes || form.fullDayMinutes === '0') && (
                <div className="min-w-0">
                  <div className="text-xs mb-1.5" style={{ color: theme.textSecondary }}>Molalar</div>
                  <div
                    className="grid min-w-0 w-full"
                    style={{
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      columnGap: '14px',
                      rowGap: '8px',
                    }}
                  >
                    {form.breaks.map((b, i) => (
                      <div key={i} className="flex items-center gap-0.5 min-w-0">
                        <input
                          type="time"
                          value={b[0]}
                          onChange={(e) => updateBreak(i, 'start', e.target.value)}
                          style={{ ...inputStyle, flex: '1 1 0', minWidth: 0, maxWidth: '100%', padding: '10px 10px', fontSize: '15px' }}
                        />
                        <span className="shrink-0 text-[10px] select-none px-px" style={{ color: theme.textSecondary }}>–</span>
                        <input
                          type="time"
                          value={b[1]}
                          onChange={(e) => updateBreak(i, 'end', e.target.value)}
                          style={{ ...inputStyle, flex: '1 1 0', minWidth: 0, maxWidth: '100%', padding: '10px 10px', fontSize: '15px' }}
                        />
                        <button
                          type="button"
                          className="inline-flex items-center justify-center shrink-0 text-blue-300 hover:text-blue-200 text-[16px] transition-colors buttonHoverEffect"
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(241, 91, 21, 0.62)',
                          }}
                          title="Kaldır"
                          aria-label="Bu molayı kaldır"
                          onClick={() => setForm((p) => ({ ...p, breaks: p.breaks.filter((_, j) => j !== i) }))}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-lg text-[11px] font-medium min-w-0 w-full border border-dashed transition-[opacity,transform] duration-200 ease-out"
                      style={{
                        gridColumn: '1 / -1',
                        minHeight: '48px',
                        boxSizing: 'border-box',
                        borderColor: theme.accent,
                        color: theme.accent,
                        backgroundColor: `${theme.accent}12`,
                      }}
                      onClick={() => setForm((p) => ({ ...p, breaks: [...p.breaks, ['12:00', '12:15']] }))}
                    >
                      Mola ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {form.scope === 'department' && (
            <div className="max-h-28 min-w-0 overflow-y-auto overflow-x-hidden border rounded p-2 text-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ borderColor: theme.border }}>
              {(departments || []).length === 0 && <div style={{ color: theme.textSecondary }}>Departman yok</div>}
              {(departments || []).map((d) => (
                <label key={d} className="flex items-center gap-2 py-0.5 cursor-pointer" style={{ color: theme.text }}>
                  <input
                    type="checkbox"
                    checked={(form.targets.departments || []).includes(d)}
                    onChange={() => toggleTarget('departments', d)}
                  />
                  {d}
                </label>
              ))}
            </div>
          )}

          {form.scope === 'team' && (
            <div className="max-h-28 min-w-0 overflow-y-auto overflow-x-hidden border rounded p-2 text-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ borderColor: theme.border }}>
              {leaderOptions.map((u) => (
                <label key={u.id} className="flex items-center gap-2 py-0.5 cursor-pointer" style={{ color: theme.text }}>
                  <input
                    type="checkbox"
                    checked={(form.targets.leaders || []).includes(u.id)}
                    onChange={() => toggleTarget('leaders', u.id)}
                  />
                  {u.name}
                </label>
              ))}
            </div>
          )}

          {form.scope === 'user' && (
            <div className="max-h-32 min-w-0 overflow-y-auto overflow-x-hidden border rounded p-2 text-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ borderColor: theme.border }}>
              {(users || []).filter((u) => u.role !== 'observer').map((u) => (
                <label key={u.id} className="flex items-center gap-2 py-0.5 cursor-pointer" style={{ color: theme.text }}>
                  <input
                    type="checkbox"
                    checked={(form.targets.user_ids || []).includes(u.id)}
                    onChange={() => toggleTarget('user_ids', u.id)}
                  />
                  {u.name}
                </label>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-3 w-full min-w-0">
            {selectedRow && (
              <button
                type="button"
                disabled={saving}
                className="w-full sm:w-auto sm:self-start px-3 py-1.5 rounded-md text-xs font-medium"
                style={{ backgroundColor: 'rgba(239,68,68,0.85)', color: '#fff', opacity: saving ? 0.7 : 1 }}
                onClick={handleInlineDelete}
              >
                Sil
              </button>
            )}
            <div className="flex gap-2 w-full min-w-0">
              <button
                type="button"
                disabled={saving}
                className="flex-1 min-w-0 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: theme.accent, color: '#fff', opacity: saving ? 0.7 : 1 }}
                onClick={handleSubmit}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                type="button"
                disabled={saving}
                className="flex-1 min-w-0 py-2.5 rounded-lg text-sm border"
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={handleCancelSelection}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
