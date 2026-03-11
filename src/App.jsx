import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { login, restore, getUser, getUsers, Tasks, Notifications, registerUser, updateUserAdmin, deleteUserAdmin, changePassword, apiOrigin, PasswordReset, TaskViews, Team, TaskTypes, TaskStatuses } from './api';
import { api } from './api';
import './App.css'
import logo from './assets/VadenLogo.svg';
import { PriorityLabelWithTooltip } from './components/shared/PriorityLabelWithTooltip';
import { TooltipStatus } from './components/shared/TooltipStatus';
import LoginScreen from './components/auth/LoginScreen';
import { AddTaskForm } from './components/forms/AddTaskForm';
import PasswordChangeForm from './components/account/PasswordChangeForm';
import AdminCreateUser from './components/admin/AdminCreateUser';
import { ThemePanel } from './components/modals/ThemePanel';
import { WeeklyGoalsModal } from './components/modals/WeeklyGoalsModal';
import { GoalDescriptionModal } from './components/modals/GoalDescriptionModal';
import { TaskDetailModal } from './components/modals/TaskDetailModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { TeamModal } from './components/modals/TeamModal';
import UserPanel from './components/panels/UserPanel';
import { NotificationsPanel } from './components/panels/NotificationsPanel';
import { ProfileMenuDropdown } from './components/panels/ProfileMenuDropdown';
import { WeeklyOverviewView } from './components/views/WeeklyOverviewView';
import { TaskListView } from './components/views/TaskListView';
import { AppFooter } from './components/layout/AppFooter';
import { TaskSettingsModal } from './components/modals/TaskSettingsModal';
import { LeaveRequestModal } from './components/modals/LeaveRequestModal';
import { UpdatesModal } from './components/modals/UpdatesModal';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import { useTheme } from './contexts/ThemeContext';
import { useTaskSettings } from './hooks/useTaskSettings';
import { useUsers } from './hooks/useUsers';
import { useWeeklyGoals } from './hooks/useWeeklyGoals';
import { useWeeklyOverview } from './hooks/useWeeklyOverview';
import { usePreventAutofill } from './hooks/usePreventAutofill';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { getMonday, fmtYMD, isoWeekNumber, at1330, formatDate, formatDateOnly } from './utils/date.js';
import { getPerformanceGrade, getPriorityColor, getPriorityText, getTaskTypeText, getTaskTypeColor, getStatusText, getStatusColor, resolveUserName, renderHistoryValue, renderFieldLabel, getRoleText } from './utils/performance.js';
import { getDailyActualLimits, getDailyOvertimeLimits, getMaxActualLimitForToday, getMaxOvertimeLimitForToday } from './utils/weeklyLimits.js';
import { buildTasksSignature, buildTaskSignatureOne } from './utils/tasks.js';
import { applyTeamLeaderAssignments } from './utils/teamAssignments.js';


const WEEKLY_BASE_MINUTES = 2700;

