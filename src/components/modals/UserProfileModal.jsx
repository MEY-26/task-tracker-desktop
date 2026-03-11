import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { getRoleText } from '../../utils/performance.js';
import PasswordChangeForm from '../account/PasswordChangeForm';

export function UserProfileModal({
  open,
  onClose,
  user,
  setWeeklyUserId,
  setShowWeeklyGoals,
  loadWeeklyGoals,
  onSubmitPasswordChange
}) {
  const { currentTheme } = useTheme();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999980]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[800px] max-h-[85vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
          pointerEvents: 'auto',
          backgroundColor: currentTheme.tableBackground || currentTheme.background,
          borderColor: currentTheme.border,
          borderWidth: '1px',
          borderStyle: 'solid',
          color: currentTheme.text
        }} onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3"
            style={{
              borderBottom: `1px solid ${currentTheme.border}`,
              backgroundColor: currentTheme.background
            }}>
            <div></div>
            <h2 className="font-semibold text-center" style={{ color: currentTheme.text }}>Profil</h2>
            <div className="justify-self-end">
              <button onClick={onClose}
                className="rounded px-2 py-1 transition-colors"
                style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.target.style.color = currentTheme.text;
                  e.target.style.backgroundColor = `${currentTheme.border}30`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = currentTheme.textSecondary;
                  e.target.style.backgroundColor = 'transparent';
                }}>✕</button>
            </div>
          </div>

          <div className="p-4 xs:p-6 sm:p-8 space-y-4 xs:space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            <div className="rounded-2xl p-6 mx-4" style={{ padding: '15px', backgroundColor: `${currentTheme.border}20` }}>
              <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 260px' }}>
                <div>
                  <div className="grid items-center gap-x-8 gap-y-4" style={{ gridTemplateColumns: '120px 1fr' }}>
                    <div className="!text-[18px]" style={{ color: currentTheme.textSecondary }}>İsim</div>
                    <div className="font-semibold !text-[18px] truncate" style={{ color: currentTheme.text }}>{user?.name || 'Belirtilmemiş'}</div>

                    <div className="!text-[18px]" style={{ color: currentTheme.textSecondary }}>E-posta</div>
                    <div className="!text-[18px] truncate" style={{ color: currentTheme.text }}>{user?.email || 'Belirtilmemiş'}</div>

                    <div className="!text-[18px]" style={{ color: currentTheme.textSecondary }}>Rol</div>
                    <div className="font-semibold !text-[18px] truncate" style={{ color: currentTheme.text }}>{getRoleText(user?.role)}</div>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ backgroundColor: `${currentTheme.border}20` }}>
                  {user?.role !== 'observer' && (
                    <button
                      className="w-full h-full rounded px-4 py-2 flex items-center justify-center transition-colors"
                      style={{ backgroundColor: currentTheme.accent, color: '#ffffff' }}
                      onMouseEnter={(e) => {
                        const hex = currentTheme.accent.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = currentTheme.accent;
                      }}
                      onClick={async () => {
                        setWeeklyUserId(null);
                        setShowWeeklyGoals(true);
                        await loadWeeklyGoals(null, null);
                      }}
                    >
                      <span className="!text-[40px]">🎯</span>
                      <span className="!text-[24px]">Haftalık Hedefler</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 w-full px-8 py-5 backdrop-blur" style={{ borderTop: `1px solid ${currentTheme.border}`, backgroundColor: `${currentTheme.background}E6` }}></div>
            <div className="rounded-2xl p-6 mx-4" style={{ backgroundColor: `${currentTheme.border}20` }}>
              <div className="!text-[24px] font-medium mb-4 flex items-center" style={{ paddingLeft: '15px', color: currentTheme.text }}>
                🔐 <span className="ml-2">Şifre Değiştir</span>
              </div>
              <PasswordChangeForm onSubmit={onSubmitPasswordChange} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
