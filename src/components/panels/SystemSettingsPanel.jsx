import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { SystemSettings, DatabaseBackup } from '../../api';

const WEEKDAYS = [
  { id: 1, label: 'Pazartesi' },
  { id: 2, label: 'Salı' },
  { id: 3, label: 'Çarşamba' },
  { id: 4, label: 'Perşembe' },
  { id: 5, label: 'Cuma' },
];
const WEEKEND_DAYS = [
  { id: 6, label: 'Cumartesi' },
  { id: 7, label: 'Pazar' },
];

const inputStyle = (theme) => ({
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '16px',
  backgroundColor: theme.tableRowAlt || theme.tableBackground || theme.background,
  color: theme.text,
  borderColor: theme.border,
  borderWidth: '1px',
  borderStyle: 'solid',
});

export function SystemSettingsPanel({ open, onClose, addNotification }) {
  const { currentTheme } = useTheme();
  const { addNotification: addNotificationFromContext } = useNotification();
  const notify = addNotification || addNotificationFromContext;

  const [settings, setSettings] = useState({
    working_days: [1, 2, 3, 4, 5],
    work_start: '08:00',
    work_end: '18:15',
    breaks_default: [['10:00', '10:15'], ['13:00', '13:30'], ['16:00', '16:15']],
    breaks_friday: [['10:00', '10:15'], ['13:00', '14:30'], ['16:00', '16:15']],
    full_day_minutes: 540,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const restoreInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      SystemSettings.get()
        .then((data) => {
          setSettings((prev) => ({
            ...prev,
            working_days: Array.isArray(data.working_days) ? data.working_days : prev.working_days,
            work_start: data.work_start ?? prev.work_start,
            work_end: data.work_end ?? prev.work_end,
            breaks_default: Array.isArray(data.breaks_default) ? data.breaks_default : prev.breaks_default,
            breaks_friday: Array.isArray(data.breaks_friday) ? data.breaks_friday : prev.breaks_friday,
            full_day_minutes: data.full_day_minutes ?? prev.full_day_minutes,
          }));
        })
        .catch(() => notify?.('Ayarlar yüklenemedi.', 'error'))
        .finally(() => setLoading(false));
    }
  }, [open, notify]);

  const toggleWorkingDay = (dayId) => {
    setSettings((prev) => {
      const next = [...(prev.working_days || [])];
      const idx = next.indexOf(dayId);
      if (idx >= 0) next.splice(idx, 1);
      else next.push(dayId);
      next.sort((a, b) => a - b);
      return { ...prev, working_days: next };
    });
  };

  const updateBreak = (key, index, field, value) => {
    setSettings((prev) => {
      const arr = [...(prev[key] || [])];
      if (!arr[index]) arr[index] = ['08:00', '18:15'];
      arr[index] = [...arr[index]];
      arr[index][field === 'start' ? 0 : 1] = value;
      return { ...prev, [key]: arr };
    });
  };

  const addBreak = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), ['10:00', '10:15']],
    }));
  };

  const removeBreak = (key, index) => {
    setSettings((prev) => {
      const arr = [...(prev[key] || [])];
      arr.splice(index, 1);
      return { ...prev, [key]: arr };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await SystemSettings.update(settings);
      notify?.('Ayarlar kaydedildi.', 'success');
    } catch (err) {
      notify?.(err.response?.data?.message || 'Kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      await DatabaseBackup.download();
      notify?.('Veritabanı indirildi.', 'success');
    } catch (err) {
      notify?.(err.response?.data?.message || 'İndirilemedi.', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };

  const getErrorMessage = (err) => {
    const data = err?.response?.data;
    if (!data) return 'Yüklenemedi.';
    if (typeof data.message === 'string') return data.message;
    if (data.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors).flat()[0];
      if (typeof first === 'string') return first;
    }
    return 'Yüklenemedi.';
  };

  const handleRestoreFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const password = window.prompt('Admin şifrenizi girin:');
    if (password === null || password === '') return;
    setRestoreLoading(true);
    try {
      await DatabaseBackup.upload(file, password);
      notify?.('Veritabanı başarıyla yüklendi.', 'success');
    } catch (err) {
      const msg = getErrorMessage(err);
      notify?.(msg, 'error');
      window.alert(msg);
    } finally {
      setRestoreLoading(false);
    }
  };

  if (!open) return null;

  const theme = currentTheme;
  const inputBg = theme.tableRowAlt || theme.tableBackground || theme.background;
  const restoreBtnColor = theme.accent && /^#[0-9A-Fa-f]{6}$/.test(theme.accent)
    ? (() => {
        const hex = theme.accent.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const newG = Math.min(255, g + 50);
        const newB = Math.max(0, Math.min(255, b - 30));
        return `rgb(${r},${newG},${newB})`;
      })()
    : '#059669';

  return createPortal(
    <div className="fixed inset-0 z-[999993]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${theme.background}CC` }} />
      <div className="relative flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[560px] max-h-[90vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] flex flex-col overflow-hidden"
          style={{
            pointerEvents: 'auto',
            backgroundColor: theme.tableBackground || theme.background,
            borderColor: theme.border,
            borderWidth: '1px',
            borderStyle: 'solid',
            color: theme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b flex-none shrink-0" style={{ backgroundColor: theme.background, borderColor: theme.border, padding: '16px 20px' }}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
              <div />
              <h2 className="text-xl font-semibold text-center" style={{ color: theme.text }}>Sistem Yönetimi</h2>
              <div className="justify-self-end">
                <button
                  onClick={onClose}
                  className="rounded-lg px-2 py-1 transition-colors"
                  style={{ color: theme.textSecondary, backgroundColor: 'transparent' }}
                  aria-label="Kapat"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6 w-full">
            {loading ? (
              <div className="text-center py-8" style={{ color: theme.textSecondary }}>Yükleniyor...</div>
            ) : (
              <>
                <div className="rounded-xl p-4 w-full" style={{ backgroundColor: `${theme.border}20` }}>
                  <h3 className="text-lg font-medium mb-3 text-center" style={{ color: theme.text }}>Çalışma Günleri</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {WEEKDAYS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => toggleWorkingDay(d.id)}
                          className="px-4 py-2 rounded-lg transition-colors flex-1 min-w-[80px]"
                          style={{
                            backgroundColor: (settings.working_days || []).includes(d.id) ? theme.accent : theme.border,
                            color: (settings.working_days || []).includes(d.id) ? '#fff' : theme.text,
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center">
                      {WEEKEND_DAYS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => toggleWorkingDay(d.id)}
                          className="px-4 py-2 rounded-lg transition-colors min-w-[100px]"
                          style={{
                            backgroundColor: (settings.working_days || []).includes(d.id) ? theme.accent : theme.border,
                            color: (settings.working_days || []).includes(d.id) ? '#fff' : theme.text,
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 w-full" style={{ backgroundColor: `${theme.border}20` }}>
                  <h3 className="text-lg font-medium mb-3 text-center" style={{ color: theme.text }}>Mesai Saatleri</h3>
                  <div className="flex gap-4 flex-wrap justify-center">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: theme.textSecondary }}>Başlangıç</label>
                      <input
                        type="time"
                        value={settings.work_start || ''}
                        onChange={(e) => setSettings((p) => ({ ...p, work_start: e.target.value }))}
                        style={inputStyle(theme)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: theme.textSecondary }}>Bitiş</label>
                      <input
                        type="time"
                        value={settings.work_end || ''}
                        onChange={(e) => setSettings((p) => ({ ...p, work_end: e.target.value }))}
                        style={inputStyle(theme)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1" style={{ color: theme.textSecondary }}>Tam gün (dakika)</label>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={settings.full_day_minutes ?? 540}
                        onChange={(e) => setSettings((p) => ({ ...p, full_day_minutes: parseInt(e.target.value, 10) || 540 }))}
                        style={inputStyle(theme)}
                        className="w-24"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 w-full" style={{ backgroundColor: `${theme.border}20` }}>
                  <h3 className="text-lg font-medium mb-3 text-center" style={{ color: theme.text }}>Mola Saatleri (Pzt–Per)</h3>
                  <div className="space-y-2 flex flex-col items-center">
                    {(settings.breaks_default || []).map((b, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="time"
                          value={b[0] || ''}
                          onChange={(e) => updateBreak('breaks_default', i, 'start', e.target.value)}
                          style={{ ...inputStyle(theme), width: '100px' }}
                        />
                        <span style={{ color: theme.textSecondary }}>–</span>
                        <input
                          type="time"
                          value={b[1] || ''}
                          onChange={(e) => updateBreak('breaks_default', i, 'end', e.target.value)}
                          style={{ ...inputStyle(theme), width: '100px' }}
                        />
                        <button
                          onClick={() => removeBreak('breaks_default', i)}
                          className="px-2 py-1 rounded text-sm"
                          style={{ backgroundColor: theme.border, color: theme.text }}
                        >
                          Kaldır
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addBreak('breaks_default')}
                      className="px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: theme.accent, color: '#fff', width: '100%' }}
                    >
                      Mola Ekle
                    </button>
                  </div>
                </div>

                <div className="rounded-xl p-4 w-full" style={{ backgroundColor: `${theme.border}20`, }}>
                  <h3 className="text-lg font-medium mb-3 text-center" style={{ color: theme.text }}>Mola Saatleri (Cuma)</h3>
                  <div className="space-y-2 flex flex-col items-center">
                    {(settings.breaks_friday || []).map((b, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="time"
                          value={b[0] || ''}
                          onChange={(e) => updateBreak('breaks_friday', i, 'start', e.target.value)}
                          style={{ ...inputStyle(theme), width: '100px' }}
                        />
                        <span style={{ color: theme.textSecondary }}>–</span>
                        <input
                          type="time"
                          value={b[1] || ''}
                          onChange={(e) => updateBreak('breaks_friday', i, 'end', e.target.value)}
                          style={{ ...inputStyle(theme), width: '100px' }}
                        />
                        <button
                          onClick={() => removeBreak('breaks_friday', i)}
                          className="px-2 py-1 rounded text-sm"
                          style={{ backgroundColor: theme.border, color: theme.text }}
                        >
                          Kaldır
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addBreak('breaks_friday')}
                      className="px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: theme.accent, color: '#fff', width: '100%' }}
                    >
                      Mola Ekle
                    </button>
                  </div>
                </div>

                <div className="rounded-xl p-4 w-full" style={{ backgroundColor: `${theme.border}20`, marginBottom: '10px' }}>
                  <h3 className="text-lg font-medium mb-3 text-center" style={{ color: theme.text }}>Veritabanı Yedekleme</h3>
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept=".sqlite,.db"
                    onChange={handleRestoreFileChange}
                    className="hidden"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleBackup}
                      disabled={backupLoading}
                      className="flex-1 px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: theme.accent,
                        color: '#fff',
                        opacity: backupLoading ? 0.7 : 1,
                      }}
                    >
                      {backupLoading ? 'İndiriliyor...' : 'Veritabanını İndir'}
                    </button>
                    <button
                      onClick={handleRestoreClick}
                      disabled={restoreLoading}
                      className="flex-1 px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: restoreBtnColor,
                        color: '#fff',
                        opacity: restoreLoading ? 0.7 : 1,
                      }}
                    >
                      {restoreLoading ? 'Yükleniyor...' : 'Veritabanını Yükle'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 rounded-lg font-medium"
                    style={{
                      backgroundColor: theme.accent,
                      color: '#fff',
                      opacity: saving ? 0.7 : 1,
                      width: '50%',
                    }}
                  >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-lg border"
                    style={{
                      backgroundColor: theme.border || theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                      width: '50%',
                    }}
                  >
                    Kapat
                  </button>
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