function App() {
  const { user, setUser } = useAuth();
  const { notifications, setNotifications, addNotification, showNotifications, setShowNotifications } = useNotification();
  const { currentThemeName, setCurrentThemeName, customTheme, setCustomTheme, currentTheme, currentLogo, predefinedThemes, showThemePanel, setShowThemePanel, themeSaveState, setThemeSaveState, isThemeLoading, saveThemeNow } = useTheme();
  const taskSettings = useTaskSettings(user?.id);
  const { showTaskSettings, setShowTaskSettings, customTaskTypes, setCustomTaskTypes, customTaskStatuses, setCustomTaskStatuses, allTaskTypesFromAPI, setAllTaskTypesFromAPI, selectedTaskTypeForStatuses, setSelectedTaskTypeForStatuses, newTaskTypeName, setNewTaskTypeName, newTaskTypeColor, setNewTaskTypeColor, newStatusName, setNewStatusName, newStatusColor, setNewStatusColor, editingTaskTypeId, editingTaskTypeName, setEditingTaskTypeName, editingTaskTypeColor, setEditingTaskTypeColor, editingTaskStatusId, editingTaskStatusName, setEditingTaskStatusName, editingTaskStatusColor, setEditingTaskStatusColor, getAllTaskTypes, getAllTaskStatuses, getSystemTaskStatuses, getSystemTaskTypeNames, loadTaskSettings, handleAddTaskType, handleAddTaskStatus, handleDeleteTaskType, handleDeleteTaskStatus, handleEditTaskType, handleEditTaskStatus, handleSaveTaskType, handleSaveTaskStatus, handleCancelEditTaskType, handleCancelEditTaskStatus } = taskSettings;
  const [loading, setLoading] = useState(false);
  const usersHook = useUsers({ setLoading });
  const { users, setUsers, showUserPanel, setShowUserPanel, teamMembers, setTeamMembers, loadUsers, loadTeamMembers, handleBulkUserImport } = usersHook;
  const weeklyGoalsHook = useWeeklyGoals();
  const { weeklyGoals, setWeeklyGoals, weeklyWeekStart, setWeeklyWeekStart, weeklyUserId, setWeeklyUserId, weeklyLeaveMinutesInput, setWeeklyLeaveMinutesInput, weeklyOvertimeMinutesInput, setWeeklyOvertimeMinutesInput, weeklySaveState, setWeeklySaveState, transferButtonText, setTransferButtonText, weeklyValidationErrors, setWeeklyValidationErrors, weeklyLive, uiLocks, combinedLocks, loadWeeklyGoals, saveWeeklyGoals, approveWeeklyGoals, transferIncompleteTasksFromPreviousWeek, updateNumberInput, saveTextInputToState, getTextInputKey, getInvalidItemIndices, updateInvalidItemsIfActive, handleWeeklyLeaveMinutesChange, handleWeeklyLeaveMinutesBlur, handleWeeklyOvertimeMinutesChange, handleWeeklyOvertimeMinutesBlur, textInputRefs, goalDescriptionRef, prevWeeklyDataRef, weeklySaveStateTimeoutRef, weeklyLeaveMinutes, weeklyOvertimeMinutes } = weeklyGoalsHook;
  const [tasks, setTasks] = useState([]);
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingDates, setEditingDates] = useState({ start_date: '', due_date: '' });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'waiting',
    task_type: 'development',
    responsible_id: null,
    assigned_users: [],
    start_date: '',
    due_date: '',
    attachments: []
  });
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearchDetail, setAssigneeSearchDetail] = useState('');
  const [showAssigneeDropdownDetail, setShowAssigneeDropdownDetail] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const resetNewTask = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      status: 'waiting',
      task_type: 'development',
      responsible_id: null,
      assigned_users: [],
      start_date: '',
      due_date: '',
      attachments: []
    });
    setAssigneeSearch('');
    setShowAssigneeDropdown(false);
    setError(null);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskLastViews, setTaskLastViews] = useState([]);
  const [taskHistories, setTaskHistories] = useState({});
  const [showWeeklyGoals, setShowWeeklyGoals] = useState(false);
  const weeklyOverviewHook = useWeeklyOverview();
  const { showWeeklyOverview, setShowWeeklyOverview, weeklyOverview, weeklyOverviewLoading, weeklyOverviewError, setWeeklyOverviewError, weeklyOverviewWeekStart, loadWeeklyOverview } = weeklyOverviewHook;
  const [showGoalDescription, setShowGoalDescription] = useState(false);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(null);
  const [goalDescription, setGoalDescription] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkLeaderId, setBulkLeaderId] = useState('');
  const bellRef = useRef(null);
  const notifPanelRef = useRef(null);
  const [notifPos, setNotifPos] = useState({ top: 64, right: 16 });
  const badgeCount = Array.isArray(notifications) ? notifications.filter(n => !n.isFrontendNotification && !n.read_at).length : 0;
  const [historyDeleteMode, setHistoryDeleteMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [updatesContent, setUpdatesContent] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('all');
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // { percent: number|null, label: string }
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [detailDraft, setDetailDraft] = useState(null);
  const assigneeDetailInputRef = useRef(null);

  const taskCounts = {
    active: Array.isArray(tasks) ? tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length : 0,
    completed: Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0,
    deleted: Array.isArray(tasks) ? tasks.filter(t => t.status === 'cancelled').length : 0
  };

  const taskRefreshTimer = useRef(null);
  const isRefreshingTasks = useRef(false);
  const lastTasksSigRef = useRef('');
  const showDetailModalRef = useRef(false);
  const selectedTaskRef = useRef(null);
  const lastSelectedSigRef = useRef('');
  const previousResponsibleIdRef = useRef(null);
  const previousResponsibleIdDetailRef = useRef(null);
  const manuallyRemovedUsersRef = useRef(new Set()); // Manuel olarak kaldırılan kullanıcıları takip et

  useEffect(() => {
    showDetailModalRef.current = showDetailModal;
    selectedTaskRef.current = selectedTask;
  }, [showDetailModal, selectedTask]);
  useEffect(() => {
    setDescDraft(selectedTask?.description ?? '');
  }, [selectedTask, showDetailModal]);
  useEffect(() => { lastSelectedSigRef.current = buildTaskSignatureOne(selectedTask); }, [selectedTask]);

  useEffect(() => {
    if (!showNotifications) return;

    const place = () => {
      if (!bellRef.current) return;
      const r = bellRef.current.getBoundingClientRect();
      const panelWidth = 500;
      const maxPanelHeight = 600;

      let top = r.bottom + 8;
      let right = Math.max(16, window.innerWidth - r.right + 8);

      if (top + maxPanelHeight > window.innerHeight) {
        top = Math.max(16, window.innerHeight - maxPanelHeight - 16);
      }

      if (right + panelWidth > window.innerWidth) {
        right = window.innerWidth - panelWidth - 16;
      }

      setNotifPos({
        top,
        right,
      });
    };


    const onDown = (e) => {
      const panel = notifPanelRef.current;
      const bell = bellRef.current;
      if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onDown);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [showNotifications]);


  useEffect(() => {
    function handleClickOutside(event) {
      if (showProfileMenu && !event.target.closest('.profile-menu')) {
        setShowProfileMenu(false);
      }
      if (showAssigneeDropdown && !event.target.closest('.assignee-dropdown-container')) {
        setShowAssigneeDropdown(false);
      }
      if (showAssigneeDropdownDetail && !event.target.closest('.assignee-dropdown-detail-container')) {
        setShowAssigneeDropdownDetail(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showAssigneeDropdown, showAssigneeDropdownDetail]);

  useEffect(() => {
    checkAuth();
  }, []); // Sadece component mount olduğunda çalış

  const isModalOpen = showAddForm || showDetailModal || showWeeklyGoals ||
    showGoalDescription || showUserProfile || showTeamModal ||
    showUserPanel || showNotifications || showTaskSettings || showThemePanel || showLeaveRequestModal;
  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    if (user?.role !== 'admin' && showWeeklyOverview) {
      setShowWeeklyOverview(false);
    }
  }, [user?.role, showWeeklyOverview]);

  usePreventAutofill();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showDetailModal) {
          handleCloseModal();
        } else if (showTaskSettings) {
          setShowTaskSettings(false);
        }
      }
    };
    if (showDetailModal || showTaskSettings) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [showDetailModal, showTaskSettings, selectedTask, descDraft, user?.role, handleCloseModal]);

  // Yeni görev formu açıldığında previousResponsibleIdRef ve manuallyRemovedUsersRef'i sıfırla
  useEffect(() => {
    if (showAddForm) {
      previousResponsibleIdRef.current = null;
      manuallyRemovedUsersRef.current = new Set();
    }
  }, [showAddForm]);

  // Görev detay modalı açıldığında previousResponsibleIdDetailRef'i sıfırla
  useEffect(() => {
    if (showDetailModal && selectedTask) {
      previousResponsibleIdDetailRef.current = selectedTask.responsible?.id || null;
    }
  }, [showDetailModal]);

  // Sorumlu seçildiğinde takım liderinin ekibini otomatik ekle (sadece yeni görev formunda)
  useEffect(() => {
    if (showAddForm && newTask.responsible_id && users) {
      const currentIds = Array.isArray(newTask.assigned_users) ? newTask.assigned_users : [];
      const result = applyTeamLeaderAssignments(users, newTask.responsible_id, currentIds, {
        previousResponsibleId: previousResponsibleIdRef.current,
        manuallyRemovedIds: manuallyRemovedUsersRef.current
      });
      setNewTask(prev => ({ ...prev, assigned_users: result }));
      previousResponsibleIdRef.current = newTask.responsible_id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTask.responsible_id, showAddForm]);

  // Reset weekly save state when data changes or modal reopens
  useEffect(() => {
    // Modal açıldığında state'i sıfırla
    if (showWeeklyGoals && weeklySaveState !== 'idle') {
      setWeeklySaveState('idle');
    }
  }, [showWeeklyGoals]);

  // Data değiştiğinde state'i sıfırla (yalnızca saved durumundaysa)
  useEffect(() => {
    const currentItemsStr = JSON.stringify(weeklyGoals.items);
    const currentLeaveMinutes = weeklyLeaveMinutesInput;
    const currentOvertimeMinutes = weeklyOvertimeMinutesInput;

    // İlk render'da önceki değerleri kaydet
    if (prevWeeklyDataRef.current.items === null) {
      prevWeeklyDataRef.current = {
        items: currentItemsStr,
        leaveMinutes: currentLeaveMinutes,
        overtimeMinutes: currentOvertimeMinutes
      };
      return;
    }

    // Değişiklik var mı kontrol et
    const hasChanged =
      prevWeeklyDataRef.current.items !== currentItemsStr ||
      prevWeeklyDataRef.current.leaveMinutes !== currentLeaveMinutes ||
      prevWeeklyDataRef.current.overtimeMinutes !== currentOvertimeMinutes;

    // Değişiklik varsa ve saved durumundaysa idle'a dön
    if (hasChanged && weeklySaveState === 'saved') {
      setWeeklySaveState('idle');
    }

    // Önceki değerleri güncelle
    prevWeeklyDataRef.current = {
      items: currentItemsStr,
      leaveMinutes: currentLeaveMinutes,
      overtimeMinutes: currentOvertimeMinutes
    };
  }, [weeklyGoals.items, weeklyLeaveMinutesInput, weeklyOvertimeMinutesInput, weeklySaveState]);

  // Haftalık hedef listesini otomatik güncelle (kayıt sonrası - sadece showWeeklyOverview açıksa)
  // Not: Bu sadece overview açıkken güncelleme yapar, kaydet butonunun durumunu etkilemez
  useEffect(() => {
    if (showWeeklyOverview && weeklyWeekStart && weeklySaveState === 'saved') {
      // Kayıt tamamlandıktan sonra kısa bir gecikme ile güncelle
      const timer = setTimeout(() => {
        loadWeeklyOverview(weeklyWeekStart);
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklySaveState === 'saved', showWeeklyOverview, weeklyWeekStart]);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const isAuthenticated = await restore();
      if (isAuthenticated) {
        try {
          const userData = await getUser();
          setUser(userData);
          const jobs = [loadTasks(), loadNotifications()];
          if (['admin', 'team_leader', 'observer'].includes(userData?.role)) {
            jobs.push(loadUsers());
          }
          await Promise.all(jobs);
        } catch (err) {
          console.error('User fetch error:', err);
          // 401 veya 500 + "Unauthenticated" hatası için logout yap
          if (err.response?.status === 401 ||
            (err.response?.status === 500 && err.response?.data?.error === 'Unauthenticated.')) {
            console.warn('Token expired or invalid, logging out...');
            handleLogout();
          } else {
            console.error('Unexpected error in checkAuth:', err);
            handleLogout();
          }
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setError('Oturum kontrolü başarısız');
    } finally {
      setLoading(false);
    }
  }, [handleLogout, loadTasks, loadNotifications, loadUsers]);

  async function openTaskById(taskId) {
    try {
      const inList = (Array.isArray(tasks) ? tasks : []).find(t => t.id === taskId);
      if (inList) {
        await handleTaskClick(inList);
        return true;
      }
      const t = await Tasks.get(taskId);
      const task = t.task || t;
      if (task) {
        await handleTaskClick(task);
        return true;
      }
    } catch (err) {
      console.error('Open task by id error:', err);
      addNotification('Görev yüklenemedi', 'error');
    }
    return false;
  }

  async function handleNotificationClick(n) {
    try {
      if (n.action === 'open_task' && n.task_id) {
        await openTaskById(n.task_id);
        setShowNotifications(false);
      } else if ((n.action === 'open_user_settings' || n.type === 'password_reset_request') && (user?.role === 'admin')) {
        if (!showUserPanel) setShowUserPanel(true);
        if (n.user_email) setUserSearchTerm(n.user_email);
        setShowNotifications(false);
      }
    } finally {
      // Bildirim kalıcı değil: tıklanınca silinir
      try { await Notifications.delete(n.id); await loadNotifications(); } catch (error) { console.warn('Notification delete failed:', error); }
    }
  }

  async function loadTasks() {
    try {
      const tasksList = await Tasks.list();
      if (Array.isArray(tasksList)) {
        setTasks(tasksList);
      } else if (tasksList && Array.isArray(tasksList.data)) {
        setTasks(tasksList.data);
      } else {
        console.warn('Tasks API returned non-array data:', tasksList);
        setTasks([]);
      }
    } catch (err) {
      console.error('Tasks load error:', err);
      setError('Görevler yüklenemedi');
      setTasks([]);
    }
  }

  async function refreshTasksOnce() {
    if (isRefreshingTasks.current) return;
    isRefreshingTasks.current = true;
    try {
      const list = await Tasks.list();
      const next = Array.isArray(list) ? list : (Array.isArray(list?.data) ? list.data : []);
      const nextSig = buildTasksSignature(next);
      if (nextSig !== lastTasksSigRef.current) {
        setTasks(next);
        lastTasksSigRef.current = nextSig;
      }

      const currentSelected = selectedTaskRef.current;
      if (showDetailModalRef.current && currentSelected?.id) {
        const inList = next.find(t => t.id === currentSelected.id);
        let freshTask = inList;
        if (!freshTask) {
          try {
            const t = await Tasks.get(currentSelected.id);
            freshTask = t.task || t;
          } catch (err) {
            console.warn('Task history operation failed:', err.message);
          }
        }
        if (freshTask) {
          const nextSelSig = buildTaskSignatureOne(freshTask);
          const prevSelSig = lastSelectedSigRef.current;
          const comboboxOpen = showAssigneeDropdownDetail === true;
          if (nextSelSig !== prevSelSig) {
            if (!comboboxOpen) {
              setSelectedTask(freshTask);
              lastSelectedSigRef.current = nextSelSig;
              try {
                const h = await Tasks.getHistory(currentSelected.id);
                setTaskHistory(Array.isArray(h) ? h : []);
              } catch (err) {
                console.warn('Task history refresh failed:', err.message);
              }
              try {
                const v = await TaskViews.getLast(currentSelected.id);
                setTaskLastViews(Array.isArray(v) ? v : []);
              } catch (err) {
                console.warn('Task last views refresh failed:', err.message);
              }
            } else {
              // intentionally left blank
            }
          }
        }
      }
    } catch (error) {
      console.warn('Task refresh failed:', error);
    } finally {
      isRefreshingTasks.current = false;
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    refreshTasksOnce();

    taskRefreshTimer.current = setInterval(() => {
      refreshTasksOnce();
    }, 3000);

    const onFocus = () => refreshTasksOnce();
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshTasksOnce(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (taskRefreshTimer.current) clearInterval(taskRefreshTimer.current);
      taskRefreshTimer.current = null;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id, refreshTasksOnce]);

  // loadUsers, loadTaskSettings from hooks; useTaskSettings loads on userId, useUsers loads on panel open / user login

  async function loadPasswordResetRequests() {
    try {
      if (user?.role === 'admin') {
        const requests = await PasswordReset.getResetRequests();
        setPasswordResetRequests(requests);
      }
    } catch (err) {
      console.error('Load password reset requests error:', err);
      setPasswordResetRequests([]);
    }
  }

  async function loadNotifications() {
    try {
      const res = await Notifications.list();

      let list =
        Array.isArray(res) ? res :
          Array.isArray(res?.notifications) ? res.notifications :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.data?.notifications) ? res.data.notifications :
                [];

      list = list.map((n, i) => ({
        id: n.id ?? n.uuid ?? `srv_${i}`,
        message: n.data?.message ?? n.message ?? 'Bildirim mesajı bulunamadı',
        created_at: n.created_at ?? n.updated_at ?? n.timestamp ?? new Date().toISOString(),
        read_at: n.read_at ?? null,
        isFrontendNotification: false,
        raw: n,
        type: n.data?.type || n.type || null,
        action: n.data?.action || null,
        task_id: n.data?.task_id || null,
        task_title: n.data?.task_title || null,
        user_id: n.data?.user_id || null,
        user_email: n.data?.user_email || null,
        request_id: n.data?.request_id || null,
      }));

      // okundu bilgisi kullanılmıyor; tüm bildirimleri göster

      list = list.filter(n => {
        const message = n.message || '';
        return !message.includes('Şifreniz admin tarafından sıfırlandı');
      });

      setNotifications(list);

      if (user?.role === 'admin') {
        await loadPasswordResetRequests();
      }
    } catch (err) {
      console.error('Notifications load error:', err);
      if (err.response?.status === 401 ||
        (err.response?.status === 500 && err.response?.data?.error === 'Unauthenticated.')) {
        console.warn('Unauthorized notification access, clearing notifications');
        // Authentication sorunu - notifications'ı temizle ama sayfayı reload etme
      } else if (err.response?.status === 404) {
        console.warn('Notifications endpoint not found');
      } else {
        console.error('Unexpected notification error:', err.message);
      }
      setNotifications([]);
    }
  }
  async function markAllNotificationsAsRead() {
    if (markingAllNotifications) return;
    try {
      setMarkingAllNotifications(true);
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })) : prev);
      await Notifications.markAllAsRead();
      await loadNotifications();
    } catch (err) {
      console.error('Mark all notifications error:', err);
      addNotification('Bildirimler okunamadı', 'error');
    } finally {
      setMarkingAllNotifications(false);
    }
  }



  async function doLogin() {
    try {
      setLoading(true);
      setError(null);

      const u = await login(loginForm.email, loginForm.password);
      setUser(u);

      addNotification('Başarıyla giriş yapıldı', 'success');
      const jobs = [loadTasks(), loadNotifications()];
      if (['admin', 'team_leader', 'observer'].includes(u?.role)) {
        jobs.push(loadUsers());
      }
      if (u?.role === 'admin') {
        jobs.push(loadPasswordResetRequests());
      }
      await Promise.all(jobs);
    } catch (err) {
      console.error('Login error:', err);

      if (err.response?.status === 422) {
        setError('Geçersiz kullanıcı bilgileri');
        addNotification('Giriş başarısız: Geçersiz kullanıcı bilgileri', 'error');
      } else if (err.response?.status === 404) {
        setError('API endpoint bulunamadı. Laravel API çalışıyor mu?');
        addNotification('API bağlantı hatası', 'error');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Ağ bağlantısı hatası. Laravel API çalışıyor mu?');
        addNotification('Ağ bağlantısı hatası', 'error');
      } else {
        setError(`Giriş başarısız: ${err.response?.data?.message || err.message}`);
        addNotification('Giriş başarısız', 'error');
      }
    } finally {
      setLoading(false);
    }
    }

  function handleLogout() {
    localStorage.removeItem('jwt');
    setShowWeeklyOverview(false);
    setWeeklyOverview({ week_start: '', items: [] });
    setWeeklyOverviewError(null);
    setWeeklyOverviewWeekStart('');
    setWeeklyOverviewLoading(false);
    setUser(null);
    setTasks([]);
    setError(null);
    setSelectedTask(null);
  }

  // validateDates fonksiyonu kaldırıldı - tarih validasyonu yapılmıyor

  // Görev ekleme fonksiyonu
  async function handleAddTask() {
    try {
      setAddingTask(true);
      setError(null);

      // Tarih validasyonu kaldırıldı - kullanıcı istediği tarihi girebilir

      const responsibleId = newTask.responsible_id ? parseInt(newTask.responsible_id) : user.id;
      const currentAssigned = Array.isArray(newTask.assigned_users) ? newTask.assigned_users : [];
      const assignedUsers = applyTeamLeaderAssignments(users, responsibleId, currentAssigned, {
        manuallyRemovedIds: manuallyRemovedUsersRef.current
      });

      // Renk bilgilerini al
      const taskTypeColor = getTaskTypeColor(newTask.task_type, null, getAllTaskTypes());
      const statusColor = getStatusColor(newTask.status, null, customTaskStatuses);

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        task_type: newTask.task_type,
        task_type_color: taskTypeColor,
        status_color: statusColor,
        responsible_id: responsibleId,
        assigned_users: assignedUsers,
        start_date: newTask.start_date || null,
        due_date: newTask.due_date || null,
      };



      let response;
      if (newTask.attachments.length > 0) {
        setUploadProgress({ percent: 0, label: 'Dosyalar yükleniyor' });
        const form = new FormData();
        Object.keys(taskData).forEach(key => {
          if (taskData[key] !== null && taskData[key] !== undefined) {
            if (key === 'assigned_users') {
              taskData[key].forEach(userId => form.append('assigned_users[]', userId));
            } else {
              form.append(key, taskData[key]);
            }
          }
        });

        newTask.attachments.forEach(file => {
          form.append('attachments[]', file);
        });

        response = await api.post('/tasks', form, {
          // Content-Type header'ı interceptor tarafından otomatik olarak kaldırılacak
          timeout: 0, // large files: disable per-request timeout
          onUploadProgress: (e) => {
            try {
              const total = e.total || 0;
              const percent = total ? Math.min(100, Math.round((e.loaded * 100) / total)) : null;
              setUploadProgress({ percent, label: 'Dosyalar yükleniyor' });
            } catch (error) {
              console.warn('Upload progress error:', error);
              setUploadProgress({ percent: null, label: 'Dosyalar yükleniyor' });
            }
          }
        });
      } else {
        response = await Tasks.create(taskData);
      }


      let createdTask;
      if (response && response.data) {
        createdTask = response.data.task || response.data;
      } else if (response && response.task) {
        createdTask = response.task;
      } else {
        createdTask = response;
      }


      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return [...currentTasks, createdTask];
      });

      addNotification('Görev başarıyla eklendi', 'success');

      setError(null);

      await loadNotifications();

      resetNewTask();
      setShowAddForm(false);
    } catch (err) {
      console.error('Add task error:', err);
      setError('Görev eklenemedi');
      addNotification('Görev eklenemedi', 'error');
    } finally {
      setUploadProgress(null);
      setAddingTask(false);
    }
  }

  async function handleUpdateTask(taskId, updates) {
    try {
      setLoading(true);
      setError(null);

      // Tarih validasyonu handleDateChange'de yapılıyor, burada tekrar yapmaya gerek yok

      const response = await Tasks.update(taskId, updates);
      const updatedTask = response.task;

      if (!updatedTask) {
        console.error('No task data in update response:', response);
        throw new Error('Görev güncelleme yanıtında görev verisi bulunamadı');
      }

      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return currentTasks.map(task =>
          task.id === taskId ? updatedTask : task
        );
      });

      if (selectedTask && selectedTask.id === taskId) {
        // Tarih güncellemesi için selectedTask'ı güncelle
        const isDateUpdate = Object.keys(updates).some(key =>
          key === 'start_date' || key === 'due_date' || key === 'end_date'
        );

        if (isDateUpdate) {
          // Tarih güncellemesi için sadece ilgili alanı güncelle
          setSelectedTask(prev => ({
            ...prev,
            ...updates
          }));
        } else {
          setSelectedTask(updatedTask);
        }

        try {
          const history = await Tasks.getHistory(taskId);
          setTaskHistory(Array.isArray(history) ? history : []);
        } catch (err) {
          console.error('Task history refresh error:', err);
        }
      }

      try {
        const history = await Tasks.getHistory(taskId);
        setTaskHistories(prev => ({
          ...prev,
          [taskId]: Array.isArray(history) ? history : []
        }));
      } catch (err) {
        console.error('Task histories update error:', err);
        // Geçmiş güncelleme hatası ana işlemi etkilememeli
      }

      addNotification('Görev başarıyla güncellendi', 'success');
      return response;
    } catch (err) {
      console.error('Update task error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);

      const errorMessage = err.response?.data?.message || err.message || 'Görev güncellenemedi';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }


  // Check if user can delete a specific task
  async function canDeleteTask(taskId) {
    try {
      const response = await api.get(`/tasks/${taskId}/can-delete`);
      return response.data;
    } catch (err) {
      console.error('Check delete permission error:', err);
      return { can_delete: false, reason: 'Yetki kontrolü yapılamadı' };
    }
  }

  async function handlePermanentDelete(taskId) {
    // First check if user can delete this task
    const permissionCheck = await canDeleteTask(taskId);

    if (!permissionCheck.can_delete) {
      addNotification(permissionCheck.reason || 'Bu görevi silme yetkiniz yok', 'error');
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    const statusText = task?.status === 'cancelled' ? 'iptal edilen' :
      task?.status === 'completed' ? 'tamamlanan' : 'bu durumdaki';

    if (!window.confirm(`Bu ${statusText} görevi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm ekleri de silinecektir!`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await Tasks.delete(taskId);

      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return currentTasks.filter(task => task.id !== taskId);
      });

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
        setShowDetailModal(false);
        setEditingDates({ start_date: '', due_date: '' });
      }

      const message = response.data?.message || 'Görev kalıcı olarak silindi';
      addNotification(message, 'success');

      // Show additional info if some files failed to delete
      if (response.data?.failed_files > 0) {
        addNotification(`${response.data.failed_files} dosya silinemedi, loglara bakın`, 'warning');
      }
    } catch (err) {
      console.error('Permanent delete task error:', err);
      const errorMessage = err.response?.data?.message || 'Görev silinemedi';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  // handleStatusChange removed: status is drafted and saved on modal close

  async function handleDateChange(taskId, field, newDate) {
    // Sadece local draft'ı güncelle; kayıt modal kapanınca yapılacak
    setEditingDates(prev => ({
      ...prev,
      [field]: newDate || ''
    }));
  }

  async function handleTaskClick(task) {
    setSelectedTask(task);
    setEditingDates({
      start_date: task.start_date ? task.start_date.slice(0, 10) : '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : ''
    });
    setDetailDraft({
      status: task.status || 'waiting',
      priority: task.priority || 'medium',
      task_type: task.task_type || 'development',
      responsible_id: task.responsible?.id || '',
      assigned_user_ids: (task.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x)),
      no: task.no || '',
    });
    setShowDetailModal(true);

    // Kaydı bağımsız çalıştır: geçmiş başarısız olsa bile görüntüleme/veriler yüklensin
    try { await Tasks.recordView(task.id); } catch (error) { console.warn('Task view record failed:', error); }

    // Geçmişi yükle (başarısız olabilir)
    try {
      const history = await Tasks.getHistory(task.id);
      setTaskHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('Task history load error:', err);
      if (err?.response?.status === 404) {
        console.warn('Task history not found for task:', task.id);
      } else if (err?.response?.status === 403) {
        console.warn('Access denied to task history for task:', task.id);
      }
      setTaskHistory([]);
      setComments([]);
    }

    // Son görüntülemeleri yükle (her durumda dene)
    try {
      const v = await TaskViews.getLast(task.id);
      setTaskLastViews(Array.isArray(v) ? v : []);
    } catch (err) {
      console.warn('Task last views load error:', err?.message);
      setTaskLastViews([]);
    }
  }

  async function handleCloseModal() {
    try {
      if (selectedTask) {
        const updates = {};
        const isTeamLeader = user?.role === 'team_leader';
        const isAdmin = user?.role === 'admin';
        const isResponsible = user?.id === selectedTask.responsible?.id;

        // Takım lideri sadece bitiş tarihi ve durum değiştirebilir (oluşturan değilse)
        const isCreatorModal = user?.id === selectedTask.creator?.id;
        if (isTeamLeader && !isAdmin && !isResponsible && !isCreatorModal) {
          // Sadece status ve due_date
          if (detailDraft) {
            if ((detailDraft.status || 'waiting') !== (selectedTask.status || 'waiting')) {
              updates.status = detailDraft.status || 'waiting';
            }
          }
          const curDue = selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : '';
          if ((editingDates.due_date || '') !== curDue) {
            updates.due_date = editingDates.due_date || null;
          }
        } else {
          // Admin, Sorumlu veya diğer roller için tüm alanlar
          // Description (admin only in UI, but backend will validate anyway)
          if ((descDraft ?? '') !== (selectedTask.description ?? '')) {
            updates.description = descDraft ?? '';
          }

          // Drafted selectable fields
          if (detailDraft) {
            // NO alanı sadece Admin veya Sorumlu tarafından değiştirilebilir
            if (isAdmin || isResponsible) {
              if ((detailDraft.no || '') !== (selectedTask.no || '')) {
                updates.no = detailDraft.no || '';
              }
            }
            // Başlık alanı Admin, Sorumlu veya Oluşturan tarafından değiştirilebilir
            const isCreator = user?.id === selectedTask.creator?.id;
            if (isAdmin || isResponsible || isCreator) {
              if (detailDraft.title !== undefined && (detailDraft.title || '') !== (selectedTask.title || '')) {
                updates.title = detailDraft.title || '';
              }
            }
            if ((detailDraft.status || 'waiting') !== (selectedTask.status || 'waiting')) {
              updates.status = detailDraft.status || 'waiting';
            }
            if ((detailDraft.priority || 'medium') !== (selectedTask.priority || 'medium')) {
              updates.priority = detailDraft.priority || 'medium';
            }
            if ((detailDraft.task_type || 'development') !== (selectedTask.task_type || 'development')) {
              updates.task_type = detailDraft.task_type || 'development';
            }
            const currentResponsibleId = selectedTask.responsible?.id || null;
            if ((detailDraft.responsible_id || null) !== currentResponsibleId) {
              updates.responsible_id = detailDraft.responsible_id || null;
              const newResponsibleId = detailDraft.responsible_id || null;
              const beforeIds = (selectedTask.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x));
              updates.assigned_users = applyTeamLeaderAssignments(users, newResponsibleId, beforeIds, {
                previousResponsibleId: previousResponsibleIdDetailRef.current
              });
              previousResponsibleIdDetailRef.current = newResponsibleId;
            }

            // Eğer sorumlu değişmediyse, sadece atananları kontrol et
            if (!updates.assigned_users) {
              const beforeIds = (selectedTask.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x));
              const afterIds = Array.isArray(detailDraft.assigned_user_ids) ? detailDraft.assigned_user_ids : beforeIds;
              const sameLength = beforeIds.length === afterIds.length;
              const sameSet = sameLength && beforeIds.every(id => afterIds.includes(id));
              if (!sameSet) {
                updates.assigned_users = afterIds;
              }
            }
          }

          // Dates (from editingDates)
          const curStart = selectedTask.start_date ? selectedTask.start_date.slice(0, 10) : '';
          const curDue = selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : '';
          if ((editingDates.start_date || '') !== curStart) {
            updates.start_date = editingDates.start_date || null;
          }
          if ((editingDates.due_date || '') !== curDue) {
            updates.due_date = editingDates.due_date || null;
          }
        }

        if (Object.keys(updates).length > 0) {
          await handleUpdateTask(selectedTask.id, updates);
          addNotification('Değişiklikler kaydedildi', 'success');
        }
      }
    } catch (error) {
      console.error('Save-on-close error:', error);
      addNotification('Değişiklikler kaydedilemedi', 'error');
    } finally {
      setShowDetailModal(false);
      setSelectedTask(null);
      setNewComment('');
      setHistoryDeleteMode(false);
      setEditingDates({ start_date: '', due_date: '' });
      setDetailDraft(null);
    }
  }



  async function handleAddComment() {
    const text = newComment.trim();
    if (!text || !selectedTask) return;

    try {
      await Tasks.comment(selectedTask.id, text);
      try {
        const h = await Tasks.getHistory(selectedTask.id);
        setTaskHistory(Array.isArray(h) ? h : []);

        setTaskHistories(prev => ({
          ...prev,
          [selectedTask.id]: Array.isArray(h) ? h : []
        }));
      } catch (err) {
        console.warn('Task history operation failed:', err.message);
      }
      setNewComment('');
      addNotification('Yorum eklendi', 'success');
    } catch (e) {
      console.error('Comment error:', e);
      console.error('Error response:', e.response?.data);
      const errorMessage = e.response?.data?.message || 'Yorum eklenemedi';
      addNotification(errorMessage, 'error');
    }
  }




  function getLastAddedDescription(taskHistory) {
    if (!Array.isArray(taskHistory) || taskHistory.length === 0) {
      return 'Henüz açıklama eklenmemiş';
    }

    const comments = taskHistory.filter(h => h.field === 'comment' && h.new_value && h.new_value.trim().length > 0);

    if (comments.length > 0) {
      const sortedComments = comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return sortedComments[0].new_value;
    }

    return 'Henüz açıklama eklenmemiş';
  }

  async function loadTaskHistoryForTooltip(taskId) {
    if (taskHistories[taskId]) {
      return;
    }

    try {
      const history = await Tasks.getHistory(taskId);

      setTaskHistories(prev => ({
        ...prev,
        [taskId]: Array.isArray(history) ? history : []
      }));
    } catch (err) {
      console.warn('Failed to load task history for tooltip:', err);
      setTaskHistories(prev => ({
        ...prev,
        [taskId]: []
      }));
    }
  }


  function getEligibleResponsibleUsers() {
    if (!users || !user) return [];

    return users.filter(u => {
      if (u.role === 'observer') return false;
      return true;
    });
  }

  function getEligibleAssignedUsers(responsibleId = null) {
    if (!users || !user) return [];

    return users.filter(u => {
      if (u.role === 'observer') return false;
      if (responsibleId && u.id === parseInt(responsibleId)) return false;
      return true;
    });
  }

  const defaultWeekStart = fmtYMD(getMonday());
  const effectiveWeeklyOverviewWeekStart = weeklyOverviewWeekStart || weeklyOverview.week_start || defaultWeekStart;

  if (!user && !loading) {
    return (
      <LoginScreen
        logoSrc={currentLogo || logo}
        error={error}
        loading={loading}
        loginForm={loginForm}
        onLoginFormChange={(field, value) => setLoginForm(prev => ({ ...prev, [field]: value }))}
        onSubmit={doLogin}
        onForgotPasswordSubmit={async () => {
          try {
            setLoading(true);
            await PasswordReset.requestReset(loginForm.email);
            setError(null);
            setShowForgotPassword(false);
            addNotification('Şifre sıfırlama talebi admin\'lere gönderildi', 'success');
          } catch (err) {
            console.error('Forgot password error:', err);
            setError(err.response?.data?.message || 'Bir hata oluştu');
          } finally {
            setLoading(false);
          }
        }}
        showForgotPassword={showForgotPassword}
        onToggleForgotPassword={() => {
          setShowForgotPassword(prev => !prev);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="app-shell overflow-hidden no-scrollbar" style={{ backgroundColor: currentTheme.background }}>
      <main className="main-content">
        <div className="shadow-lg w-full" style={{ backgroundColor: currentTheme.background }}>
          <div className="shadow-lg w-full AppContent" style={{ backgroundColor: currentTheme.background }}>
            <div className="flex justify-between w-full max-w-7xl mx-auto px-4" style={{ maxWidth: '1440px' }}>
              <img
                src={currentLogo || logo}
                alt="Vaden Logo"
                style={{ width: '300px', height: '100px' }}
                className="!w-8 !h-8 xs:!w-10 xs:!h-10 sm:!w-12 sm:!h-12"
                onError={(e) => {
                  e.target.src = logo; // Fallback to default logo
                }}
              />
              <h2 className="text-[42px] font-semibold text-gray-900">
                Görev Takip Sistemi
              </h2>
              <div className="flex items-center">

                {/* Görev Ekleme Butonu */}
                {user?.role !== 'observer' && (
                  <button
                    onClick={() => {
                      resetNewTask();
                      setShowAddForm(!showAddForm);
                    }}
                    className="add-task-button rounded-lg transition-all duration-200 shadow-md"
                    style={{
                      marginRight: '5px',
                      backgroundColor: currentTheme.accent,
                      color: '#ffffff',
                      border: `1px solid ${currentTheme.border}`,
                      cursor: 'pointer'
                    }}
                  >
                    <span className="add-icon" style={{ color: '#ffffff' }}>➕</span>
                  </button>
                )}

                {/* Kullanıcı Butonu */}
                <div className="relative profile-menu">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="profile-icon text-xs sm:text-sm font-medium rounded-lg flex items-center space-x-2 shadow-md"
                    title={user?.email || ''}
                    style={{
                      marginRight: '5px',
                      backgroundColor: currentTheme.accent,
                      color: '#ffffff',
                      border: `1px solid ${currentTheme.border}`,
                      cursor: 'pointer'
                    }}
                  >
                    <span className="user-icon" style={{ color: '#ffffff' }}>👤</span>
                    <span className="hidden xs:inline text-xs xs:text-sm" style={{ color: '#ffffff' }}>{user?.name || 'Kullanıcı'}</span>
                    <span className="text-xs hidden sm:inline" style={{ color: '#ffffff' }}>▼</span>
                  </button>

                  {showProfileMenu && (
                    <ProfileMenuDropdown
                      user={user}
                      onClose={() => setShowProfileMenu(false)}
                      onOpenProfile={() => setShowUserProfile(true)}
                      onOpenTheme={() => setShowThemePanel(true)}
                      onOpenTaskSettings={() => setShowTaskSettings(true)}
                      onOpenTeam={async () => {
                        await loadTeamMembers(user?.id);
                        setShowTeamModal(true);
                      }}
                      onOpenUserPanel={() => setShowUserPanel(true)}
                      onOpenLeaveRequest={() => setShowLeaveRequestModal(true)}
                      onLogout={handleLogout}
                    />
                  )}
                </div>

                {/* Bildirimler Butonu */}
                <button
                  ref={bellRef}
                  onClick={async () => {
                    const next = !showNotifications;
                    if (next) await loadNotifications();
                    setShowNotifications(next);
                  }}
                  className="notification-bell relative rounded-lg overflow-visible"
                  aria-label="Bildirimler"
                  style={{
                    marginRight: '5px',
                    backgroundColor: currentTheme.accent,
                    color: '#ffffff',
                    border: `1px solid ${currentTheme.border}`,
                    cursor: 'pointer'
                  }}
                >
                  {badgeCount > 0 && (
                    <span className="notification-badge">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}

                  <span style={{ color: '#ffffff' }}>🔔</span>
                </button>

                {/* Güncelleme Notları Butonu */}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      if (!updatesContent) {
                        try {
                          const response = await fetch('/UPDATES.md');
                          const text = await response.text();
                          setUpdatesContent(text);
                        } catch (err) {
                          console.error('Failed to load updates:', err);
                          setUpdatesContent('# Güncelleme Notları\n\nGüncelleme notları yüklenemedi.');
                        }
                      }
                      setShowUpdatesModal(true);
                    } catch (err) {
                      console.error('Error opening updates modal:', err);
                    }
                  }}
                  className="add-task-button rounded-lg overflow-visible"
                  aria-label="Güncelleme Notları"
                  title="Güncelleme Notları"
                  style={{
                    marginRight: '5px',
                    backgroundColor: currentTheme.accent || '#3b82f6',
                    color: '#ffffff',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    border: `1px solid ${currentTheme.border}`
                  }}
                >
                  <span style={{ color: '#ffffff' }}>📋</span>
                </button>
                <NotificationsPanel
                  open={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  notifications={notifications}
                  markAllNotificationsAsRead={markAllNotificationsAsRead}
                  markingAllNotifications={markingAllNotifications}
                  onNotificationClick={handleNotificationClick}
                  notifPanelRef={notifPanelRef}
                  notifPos={notifPos}
                />
                <UpdatesModal
                  open={showUpdatesModal}
                  onClose={() => setShowUpdatesModal(false)}
                  updatesContent={updatesContent}
                />

                {/* Tema Ayarları Modal */}
                {showThemePanel && <ThemePanel />}
                {showLeaveRequestModal && (
                  <LeaveRequestModal
                    open={showLeaveRequestModal}
                    onClose={() => setShowLeaveRequestModal(false)}
                    onLeaveSaved={() => loadWeeklyGoals(weeklyWeekStart, weeklyUserId)}
                  />
                )}
              </div>
            </div>
          </div>

          {showAddForm && (
            <AddTaskForm
              open={showAddForm}
              onClose={() => { setShowAddForm(false); resetNewTask(); }}
              currentTheme={currentTheme}
              error={error}
              newTask={newTask}
              setNewTask={setNewTask}
              getAllTaskTypes={getAllTaskTypes}
              getEligibleResponsibleUsers={getEligibleResponsibleUsers}
              getEligibleAssignedUsers={getEligibleAssignedUsers}
              users={users}
              handleAddTask={handleAddTask}
              manuallyRemovedUsersRef={manuallyRemovedUsersRef}
              addingTask={addingTask}
              uploadProgress={uploadProgress}
              assigneeSearch={assigneeSearch}
              setAssigneeSearch={setAssigneeSearch}
              showAssigneeDropdown={showAssigneeDropdown}
              setShowAssigneeDropdown={setShowAssigneeDropdown}
              loadUsers={loadUsers}
              user={user}
            />
          )}

          <WeeklyGoalsModal
            open={showWeeklyGoals}
            onClose={() => setShowWeeklyGoals(false)}
            currentTheme={currentTheme}
            weeklyUserId={weeklyUserId}
            users={users}
            user={user}
            combinedLocks={combinedLocks}
            weeklyWeekStart={weeklyWeekStart}
            loadWeeklyGoals={loadWeeklyGoals}
            weeklyLeaveMinutesInput={weeklyLeaveMinutesInput}
            handleWeeklyLeaveMinutesChange={handleWeeklyLeaveMinutesChange}
            handleWeeklyLeaveMinutesBlur={handleWeeklyLeaveMinutesBlur}
            weeklyOvertimeMinutesInput={weeklyOvertimeMinutesInput}
            handleWeeklyOvertimeMinutesChange={handleWeeklyOvertimeMinutesChange}
            handleWeeklyOvertimeMinutesBlur={handleWeeklyOvertimeMinutesBlur}
            weeklyGoals={weeklyGoals}
            weeklyLive={weeklyLive}
            weeklyValidationErrors={weeklyValidationErrors}
            saveWeeklyGoals={saveWeeklyGoals}
            approveWeeklyGoals={approveWeeklyGoals}
            weeklySaveState={weeklySaveState}
            transferButtonText={transferButtonText}
            transferIncompleteTasksFromPreviousWeek={transferIncompleteTasksFromPreviousWeek}
            setShowGoalDescription={setShowGoalDescription}
            setSelectedGoalIndex={setSelectedGoalIndex}
            goalDescriptionRef={goalDescriptionRef}
            textInputRefs={textInputRefs}
            setWeeklyGoals={setWeeklyGoals}
            updateNumberInput={updateNumberInput}
            saveTextInputToState={saveTextInputToState}
            getTextInputKey={getTextInputKey}
            addNotification={addNotification}
          />

          <GoalDescriptionModal
            open={showGoalDescription}
            onClose={() => { setShowGoalDescription(false); setSelectedGoalIndex(null); }}
            selectedGoalIndex={selectedGoalIndex}
            weeklyGoals={weeklyGoals}
            setWeeklyGoals={setWeeklyGoals}
            goalDescriptionRef={goalDescriptionRef}
            saveWeeklyGoals={saveWeeklyGoals}
            user={user}
          />
          <div style={{ backgroundColor: currentTheme.background }}>
            {showWeeklyOverview ? (
              <WeeklyOverviewView
                user={user}
                weeklyOverview={weeklyOverview}
                weeklyOverviewLoading={weeklyOverviewLoading}
                weeklyOverviewError={weeklyOverviewError}
                effectiveWeeklyOverviewWeekStart={effectiveWeeklyOverviewWeekStart}
                onClose={() => {
                  setShowWeeklyOverview(false);
                  setWeeklyOverviewError(null);
                }}
                onLoadOverview={loadWeeklyOverview}
                onOpenWeeklyGoals={(targetWeek, userId) => {
                  setShowWeeklyGoals(true);
                  loadWeeklyGoals(targetWeek, userId);
                }}
              />
            ) : (
              <TaskListView
                tasks={tasks}
                user={user}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedTaskType={selectedTaskType}
                setSelectedTaskType={setSelectedTaskType}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                taskCounts={taskCounts}
                onOpenWeeklyOverview={() => {
                  setShowProfileMenu(false);
                  setShowWeeklyOverview(true);
                  loadWeeklyOverview(null);
                }}
                onTaskClick={handleTaskClick}
                onPermanentDelete={handlePermanentDelete}
                getAllTaskTypes={getAllTaskTypes}
                taskHistories={taskHistories}
                loadTaskHistoryForTooltip={loadTaskHistoryForTooltip}
                getLastAddedDescription={getLastAddedDescription}
              />
            )}
          </div>

          {showDetailModal && selectedTask && (
  <TaskDetailModal
    open={showDetailModal}
    task={selectedTask}
    onClose={handleCloseModal}
    currentTheme={currentTheme}
    user={user}
    detailDraft={detailDraft}
    setDetailDraft={setDetailDraft}
    descDraft={descDraft}
    setDescDraft={setDescDraft}
    editingDates={editingDates}
    setEditingDates={setEditingDates}
    handleDateChange={handleDateChange}
    handleUpdateTask={handleUpdateTask}
    newComment={newComment}
    setNewComment={setNewComment}
    handleAddComment={handleAddComment}
    taskHistory={taskHistory}
    setTaskHistory={setTaskHistory}
    taskHistories={taskHistories}
    setTaskHistories={setTaskHistories}
    getEligibleAssignedUsers={getEligibleAssignedUsers}
    getEligibleResponsibleUsers={getEligibleResponsibleUsers}
    users={users}
    addNotification={addNotification}
    getStatusColor={getStatusColor}
    getStatusText={getStatusText}
    formatDateOnly={formatDateOnly}
    getTaskTypeText={getTaskTypeText}
    getPriorityText={getPriorityText}
    getAllTaskTypes={getAllTaskTypes}
    getAllTaskStatuses={getAllTaskStatuses}
    getSystemTaskStatuses={getSystemTaskStatuses}
    renderHistoryValue={renderHistoryValue}
    renderFieldLabel={renderFieldLabel}
    historyDeleteMode={historyDeleteMode}
    setHistoryDeleteMode={setHistoryDeleteMode}
    error={error}
    attachmentsExpanded={attachmentsExpanded}
    setAttachmentsExpanded={setAttachmentsExpanded}
    taskLastViews={taskLastViews}
    formatDate={formatDate}
    showAssigneeDropdownDetail={showAssigneeDropdownDetail}
    setShowAssigneeDropdownDetail={setShowAssigneeDropdownDetail}
    assigneeSearchDetail={assigneeSearchDetail}
    setAssigneeSearchDetail={setAssigneeSearchDetail}
    assigneeDetailInputRef={assigneeDetailInputRef}
    previousResponsibleIdDetailRef={previousResponsibleIdDetailRef}
    resolveUserName={resolveUserName}
    uploadProgress={uploadProgress}
    setUploadProgress={setUploadProgress}
    setSelectedTask={setSelectedTask}
    comments={comments}
    apiOrigin={apiOrigin}
  />
)}
          <UserProfileModal
            open={showUserProfile}
            onClose={() => setShowUserProfile(false)}
            user={user}
            setWeeklyUserId={setWeeklyUserId}
            setShowWeeklyGoals={setShowWeeklyGoals}
            loadWeeklyGoals={loadWeeklyGoals}
            onSubmitPasswordChange={async ({ current, next }) => {
              try {
                await changePassword(current, next);
                setShowUserProfile(false);
                addNotification('Şifre başarıyla güncellendi', 'success');
                return true;
              } catch (err) {
                addNotification(err.response?.data?.message || 'Şifre güncellenemedi', 'error');
                return false;
              }
            }}
          />

          <TeamModal
            open={showTeamModal}
            onClose={() => setShowTeamModal(false)}
            teamMembers={teamMembers}
            setWeeklyUserId={setWeeklyUserId}
            setShowWeeklyGoals={setShowWeeklyGoals}
            loadWeeklyGoals={loadWeeklyGoals}
            bulkLeaderId={bulkLeaderId}
          />

          <UserPanel
            open={showUserPanel}
            onClose={() => setShowUserPanel(false)}
            currentTheme={currentTheme}
            user={user}
            AdminCreateUser={() => <AdminCreateUser currentTheme={currentTheme} onCreateUser={async (payload) => { await registerUser(payload); await loadUsers(); }} onBulkImport={handleBulkUserImport} pushToast={addNotification} users={users} />}
            userSearchTerm={userSearchTerm}
            setUserSearchTerm={setUserSearchTerm}
            users={users}
            selectedUsers={selectedUsers}
            setSelectedUsers={setSelectedUsers}
            bulkLeaderId={bulkLeaderId}
            setBulkLeaderId={setBulkLeaderId}
            getRoleText={getRoleText}
            updateUserAdmin={updateUserAdmin}
            addNotification={addNotification}
            loadUsers={loadUsers}
            setLoading={setLoading}
            loadPasswordResetRequests={loadPasswordResetRequests}
            deleteUserAdmin={deleteUserAdmin}
            passwordResetRequests={passwordResetRequests}
          />

          <TaskSettingsModal
            open={showTaskSettings}
            onClose={() => setShowTaskSettings(false)}
            currentTheme={currentTheme}
            newTaskTypeName={newTaskTypeName}
            setNewTaskTypeName={setNewTaskTypeName}
            newTaskTypeColor={newTaskTypeColor}
            setNewTaskTypeColor={setNewTaskTypeColor}
            customTaskTypes={customTaskTypes}
            customTaskStatuses={customTaskStatuses}
            allTaskTypesFromAPI={allTaskTypesFromAPI}
            selectedTaskTypeForStatuses={selectedTaskTypeForStatuses}
            setSelectedTaskTypeForStatuses={setSelectedTaskTypeForStatuses}
            newStatusName={newStatusName}
            setNewStatusName={setNewStatusName}
            newStatusColor={newStatusColor}
            setNewStatusColor={setNewStatusColor}
            editingTaskTypeId={editingTaskTypeId}
            editingTaskTypeName={editingTaskTypeName}
            setEditingTaskTypeName={setEditingTaskTypeName}
            editingTaskTypeColor={editingTaskTypeColor}
            setEditingTaskTypeColor={setEditingTaskTypeColor}
            editingTaskStatusId={editingTaskStatusId}
            editingTaskStatusName={editingTaskStatusName}
            setEditingTaskStatusName={setEditingTaskStatusName}
            editingTaskStatusColor={editingTaskStatusColor}
            setEditingTaskStatusColor={setEditingTaskStatusColor}
            getAllTaskTypes={getAllTaskTypes}
            getSystemTaskStatuses={getSystemTaskStatuses}
            handleAddTaskType={handleAddTaskType}
            handleAddTaskStatus={handleAddTaskStatus}
            handleDeleteTaskType={handleDeleteTaskType}
            handleDeleteTaskStatus={handleDeleteTaskStatus}
            handleEditTaskType={handleEditTaskType}
            handleEditTaskStatus={handleEditTaskStatus}
            handleSaveTaskType={handleSaveTaskType}
            handleSaveTaskStatus={handleSaveTaskStatus}
            handleCancelEditTaskType={handleCancelEditTaskType}
            handleCancelEditTaskStatus={handleCancelEditTaskStatus}
          />

          {
            error && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50" style={{ width: '1440px', maxWidth: 'calc(100vw - 32px)' }}>
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
                </div>
              </div>
            )
          }

        </div>
      </main>

      <AppFooter />
    </div>
  );
}
export default App;