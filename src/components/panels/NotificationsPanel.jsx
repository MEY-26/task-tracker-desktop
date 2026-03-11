import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDate } from '../../utils/date.js';

export function NotificationsPanel({
  open,
  onClose,
  notifications,
  markAllNotificationsAsRead,
  markingAllNotifications,
  onNotificationClick,
  notifPanelRef,
  notifPos
}) {
  const { currentTheme } = useTheme();

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[999992]"
        onClick={onClose}
        style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }}
      />
      <div
        ref={notifPanelRef}
        className="fixed z-[99999] p-3"
        style={{
          top: `${notifPos.top}px`,
          right: `${notifPos.right}px`,
          opacity: 1,
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }}
      >
        <div
          className="w-[500px] max-h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            pointerEvents: 'auto',
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            borderColor: currentTheme.border,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <div
            className="overflow-y-auto no-scrollbar flex-1 min-h-0"
            style={{ padding: '10px' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: currentTheme.text }}>Bildirimler</h3>
              <button
                onClick={markAllNotificationsAsRead}
                disabled={markingAllNotifications || !Array.isArray(notifications) || notifications.length === 0}
                className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: `${currentTheme.border}40`,
                  color: currentTheme.text,
                  borderColor: currentTheme.border
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = `${currentTheme.border}60`}
                onMouseLeave={(e) => e.target.style.backgroundColor = `${currentTheme.border}40`}
              >
                Tümünü Oku
              </button>
            </div>
            {(!Array.isArray(notifications) || notifications.length === 0) ? (
              <div className="p-4 text-center" style={{ color: currentTheme.textSecondary }}>Bildirim bulunmuyor</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="p-3 last:border-b-0 transition-colors cursor-pointer"
                  style={{
                    borderBottom: `1px solid ${currentTheme.border}`,
                    backgroundColor: n.read_at ? `${currentTheme.border}20` : `${currentTheme.accent}20`
                  }}
                  onClick={() => onNotificationClick(n)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${currentTheme.border}30`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.read_at ? `${currentTheme.border}20` : `${currentTheme.accent}20`}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: currentTheme.text }}>{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: currentTheme.textSecondary }}>{formatDate(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
