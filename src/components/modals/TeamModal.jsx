import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';

export function TeamModal({
  open,
  onClose,
  teamMembers,
  setWeeklyUserId,
  setShowWeeklyGoals,
  loadWeeklyGoals,
  bulkLeaderId
}) {
  const { currentTheme: themeToUse } = useTheme();

  if (!open) return null;

  const filteredMembers = Array.isArray(teamMembers)
    ? teamMembers.filter(m => m.role !== 'observer')
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[999994]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${themeToUse.background}CC` }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div className="fixed z-[100230] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[900px] max-h-[80vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
          pointerEvents: 'auto',
          backgroundColor: themeToUse.tableBackground || themeToUse.background,
          borderColor: themeToUse.border,
          borderWidth: '1px',
          borderStyle: 'solid',
          color: themeToUse.text
        }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center px-5 py-3 relative"
            style={{
              borderBottom: `1px solid ${themeToUse.border}`,
              backgroundColor: themeToUse.background
            }}>
            <h2 className="font-semibold text-center" style={{ color: themeToUse.text }}>Takım</h2>
            <button onClick={onClose} className="absolute transition-colors" style={{ backgroundColor: 'transparent', right: '16px', top: '50%', transform: 'translateY(-50%)', color: themeToUse.textSecondary }}
              onMouseEnter={(e) => {
                e.target.style.color = themeToUse.text;
                e.target.style.backgroundColor = `${themeToUse.border}30`;
              }}
              onMouseLeave={(e) => {
                e.target.style.color = themeToUse.textSecondary;
                e.target.style.backgroundColor = 'transparent';
              }}>
              <span className="rounded px-2 py-1">✕</span>
            </button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(80vh - 120px)' }}>
            {filteredMembers.length > 0 ? (
              filteredMembers.map(m => (
                <div key={m.id} className="flex items-center text-[24px] justify-between rounded px-3 py-2 transition-colors"
                  style={{
                    paddingTop: '20px',
                    paddingBottom: '20px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    backgroundColor: `${themeToUse.border}20`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${themeToUse.border}30`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${themeToUse.border}20`}>
                  <div>
                    <div className="font-medium" style={{ color: themeToUse.text }}>{m.name}</div>
                    <div className="text-sm" style={{ color: themeToUse.textSecondary }}>{m.email}</div>
                  </div>
                  <button className="rounded px-3 py-2 transition-colors"
                    style={{ backgroundColor: themeToUse.accent, color: '#ffffff', height: '70px' }}
                    onMouseEnter={(e) => {
                      const hex = themeToUse.accent.replace('#', '');
                      const r = parseInt(hex.substr(0, 2), 16);
                      const g = parseInt(hex.substr(2, 2), 16);
                      const b = parseInt(hex.substr(4, 2), 16);
                      e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = themeToUse.accent;
                    }}
                    onClick={async () => {
                      onClose();
                      setWeeklyUserId(m.id);
                      setShowWeeklyGoals(true);
                      await loadWeeklyGoals(null, m.id);
                    }}>
                    Hedefleri Aç
                  </button>
                </div>
              ))
            ) : (
              <div className="text-neutral-300">
                {bulkLeaderId ? 'Bu liderin takım üyesi bulunamadı.' : 'Takım üyesi bulunamadı.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
