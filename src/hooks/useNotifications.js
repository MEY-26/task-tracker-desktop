import { useCallback, useMemo, useRef, useState } from 'react';
import { Notifications } from '../api';

/**
 * Centralizes notification state (API backed + ephemeral toasts).
 * Callers can open tasks or user settings via callbacks for rich notification actions.
 */
export function useNotifications({ onOpenTask, onOpenUserSettings, canOpenUserSettings = false } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [notifPos, setNotifPos] = useState({ top: 64, right: 16 });

  const bellRef = useRef(null);
  const notifPanelRef = useRef(null);

  const badgeCount = useMemo(() => {
    if (!Array.isArray(notifications)) return 0;
    return notifications.filter((n) => !n.isFrontendNotification && !n.read_at).length;
  }, [notifications]);

  const resetNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const pushToast = useCallback((message, type = 'info', ttl = 5000) => {
    const id = `frontend_${Date.now()}`;
    const toast = {
      id,
      message,
      type,
      created_at: new Date().toISOString(),
      timestamp: new Date(),
      read_at: null,
      isFrontendNotification: true,
    };

    setNotifications((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return [toast, ...list.slice(0, 4)];
    });

    if (ttl > 0) {
      window.setTimeout(() => {
        setNotifications((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.filter((item) => item.id !== id);
        });
      }, ttl);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await Notifications.list();
      const remoteNotifications = response?.data ?? response ?? [];
      if (Array.isArray(remoteNotifications)) {
        setNotifications((prev) => {
          const localToasts = (Array.isArray(prev) ? prev : []).filter((n) => n.isFrontendNotification);
          return [...remoteNotifications, ...localToasts];
        });
      } else {
        console.warn('Notifications.list() unexpected payload:', response);
        setNotifications((prev) => (Array.isArray(prev) ? prev.filter((n) => n.isFrontendNotification) : []));
      }
    } catch (error) {
      console.error('Notifications load error:', error);
      const status = error?.response?.status;
      const unauthenticated =
        status === 401 || (status === 500 && error?.response?.data?.error === 'Unauthenticated.');

      if (!unauthenticated) {
        pushToast('Bildirimler alınamadı', 'error');
      }

      setNotifications((prev) => (Array.isArray(prev) ? prev.filter((n) => n.isFrontendNotification) : []));
    }
  }, [pushToast]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (markingAllNotifications) return;
    try {
      setMarkingAllNotifications(true);
      setNotifications((prev) =>
        Array.isArray(prev)
          ? prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
          : prev,
      );
      await Notifications.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Mark all notifications error:', error);
      pushToast('Bildirimler okunamadı', 'error');
    } finally {
      setMarkingAllNotifications(false);
    }
  }, [loadNotifications, markingAllNotifications, pushToast]);

  const handleNotificationClick = useCallback(
    async (notification) => {
      try {
        if (notification?.action === 'open_task' && notification?.task_id && onOpenTask) {
          await onOpenTask(notification.task_id);
          setShowNotifications(false);
        } else if (
          (notification?.action === 'open_user_settings' || notification?.type === 'password_reset_request') &&
          canOpenUserSettings &&
          onOpenUserSettings
        ) {
          onOpenUserSettings(notification);
          setShowNotifications(false);
        }
      } finally {
        try {
          if (notification?.id && !notification.isFrontendNotification) {
            await Notifications.delete(notification.id);
            await loadNotifications();
          }
        } catch (error) {
          console.warn('Notification delete failed:', error);
        }
      }
    },
    [canOpenUserSettings, loadNotifications, onOpenTask, onOpenUserSettings],
  );

  return {
    notifications,
    showNotifications,
    setShowNotifications,
    markingAllNotifications,
    markAllNotificationsAsRead,
    badgeCount,
    bellRef,
    notifPanelRef,
    notifPos,
    setNotifPos,
    loadNotifications,
    handleNotificationClick,
    pushToast,
    resetNotifications,
  };
}
