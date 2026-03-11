import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { EditGrants } from '../../api';
import { getMonday, fmtYMD } from '../../utils/date';

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

export function EditGrantModal({ open, onClose, selectedUserIds, users, onSuccess, addNotification }) {
  const { currentTheme } = useTheme();
  const [weekStart, setWeekStart] = useState(fmtYMD(getMonday()));
  const [durationHours, setDurationHours] = useState(4);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedUserIds?.length) return;
    setSaving(true);
    try {
      await EditGrants.create({
        user_ids: selectedUserIds,
        week_start: weekStart,
        duration_hours: durationHours,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Edit grant error:', err);
      addNotification?.(err?.response?.data?.message || 'İzin verilemedi', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const selectedNames = (users || [])
    .filter((u) => selectedUserIds?.includes(u.id))
    .map((u) => u.name || u.email)
    .join(', ');

  return (
    <div className="fixed inset-0 z-[999999]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} style={{ pointerEvents: 'auto' }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div
          className="fixed z-[100300] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[420px] rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
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
              Özel Düzenleme İzni Ver
            </h3>
            <button
              onClick={onClose}
              className="rounded px-2 py-1 transition-colors justify-self-end"
              style={{ color: currentTheme.text, backgroundColor: 'transparent' }}
            >
              ✕
            </button>
          </div>
          <div className="space-y-4" style={{ padding: '10px 10px' }}>
            <p className="text-base" style={{ color: currentTheme.textSecondary }}>
              Seçili kullanıcılara haftalık hedeflerde hedef düzenleme yetkisi verilir. Süre dolunca yetki otomatik kalkar.
            </p>
            <div>
              <label className="block text-base font-medium mb-2" style={{ color: currentTheme.text }}>
                Kullanıcılar
              </label>
              <div className="py-2.5 px-3 rounded flex items-center" style={{ minHeight: '44px', fontSize: '16px', backgroundColor: currentTheme.tableRowAlt || currentTheme.background, color: currentTheme.text }}>
                {selectedNames || '-'}
              </div>
            </div>
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
                onClick={handleSave}
                disabled={saving}
                className="flex-1 min-w-[120px] max-w-[180px] px-4 py-2 rounded font-medium"
                style={{
                  backgroundColor: currentTheme.accent,
                  color: '#fff',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Veriliyor...' : 'İzin Ver'}
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
          </div>
        </div>
      </div>
    </div>
  );
}
