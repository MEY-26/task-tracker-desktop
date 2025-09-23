import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { login, restore, getUser, getUsers, Tasks, Notifications, registerUser, updateUserAdmin, deleteUserAdmin, changePassword, apiOrigin, PasswordReset, TaskViews, WeeklyGoals, Team } from './api';
import { api } from './api';
import './App.css'
import { createPortal } from 'react-dom';
import * as ExcelJS from 'exceljs';
import logo from './assets/logo.svg';


function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskLastViews, setTaskLastViews] = useState([]);
  const [taskHistories, setTaskHistories] = useState({});
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showWeeklyGoals, setShowWeeklyGoals] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState({ goal: null, items: [], locks: { targets_locked: false, actuals_locked: false }, summary: null });
  const [weeklyWeekStart, setWeeklyWeekStart] = useState('');
  const [weeklyUserId, setWeeklyUserId] = useState(null); // null = current user
  const [showWeeklyOverview, setShowWeeklyOverview] = useState(false);
  const [weeklyOverview, setWeeklyOverview] = useState({ week_start: '', items: [] });
  const [weeklyOverviewLoading, setWeeklyOverviewLoading] = useState(false);
  const [weeklyOverviewError, setWeeklyOverviewError] = useState(null);
  const [weeklyOverviewWeekStart, setWeeklyOverviewWeekStart] = useState('');
  const [showGoalDescription, setShowGoalDescription] = useState(false);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(null);
  const [goalDescription, setGoalDescription] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
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
  const [activeTab, setActiveTab] = useState('active');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('all');
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // { percent: number|null, label: string }
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [detailDraft, setDetailDraft] = useState(null);
  const assigneeDetailInputRef = useRef(null);

  function getMonday(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday as 1
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function fmtYMD(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  }

  function at10AM(d) {
    const x = new Date(d);
    x.setHours(10, 0, 0, 0);
    return x;
  }

  // Compute UI locks for targets and actuals based on business rules
  const uiLocks = useMemo(() => {
    try {
      // Selected week start (Monday 00:00)
      const selStart = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday();
      selStart.setHours(0, 0, 0, 0);

      // Current week start (Monday 00:00)
      const now = new Date();
      const curStart = getMonday(now);
      curStart.setHours(0, 0, 0, 0);

      const curStart10 = at10AM(curStart);
      const isSelectedCurrent = selStart.getTime() === curStart.getTime();
      const isSelectedFuture = selStart.getTime() > curStart.getTime();

      let targetsUnlocked = false;
      let actualsUnlocked = false;

      if (isSelectedFuture) {
        // Future weeks: no locks at all
        targetsUnlocked = true;
        actualsUnlocked = true;
      } else if (isSelectedCurrent) {
        // Current week: targets closed after Mon 10:00; actuals open after Mon 10:00
        targetsUnlocked = now < curStart10;
        actualsUnlocked = now >= curStart10;
      } else {
        // Past weeks: fully locked
        targetsUnlocked = false;
        actualsUnlocked = false;
      }

      return {
        targets_locked: !targetsUnlocked,
        actuals_locked: !actualsUnlocked,
      };
    } catch (e) {
      console.warn('UI locks compute failed:', e);
      return { targets_locked: false, actuals_locked: false };
    }
  }, [weeklyWeekStart]);
  const combinedLocks = useMemo(() => {
    const backendTargetsLocked = !!(weeklyGoals?.locks?.targets_locked);
    const backendActualsLocked = !!(weeklyGoals?.locks?.actuals_locked);
    return {
      targets_locked: backendTargetsLocked || uiLocks.targets_locked,
      actuals_locked: backendActualsLocked || uiLocks.actuals_locked,
    };
  }, [weeklyGoals?.locks, uiLocks]);

  // Performans harfi ve rengi hesaplama
  function getPerformanceGrade(score) {
    if (score >= 111) return { grade: 'A', color: '#00c800', description: 'Olağan Üstü Performans' };
    if (score >= 101) return { grade: 'B', color: '#329600', description: 'Beklentilerin Üzerinde' };
    if (score >= 80) return { grade: 'C', color: '#649600', description: 'Beklenilen Performans' };
    if (score >= 55) return { grade: 'D', color: '#fa6400', description: 'Beklentileri Karşılamayan' };
    return { grade: 'E', color: '#fa3200', description: 'Düşük Performans' };
  }

  // Live summary for UI (updates immediately on input changes)
  const weeklyLive = useMemo(() => {
    const items = Array.isArray(weeklyGoals.items) ? weeklyGoals.items : [];
    const planned = items.filter(x => !x.is_unplanned);
    const unplanned = items.filter(x => x.is_unplanned);

    const totalTarget = planned.reduce((acc, x) => acc + Math.max(0, Number(x?.target_minutes || 0)), 0);
    const totalWeightRaw = (totalTarget / 2700) * 100;
    const totalWeight = Math.min(100, Number(totalWeightRaw.toFixed(1)));
    const unplannedMinutes = unplanned.reduce((acc, x) => acc + Math.max(0, Number(x?.actual_minutes || 0)), 0);

    // Planlı skor: sum(weight% * (t/a))
    let plannedScore = 0;
    for (const it of planned) {
      const t = Math.max(0, Number(it?.target_minutes || 0));
      const a = Math.max(0, Number(it?.actual_minutes || 0));
      if (t > 0 && a > 0) {
        const w = (t / 2700) * 100;
        const eff = t / a; // sınır yok, finale clamp var
        plannedScore += w * eff;
      }
    }
    const unplannedBonus = (unplannedMinutes / 2700) * 100;
    const finalScore = Math.min(120, plannedScore + unplannedBonus);

    return {
      totalTarget,
      totalWeight,
      unplannedMinutes,
      plannedScore: Number(plannedScore.toFixed(2)),
      unplannedBonus: Number(unplannedBonus.toFixed(2)),
      finalScore: Number(finalScore.toFixed(2)),
    };
  }, [weeklyGoals.items]);

  // Warn if total planned time exceeds 2700 minutes
  const overTargetWarnedRef = useRef(false);
  useEffect(() => {
    const tt = Number(weeklyLive?.totalTarget || 0);
    if (tt > 2700) {
      if (!overTargetWarnedRef.current) {
        addNotification('Planlı hedef toplamı 2700 dakikayı aşıyor', 'warning');
        overTargetWarnedRef.current = true;
      }
    } else {
      overTargetWarnedRef.current = false;
    }
  }, [weeklyLive.totalTarget]);

  async function loadWeeklyGoals(weekStart = null, userId = null) {
    try {
      const ws = weekStart || weeklyWeekStart || fmtYMD(getMonday());
      setWeeklyWeekStart(ws);

      // userId parametresi açıkça geçilmişse onu kullan, yoksa mevcut weeklyUserId'yi kullan
      let uid;
      if (userId !== null) {
        uid = userId;
      } else if (userId === null && arguments.length > 1) {
        // userId açıkça null olarak geçilmişse
        uid = null;
      } else {
        // userId parametresi geçilmemişse mevcut state'i kullan
        uid = weeklyUserId;
      }

      setWeeklyUserId(uid);
      const params = { week_start: ws };
      if (uid) params.user_id = uid;
      const res = await WeeklyGoals.get(params);
      setWeeklyGoals({ goal: res.goal, items: Array.isArray(res.items) ? res.items : [], locks: res.locks || {}, summary: res.summary || null });
    } catch (err) {
      console.error('Weekly goals load error:', err);
      setWeeklyGoals({ goal: null, items: [], locks: { targets_locked: false, actuals_locked: false }, summary: null });
    }
  }

  async function loadWeeklyOverview(weekStart = null) {
    const ws = weekStart || weeklyOverviewWeekStart || fmtYMD(getMonday());
    setWeeklyOverviewWeekStart(ws);

    try {
      setWeeklyOverviewLoading(true);
      setWeeklyOverviewError(null);

      const res = await WeeklyGoals.leaderboard({ week_start: ws });
      const items = Array.isArray(res?.items) ? res.items.filter(item => item?.role !== 'observer') : [];
      setWeeklyOverview({ week_start: res?.week_start || ws, items });
    } catch (err) {
      console.error('Weekly overview load error:', err);
      setWeeklyOverviewError(err.response?.data?.message || 'Haftalık hedef listesi yüklenemedi');
      setWeeklyOverview({ week_start: ws, items: [] });
    } finally {
      setWeeklyOverviewLoading(false);
    }
  }

  async function saveWeeklyGoals() {
    try {
      if (combinedLocks.targets_locked && user?.role !== 'observer' && user?.role !== 'admin') {
        addNotification('Hedefler şu an kilitli. Bu zaman aralığında hedefler değiştirilemez.', 'error');
        return;
      }
      if ((weeklyLive?.totalTarget || 0) > 2700) {
        addNotification('Haftalık hedef toplamı 2700 dakikayı aşamaz.', 'error');
        return;
      }
      // Auto compute weights from target minutes (planned only)
      const planned = (weeklyGoals.items || []).filter(x => !x.is_unplanned);
      const totalTarget = planned.reduce((acc, x) => acc + Math.max(0, Number(x.target_minutes || 0)), 0);
      const items = (weeklyGoals.items || []).map((x) => {
        const isUnplanned = !!x.is_unplanned;
        let weight = Number(x.weight_percent || 0);
        if (!isUnplanned) {
          const minutes = Math.max(0, Number(x.target_minutes || 0));
          weight = totalTarget > 0 ? (minutes / totalTarget) * 100 : 0;
        }
        return {
          id: x.id,
          title: x.title || '',
          action_plan: x.action_plan || '',
          description: x.description || '',
          target_minutes: Number(x.target_minutes || 0),
          weight_percent: Number(weight.toFixed(2)),
          actual_minutes: Number(x.actual_minutes || 0),
          is_unplanned: isUnplanned,
        };
      });

      const payload = {
        week_start: weeklyWeekStart || fmtYMD(getMonday()),
        items,
        ...(weeklyUserId ? { user_id: weeklyUserId } : {}),
      };
      const res = await WeeklyGoals.save(payload);
      setWeeklyGoals({ goal: res.goal, items: res.items || [], locks: res.locks || {}, summary: res.summary || null });
      addNotification('Haftalık hedefler kaydedildi', 'success');
    } catch (err) {
      console.error('Weekly goals save error:', err);
      addNotification(err.response?.data?.message || 'Kaydedilemedi', 'error');
    }
  }

  async function loadTeamMembers(leaderId = null) {
    try {
      const list = await Team.members(leaderId);
      setTeamMembers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Team members load error:', e);
      setTeamMembers([]);
    }
  }



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

  useEffect(() => { showDetailModalRef.current = showDetailModal; }, [showDetailModal]);
  useEffect(() => { selectedTaskRef.current = selectedTask; }, [selectedTask]);
  useEffect(() => {
    setDescDraft(selectedTask?.description ?? '');
  }, [selectedTask, showDetailModal]);
  useEffect(() => { lastSelectedSigRef.current = buildTaskSignatureOne(selectedTask); }, [selectedTask]);

  useEffect(() => {
    if (!showNotifications) return;

    const place = () => {
      if (!bellRef.current) return;
      const r = bellRef.current.getBoundingClientRect();
      const panelWidth = 360;
      const maxPanelHeight = 500;

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

  // Modal açıkken body scroll'unu engelle
  useEffect(() => {
    const isModalOpen = showAddForm || showDetailModal || showWeeklyGoals ||
      showGoalDescription || showUserProfile || showTeamModal ||
      showUserPanel || showNotifications;

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddForm, showDetailModal, showWeeklyGoals, showGoalDescription,
    showUserProfile, showTeamModal, showUserPanel, showNotifications]);

  useEffect(() => {
    if (user?.role !== 'admin' && showWeeklyOverview) {
      setShowWeeklyOverview(false);
    }
  }, [user?.role, showWeeklyOverview]);

  useEffect(() => {
    const preventAutofill = () => {
      const inputs = document.querySelectorAll('input');

      inputs.forEach(input => {
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-form-type', 'other');

        if (input.type === 'password') {
          input.setAttribute('autocomplete', 'new-password');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        if (input.placeholder && (input.placeholder.includes('ara') || input.placeholder.includes('search'))) {
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        input.addEventListener('focus', (e) => {
          e.target.setAttribute('autocomplete', 'off');
          e.target.setAttribute('data-lpignore', 'true');
        });

        input.addEventListener('input', (e) => {
          if (e.target.value && !e.isTrusted) {
            e.target.value = '';
          }
        });
        input.addEventListener('animationstart', (e) => {
          if (e.animationName === 'onAutoFillStart') {
            e.target.value = '';
          }
        });
      });
    };

    preventAutofill();

    const interval = setInterval(preventAutofill, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showDetailModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDetailModal, selectedTask, descDraft, user?.role, handleCloseModal]);

  useEffect(() => {
    if (showDetailModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showDetailModal]);

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

  function buildTasksSignature(arr) {
    try {
      return JSON.stringify((Array.isArray(arr) ? arr : []).map(t => [
        t?.id,
        t?.updated_at ?? null,
        t?.status ?? null,
        t?.priority ?? null,
        t?.title ?? null,
        t?.responsible?.id ?? null,
        Array.isArray(t?.assigned_users) ? t.assigned_users.length : 0,
        Array.isArray(t?.attachments) ? t.attachments.length : 0,
        t?.start_date ?? null,
        t?.due_date ?? null,
      ]));
    } catch {
      return '';
    }
  }

  function buildTaskSignatureOne(t) {
    if (!t) return '';
    try {
      return JSON.stringify([
        t.id,
        t.updated_at ?? null,
        t.status ?? null,
        t.priority ?? null,
        t.title ?? null,
        t.responsible?.id ?? null,
        Array.isArray(t.assigned_users) ? t.assigned_users.map(u => u.id).join(',') : '',
        Array.isArray(t.attachments) ? t.attachments.length : 0,
        t.start_date ?? null,
        t.due_date ?? null,
      ]);
    } catch {
      return '';
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

  async function loadUsers() {
    try {
      const usersList = await getUsers();
      setUsers(usersList);
    } catch (err) {
      console.error('Users load error:', err);
      setUsers([]);
    }
  }

  // Ensure users refresh when the panel is opened (avoids stale state race)
  useEffect(() => {
    if (showUserPanel && ['admin', 'team_leader', 'observer'].includes(user?.role)) {
      loadUsers();
    }
  }, [showUserPanel, user?.role]);

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

  function addNotification(message, type = 'info') {
    const id = `frontend_${Date.now()}`;
    const notification = {
      id,
      message,
      type,
      created_at: new Date().toISOString(),
      timestamp: new Date(),
      read_at: null,
      isFrontendNotification: true
    };
    setNotifications(prev => {
      const currentNotifications = Array.isArray(prev) ? prev : [];
      return [notification, ...currentNotifications.slice(0, 4)];
    });

    setTimeout(() => {
      setNotifications(prev => {
        const currentNotifications = Array.isArray(prev) ? prev : [];
        return currentNotifications.filter(n => n.id !== id);
      });
    }, 5000);
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

  async function handleAddTask() {
    try {
      setAddingTask(true);
      setError(null);

      // Tarih validasyonu kaldırıldı - kullanıcı istediği tarihi girebilir

      const responsibleId = newTask.responsible_id ? parseInt(newTask.responsible_id) : user.id;

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        task_type: newTask.task_type,
        responsible_id: responsibleId,
        assigned_users: newTask.assigned_users,
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
          headers: { 'Content-Type': 'multipart/form-data' },
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

        // Description (admin only in UI, but backend will validate anyway)
        if ((descDraft ?? '') !== (selectedTask.description ?? '')) {
          updates.description = descDraft ?? '';
        }

        // Drafted selectable fields
        if (detailDraft) {
          if ((detailDraft.status || 'waiting') !== (selectedTask.status || 'waiting')) {
            updates.status = detailDraft.status || 'waiting';
          }
          if ((detailDraft.priority || 'medium') !== (selectedTask.priority || 'medium')) {
            updates.priority = detailDraft.priority || 'medium';
          }
          if ((detailDraft.task_type || 'development') !== (selectedTask.task_type || 'development')) {
            updates.task_type = detailDraft.task_type || 'development';
          }
          const currentResponsibleId = selectedTask.responsible?.id || '';
          if ((detailDraft.responsible_id || '') !== currentResponsibleId) {
            updates.responsible_id = detailDraft.responsible_id || null;
          }
          const beforeIds = (selectedTask.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x));
          const afterIds = Array.isArray(detailDraft.assigned_user_ids) ? detailDraft.assigned_user_ids : beforeIds;
          const sameLength = beforeIds.length === afterIds.length;
          const sameSet = sameLength && beforeIds.every(id => afterIds.includes(id));
          if (!sameSet) {
            updates.assigned_users = afterIds;
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


  function getStatusColor(status) {
    switch (status) {
      case 'waiting': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'investigating': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  }

  function getStatusText(status) {
    switch (status) {
      case 'waiting': return 'Bekliyor';
      case 'in_progress': return 'Devam Ediyor';
      case 'investigating': return 'Araştırılıyor';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal';
      default: return 'Bekliyor';
    }
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#dc2626';
      default: return '#6b7280';
    }
  }

  function getPriorityText(priority) {
    switch (priority) {
      case 'low': return 'Düşük';
      case 'medium': return 'Orta';
      case 'high': return 'Yüksek';
      case 'critical': return 'Kritik';
      default: return 'Orta';
    }
  }

  function getTaskTypeText(taskType) {
    switch (taskType) {
      case 'new_product': return 'Yeni Ürün';
      case 'fixture': return 'Fikstür';
      case 'apparatus': return 'Aparat';
      case 'development': return 'Geliştirme';
      case 'revision': return 'Revizyon';
      case 'mold': return 'Kalıp';
      case 'test_device': return 'Test Cihazı';
      default: return 'Geliştirme';
    }
  }

  function getTaskTypeColor(taskType) {
    switch (taskType) {
      case 'new_product': return '#10b981';
      case 'fixture': return '#3b82f6';
      case 'apparatus': return '#8b5cf6';
      case 'development': return '#f59e0b';
      case 'revision': return '#ef4444';
      case 'mold': return '#06b6d4';
      case 'test_device': return '#84cc16';
      default: return '#6b7280';
    }
  }

  function formatDate(dateLike) {
    if (!dateLike) return '-';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    try {
      const opts = { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
      return new Intl.DateTimeFormat('tr-TR', opts).format(d);
    } catch {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }

  function formatDateOnly(dateLike) {
    if (!dateLike) return '-';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    try {
      const opts = { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Intl.DateTimeFormat('tr-TR', opts).format(d);
    } catch {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
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


  function lowerSafe(v) {
    return (v ?? '').toString().toLowerCase();
  }

  function resolveUserName(userId) {
    if (userId === null || userId === undefined || userId === '') return '-';
    const idNum = typeof userId === 'string' ? parseInt(userId) : userId;
    const u = Array.isArray(users) ? users.find(x => x.id === idNum) : null;
    return u?.name ?? String(userId);
  }

  function renderHistoryValue(field, value) {
    if (field === 'status') return getStatusText(value);
    if (field === 'priority') return getPriorityText(value);
    if (field === 'task_type') return getTaskTypeText(value);
    if (field === 'comment') return value ?? '';
    if (field === 'responsible_id' || field === 'created_by') return resolveUserName(value);
    if (field === 'start_date' || field === 'due_date' || field === 'end_date') return formatDateOnly(value);
    if (field === 'assigned_users') {
      try {
        const userIds = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(userIds)) {
          return userIds.map(id => resolveUserName(id)).join(', ');
        }
      } catch (e) {
        console.error('Error parsing assigned_users:', e);
      }
      return value ?? 'boş';
    }
    return value ?? 'boş';
  }

  function renderFieldLabel(field) {
    switch (field) {
      case 'title':
        return 'başlığı';
      case 'description':
        return 'açıklamayı';
      case 'status':
        return 'durumu';
      case 'priority':
        return 'önceliği';
      case 'task_type':
        return 'görev türünü';
      case 'responsible_id':
        return 'sorumluyu';
      case 'created_by':
        return 'oluşturanı';
      case 'start_date':
        return 'başlangıç tarihini';
      case 'due_date':
        return 'bitiş tarihini';
      case 'end_date':
        return 'bitiş tarihini';
      case 'assigned_users':
        return 'atanan kullanıcıları';
      case 'attachments':
        return 'dosyaları';
      case 'comment':
        return 'yorumu';
      case 'task_response':
        return 'görev yanıtını';
      default:
        return field;
    }
  }

  function getRoleText(role) {
    switch (role) {
      case 'admin':
        return 'Yönetici';
      case 'team_leader':
        return 'Takım Lideri';
      case 'team_member':
        return 'Takım Üyesi';
      case 'observer':
        return 'Gözlemci';
      default:
        return String(role || '-');
    }
  }

  function getEligibleResponsibleUsers() {
    if (!users || !user) return [];

    return users.filter(u => {
      if (u.role === 'observer') return false;

      if (user.role === 'team_leader' && u.role === 'admin') return false;

      return true;
    });
  }

  function getEligibleAssignedUsers(responsibleId = null) {
    if (!users || !user) return [];

    return users.filter(u => {
      if (u.role === 'observer') return false;
      if (user.role === 'team_leader' && u.role === 'admin') return false;
      if (responsibleId && u.id === parseInt(responsibleId)) return false;
      return true;
    });
  }

  function parseExcelUsers(file) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // Only .xlsx reliably supported by exceljs
          const ext = (file.name || '').split('.').pop()?.toLowerCase();
          if (ext === 'xls') {
            throw new Error('Eski .xls formatı desteklenmiyor. Lütfen .xlsx yükleyin.');
          }

          const buffer = await file.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            throw new Error('Excel dosyasında çalışma sayfası bulunamadı');
          }

          const jsonRows = [];
          worksheet.eachRow((row) => {
            const rowData = [];
            row.eachCell((cell, colNumber) => {
              let v = cell.value;
              if (v && typeof v === 'object' && 'text' in v) v = v.text; // handle rich text
              rowData[colNumber - 1] = v;
            });
            jsonRows.push(rowData);
          });

          // Accept at least Name + Email; Role and Password optional
          const userRows = jsonRows.slice(1).filter(row => (row?.[0] && row?.[1]));

          const validRoles = ['admin', 'team_leader', 'team_member', 'observer'];
          const users = userRows.map((row, index) => {
            const name = row[0];
            const email = row[1];
            const role = row[2];
            const password = row[3];
            const leaderEmail = row[4]; // E2: Takım Lideri E-posta

            const roleStr = (role ?? '').toString().trim().toLowerCase();
            const validatedRole = validRoles.includes(roleStr) ? roleStr : 'team_member';

            return {
              name: (name ?? '').toString().trim(),
              email: (email ?? '').toString().trim(),
              role: validatedRole,
              password: (password ?? '').toString().trim() || '123456',
              leaderEmail: (leaderEmail ?? '').toString().trim(),
              rowIndex: index + 2,
            };
          }).filter(u => u.name && u.email);

          resolve(users);
        } catch (err) {
          reject(new Error('Excel dosyası okunamadı: ' + (err?.message || String(err))));
        }
      })();
    });
  }

  async function handleBulkUserImport(file) {
    try {
      setLoading(true);
      const users = await parseExcelUsers(file);

      if (users.length === 0) {
        addNotification('Excel dosyasında geçerli kullanıcı verisi bulunamadı', 'error');
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const userData of users) {
        try {
          // Takım lideri email'i ile lider ID'sini bul
          let leaderId = null;
          if (userData.leaderEmail) {
            const leader = users.find(u => u.email.toLowerCase() === userData.leaderEmail.toLowerCase() && (u.role === 'team_leader' || u.role === 'admin'));
            if (leader) {
              leaderId = leader.id;
            } else {
              // Mevcut kullanıcılar listesinden de ara
              const existingLeader = Array.isArray(users) ? users.find(u => u.email.toLowerCase() === userData.leaderEmail.toLowerCase() && (u.role === 'team_leader' || u.role === 'admin')) : null;
              if (existingLeader) {
                leaderId = existingLeader.id;
              } else {
                errors.push(`Satır ${userData.rowIndex}: Takım lideri bulunamadı "${userData.leaderEmail}"`);
                errorCount++;
                continue;
              }
            }
          }

          await registerUser({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            password_confirmation: userData.password,
            role: userData.role,
            leader_id: leaderId
          });
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Satır ${userData.rowIndex}: ${userData.name} - ${error.response?.data?.message || 'Bilinmeyen hata'}`);
        }
      }

      if (successCount > 0) {
        addNotification(`${successCount} kullanıcı başarıyla eklendi`, 'success');
      }
      if (errorCount > 0) {
        addNotification(`${errorCount} kullanıcı eklenemedi. Detaylar konsola bakın.`, 'error');
        console.error('Toplu kullanıcı ekleme hataları:', errors);
      }

      await loadUsers();

    } catch (error) {
      console.error('Excel import error:', error);
      addNotification('Excel dosyası işlenemedi: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function PasswordChangeInline({ onDone }) {
    const [form, setForm] = useState({ current: '', next: '', again: '' });
    const can = form.current && form.next && form.again && form.next === form.again;
    return (
      <div className="space-y-3">
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" style={{ marginTop: '5px' }} placeholder="Mevcut şifre" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" style={{ marginTop: '5px' }} placeholder="Yeni şifre" value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" style={{ marginTop: '5px' }} placeholder="Yeni şifre (tekrar)" value={form.again} onChange={e => setForm({ ...form, again: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
        <button disabled={!can} className="w-full rounded px-4 py-3 bg-green-600 hover:bg-green-700 !text-[20px]" style={{ marginTop: '10px', marginLeft: '5px', marginBottom: '10px' }} onClick={async () => { try { await changePassword(form.current, form.next); onDone?.(); setForm({ current: '', next: '', again: '' }); } catch (err) { console.error('Password change error:', err); addNotification('Şifre güncellenemedi', 'error'); } }}>Güncelle</button>
      </div>
    );
  }

  function PasswordChangeForm({ onDone }) {
    const [form, setForm] = useState({ current: '', next: '', again: '' });
    const [loading, setLoading] = useState(false);
    const can = form.current && form.next && form.again && form.next === form.again;

    return (
      <div className="space-y-10" style={{ padding: '18px', paddingBottom: '32px' }}>
        <div className="space-y-6">
          {/* Gizli input alanları otomatik doldurmayı engellemek için */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" />
          <input type="password" style={{ display: 'none' }} autoComplete="current-password" />
          <input
            type="password"
            className="w-full border border-white/20 bg-white/10 text-white !text-[24px] sm:!text-[16px] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-6 py-4"
            placeholder="Mevcut şifrenizi girin"
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="other"
            name="current-password-hidden"
            id="current-password-hidden"
            style={{ height: '40px' }}
          />
        </div>

        <div className="space-y-6">
          {/* Gizli input alanları otomatik doldurmayı engellemek için */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" />
          <input type="password" style={{ display: 'none' }} autoComplete="new-password" />
          <input
            type="password"
            className="w-full border border-white/20 bg-white/10 text-white !text-[24px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-6 py-4"
            placeholder="Yeni şifrenizi girin"
            value={form.next}
            onChange={e => setForm({ ...form, next: e.target.value })}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="other"
            name="new-password-hidden"
            id="new-password-hidden"
            style={{ height: '40px' }}
          />
        </div>

        <div className="space-y-6">
          {/* Gizli input alanları otomatik doldurmayı engellemek için */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" />
          <input type="password" style={{ display: 'none' }} autoComplete="new-password" />
          <input
            type="password"
            className="w-full border border-white/20 bg-white/10 text-white !text-[24px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-6 py-4"
            placeholder="Yeni şifrenizi tekrar girin"
            value={form.again}
            onChange={e => setForm({ ...form, again: e.target.value })}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="other"
            name="confirm-password-hidden"
            id="confirm-password-hidden"
            style={{ height: '40px' }}
          />
        </div>

        <div className="pt-8" style={{ paddingTop: '10px' }}>
          <button
            disabled={!can || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl px-8 py-4"
            onClick={async () => {
              try {
                setLoading(true);
                await changePassword(form.current, form.next);
                onDone?.();
                setForm({ current: '', next: '', again: '' });
                addNotification('Şifre başarıyla güncellendi', 'success');
              } catch (err) {
                console.error('Password change error:', err);
                addNotification(err.response?.data?.message || 'Şifre güncellenemedi', 'error');
              } finally {
                setLoading(false);
              }
            }}
            style={{ height: '48px' }}
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </div>
      </div>
    );
  }

  function AdminCreateUser() {
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member' });

    return (
      <div className="space-y-6">
        <div className="border-b border-white/10 pb-4" style={{ paddingBottom: '30px' }}>
          <div className="space-y-4">

            <input className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
              placeholder="İsim"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ marginBottom: '10px' }} />

            <input type="email" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
              placeholder="E-posta"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ marginBottom: '10px' }} />

            <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
              placeholder="Şifre"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false"
              style={{ marginBottom: '10px' }} />

            <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
              placeholder="Şifre (tekrar)"
              value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
              autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false"
              style={{ marginBottom: '10px' }} />

            <select className="w-[101%] h-[35px] rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white "
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              style={{ marginBottom: '10px' }}>
              <option value="admin" className="bg-gray-800 text-white">Yönetici</option>
              <option value="team_leader" className="bg-gray-800 text-white">Takım Lideri</option>
              <option value="team_member" className="bg-gray-800 text-white">Takım Üyesi</option>
              <option value="observer" className="bg-gray-800 text-white">Gözlemci</option>
            </select>

            <button className="w-[101%] rounded px-4 py-3 bg-green-600 hover:bg-green-700 !text-[20px]" style={{ marginBottom: '10px' }} onClick={async () => {
              if (!form.name.trim() || !form.email.trim() || !form.password || !form.password_confirmation) {
                addNotification('Lütfen tüm alanları doldurun', 'error');
                return;
              }
              if (form.password !== form.password_confirmation) {
                addNotification('Şifreler eşleşmiyor', 'error');
                return;
              }
              try {
                await registerUser(form);
                addNotification('Kullanıcı eklendi', 'success');
                setForm({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member' });
                await loadUsers();
              } catch (err) {
                console.error('User registration error:', err);
                addNotification(err.response?.data?.message || 'Kullanıcı eklenemedi', 'error');
              }
            }}>Kullanıcı Ekle</button>

          </div>
        </div>

        <div className="border-white/10 pb-4">
          <h2 className="text-white mb-4">Excel'den Toplu Kullanıcı Ekle</h2>
          <div className="space-y-4 !text-[16px]">
            <div className="bg-blue-900/20 border-blue-500/30 rounded-lg p-4">
              <div className="text-blue-200 space-y-1">
                <div className="mt-3 text-blue-300">
                  İlk satır başlık olarak kabul edilir, veriler 2. satırdan başlar.
                </div>
                <div>• A2: Kullanıcı Adı Soyadı</div>
                <div>• B2: E-posta Adresi</div>
                <div>• C2: Rol (admin/team_leader/team_member/observer)</div>
                <div>• D2: Şifre (boşsa varsayılan: 123456)</div>
                <div>• E2: Takım Lideri E-posta (opsiyonel)</div>
              </div>
            </div>
            <div className="text-gray-400 !text-[24px]" style={{ marginTop: '10px' }}>
              Excel dosyası seçin (.xlsx önerilir)
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleBulkUserImport(file);
                  e.target.value = '';
                }
              }}
              className="text-gray-300 !text-[18px] file:w-[30%] file:h-[30px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-colors"
            />
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];

    const query = lowerSafe(searchTerm);
    const filtered = tasks.filter(task => {
      if (activeTab === 'active' && (task.status === 'completed' || task.status === 'cancelled')) {
        return false;
      }
      if (activeTab === 'completed' && task.status !== 'completed') {
        return false;
      }
      if (activeTab === 'deleted' && task.status !== 'cancelled') {
        return false;
      }
      if (selectedTaskType !== 'all' && task.task_type !== selectedTaskType) {
        return false;
      }
      if (!query) return true;
      const title = lowerSafe(task?.title);
      const desc = lowerSafe(task?.description);
      return title.includes(query) || desc.includes(query);
    });

    if (!sortConfig?.key) {
      return filtered;
    }

    const key = sortConfig.key;
    const dir = sortConfig.dir === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];
      if (key === 'id') {
        const at = Number(a?.id) || 0;
        const bt = Number(b?.id) || 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'start_date' || key === 'due_date' || key === 'end_date') {
        const at = av ? new Date(av).getTime() : 0;
        const bt = bv ? new Date(bv).getTime() : 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'priority') {
        const map = { low: 1, medium: 2, high: 3, critical: 4 };
        const at = map[a?.priority] ?? 0;
        const bt = map[b?.priority] ?? 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'status') {
        const order = { waiting: 1, in_progress: 2, investigating: 3, completed: 4, cancelled: 5 };
        const at = order[a?.status] ?? 0;
        const bt = order[b?.status] ?? 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'responsible_name') {
        av = a?.responsible?.name || '';
        bv = b?.responsible?.name || '';
      } else if (key === 'creator_name') {
        av = a?.creator?.name || '';
        bv = b?.creator?.name || '';
      } else if (key === 'assigned_count') {
        const at = Array.isArray(a?.assigned_users) ? a.assigned_users.length : 0;
        const bt = Array.isArray(b?.assigned_users) ? b.assigned_users.length : 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      } else if (key === 'attachments_count') {
        const at = Array.isArray(a?.attachments) ? a.attachments.length : 0;
        const bt = Array.isArray(b?.attachments) ? b.attachments.length : 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      av = (av ?? '').toString();
      bv = (bv ?? '').toString();
      return av.localeCompare(bv) * dir;
    });
  }, [tasks, activeTab, selectedTaskType, searchTerm, sortConfig]);

  const [weeklyOverviewSort, setWeeklyOverviewSort] = useState({ key: null, dir: 'asc' });


  const defaultWeekStart = fmtYMD(getMonday());
  const effectiveWeeklyOverviewWeekStart = weeklyOverviewWeekStart || weeklyOverview.week_start || defaultWeekStart;

  const sortedWeeklyOverview = useMemo(() => {
    const items = Array.isArray(weeklyOverview.items) ? [...weeklyOverview.items] : [];
    const { key, dir } = weeklyOverviewSort;
    if (!key) return items;

    const direction = dir === 'desc' ? -1 : 1;
    return items.sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];

      const numericKeys = new Set(['total_target_minutes', 'total_actual_minutes', 'unplanned_minutes', 'planned_score', 'unplanned_bonus', 'final_score']);

      if (numericKeys.has(key)) {
        const numA = Number(av || 0);
        const numB = Number(bv || 0);
        if (numA === numB) return 0;
        return numA > numB ? direction : -direction;
      }

      av = (av ?? '').toString().toLowerCase();
      bv = (bv ?? '').toString().toLowerCase();
      if (av === bv) return 0;
      return av > bv ? direction : -direction;
    });
  }, [weeklyOverview.items, weeklyOverviewSort]);

  function toggleWeeklyOverviewSort(key) {
    setWeeklyOverviewSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: null, dir: 'asc' };
      return { key, dir: 'asc' };
    });
  }

  function toggleSort(key) {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: null, dir: 'desc' };
      return { key, dir: 'asc' };
    });
  }

  function sortIndicator(key) {
    if (sortConfig.key !== key) return '';
    return sortConfig.dir === 'asc' ? '▲' : '▼';
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 z-[999800]">
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl border-gray-800/50 p-8 shadow-2xl w-full max-w-md" style={{ minWidth: '400px' }}>
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <img src={logo} alt="Logo" className="w-16 h-16" />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-wider">Görev Takip Sistemi</h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (showForgotPassword) {
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
            } else {
              doLogin();
            }
          }} className="space-y-6">
            <div>
              <label className="block text-white text-[24px] font-medium mb-3 items-left flex">
                E-mail
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full bg-gray-100 border-0 rounded-xl px-4 py-4 text-gray-900 focus:outline-none focus:ring-0 text-base text-[32px]"
                placeholder="Mail Adresinizi Giriniz"
                required
              />
            </div>
            <br />
            {!showForgotPassword && (
              <div>
                <label className="block text-white text-[24px] font-medium mb-3 items-left flex">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full bg-gray-100 border-0 rounded-xl px-4 py-4 pr-12 text-gray-900 focus:outline-none focus:ring-0 text-base text-[32px]"
                    placeholder="Şifrenizi Giriniz"
                    required
                    autoComplete="current-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
                <br />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading
                ? (showForgotPassword ? 'Talep Gönderiliyor...' : 'Giriş yapılıyor...')
                : (showForgotPassword ? 'Talep Gönder' : 'Giriş Yap')
              }
            </button>
          </form>
          <div className="mt-4 text-center" style={{ paddingTop: '5px' }}>
            <button
              type="button"
              onClick={() => {
                if (showForgotPassword) {
                  setShowForgotPassword(false);
                  setError(null);
                } else {
                  setShowForgotPassword(true);
                  setError(null);
                }
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {showForgotPassword ? 'Geri' : 'Şifremi Unuttum'}
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-[calc(95vh)] bg-gradient-to-br from-slate-50 to-blue-50" >
      <div className="bg-white shadow-lg w-full">
        <div className="flex justify-between w-full max-w-7xl mx-auto px-4" style={{ maxWidth: '1440px' }}>
          <img
            src={logo}
            alt="Vaden Logo"
            style={{ width: '300px', height: '100px' }}
            className="!w-8 !h-8 xs:!w-10 xs:!h-10 sm:!w-12 sm:!h-12"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <h2 className="text-[42px] font-semibold text-gray-900">
            Görev Takip Sistemi
          </h2>
          <div className="flex items-center">
            {user?.role !== 'observer' && (
              <button
                onClick={() => {
                  resetNewTask();
                  setShowAddForm(!showAddForm);
                }}
                className="add-task-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-md"
              >
                <span className="add-icon">➕</span>
              </button>
            )}

            <div className="relative profile-menu">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="profile-icon text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2 shadow-md"
                title={user?.email || ''}
              >
                <span className="user-icon">👤</span>
                <span className="hidden xs:inline text-xs xs:text-sm">{user?.name || 'Kullanıcı'}</span>
                <span className="text-xs hidden sm:inline">▼</span>
              </button>

              {showProfileMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]"
                  style={{ display: 'block' }}
                >
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowUserProfile(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    style={{ padding: '10px' }}
                  >
                    <span className="flex items-center gap-2">
                      <span>👤</span>
                      <span>Profil</span>
                    </span>
                  </button>
                  {user?.role === 'team_leader' && (
                    <button
                      onClick={async () => {
                        setShowProfileMenu(false);
                        await loadTeamMembers(user?.id);
                        setShowTeamModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      style={{ padding: '10px' }}
                    >
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span>👥</span>
                        <span>Takım</span>
                      </span>
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowWeeklyOverview(true);
                        loadWeeklyOverview(null);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      style={{ padding: '10px' }}
                    >
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span>🎯</span>
                        <span>Haftalık Hedef</span>
                      </span>
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowUserPanel(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      style={{ padding: '10px' }}
                    >
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span>⚙️</span>
                        <span>Kullanıcı Yönetimi</span>
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    style={{ padding: '10px' }}
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span>🚪</span>
                      <span>Çıkış Yap</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                ref={bellRef}
                onClick={async () => {
                  const next = !showNotifications;
                  if (next) await loadNotifications();
                  setShowNotifications(next);
                }}
                className="notification-bell relative rounded-lg text-gray-300 hover:bg-white/5 hover:text-white overflow-visible"
                aria-label="Bildirimler"
              >
                {badgeCount > 0 && (
                  <span className="notification-badge">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}

                <span>🔔</span>
              </button>
            </div>
            {showNotifications && createPortal(
              <>
                <div className="fixed inset-0 z-[999992] bg-black/80"
                  onClick={() => setShowNotifications(false)} style={{ pointerEvents: 'auto' }} />

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
                    className="w-[400px] max-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#111827] flex flex-col"
                    style={{ pointerEvents: 'auto' }}
                  >

                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0" style={{ padding: '10px' }}>
                      <h3 className="text-sm font-semibold text-neutral-100">Bildirimler</h3>
                      <button
                        onClick={markAllNotificationsAsRead}
                        disabled={markingAllNotifications || !Array.isArray(notifications) || notifications.length === 0}
                        className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Tümünü Oku
                      </button>
                    </div>

                    <div className="overflow-y-auto scrollbar-stable notification-scrollbar flex-1 min-h-0" style={{ padding: '10px' }}>
                      {(!Array.isArray(notifications) || notifications.length === 0) ? (
                        <div className="p-4 text-center text-neutral-400">Bildirim bulunmuyor</div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`p-3 border-b border-white/10 last:border-b-0 ${n.read_at ? 'bg-white/5' : 'bg-blue-500/10'} hover:bg-white/10 transition-colors cursor-pointer`}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <div className="flex items-start">
                              <div className="flex-1">
                                <p className="text-sm text-white">{n.message}</p>
                                <p className="text-xs text-neutral-400 mt-1">{formatDate(n.created_at)}</p>
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
            )}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[999999]" style={{ pointerEvents: 'auto' }}>
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 1)', pointerEvents: 'auto' }}
            onClick={() => {
              setShowAddForm(false);
              resetNewTask();
            }}
          />
          <div className="relative z-10 flex items-center justify-center p-2 sm:p-4 min-h-full" style={{ pointerEvents: 'none' }}>
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1400px] max-h-[100vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden" style={{ pointerEvents: 'auto', paddingRight: '5px' }}>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-[#0f172a] px-4 py-3">
                <div></div>
                <h2 className="font-semibold text-neutral-100 text-center">Yeni Görev</h2>
                <div className="justify-self-end">
                  <button onClick={() => {
                    setShowAddForm(false);
                    resetNewTask();
                  }} className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">✕</button>
                </div>
              </div>
              <div className="overflow-y-auto scrollbar-stable flex flex-col gap-4 sm:gap-6" style={{ height: 'auto', maxHeight: 'calc(95vh - 80px)', padding: '20px 20px 20px 20px' }}>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-4">
                    {error}
                  </div>
                )}
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">Görev Başlığı</label>
                  <input
                    type="text"
                    placeholder="Görev başlığını girin..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border shadow-sm"
                    style={{ minHeight: '48px' }}
                  />
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">Öncelik</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minHeight: '48px' }}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">Görev Türü</label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minHeight: '48px' }}
                  >
                    <option value="new_product">Yeni Ürün</option>
                    <option value="fixture">Fikstür</option>
                    <option value="apparatus">Aparat</option>
                    <option value="development">Geliştirme</option>
                    <option value="revision">Revizyon</option>
                    <option value="mold">Kalıp</option>
                    <option value="test_device">Test Cihazı</option>
                  </select>
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">Durum</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minHeight: '48px' }}
                  >
                    <option value="waiting">Bekliyor</option>
                    <option value="in_progress">Devam Ediyor</option>
                    <option value="investigating">Araştırılıyor</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">Sorumlu</label>
                  <select
                    value={newTask.responsible_id || ''}
                    onChange={(e) => setNewTask({ ...newTask, responsible_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minHeight: '48px' }}
                  >
                    <option value="">Sorumlu Seçin</option>
                    {getEligibleResponsibleUsers().length > 0 ? (
                      getEligibleResponsibleUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                    ) : (
                      <option value="" disabled>Uygun kullanıcı bulunamadı</option>
                    )}
                  </select>
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Tarihler</label>
                  <div className="flex flex-row gap-2 sm:gap-4">
                    <div className="flex-1">
                      <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1">Başlangıç</label>
                      <input
                        type="date"
                        value={newTask.start_date}
                        onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                        className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ minHeight: '48px' }}
                      />
                    </div>
                    <span className="w-[20px]"></span>
                    <div className="flex-1">
                      <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1">Bitiş</label>
                      <input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                        className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ minHeight: '48px' }}
                      />
                    </div>
                  </div>
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Atananlar</label>
                  <div className="w-full rounded-md p-3 sm:p-4 bg-white" style={{ minHeight: '48px', height: 'fit-content' }}>
                    {newTask.assigned_users.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {newTask.assigned_users.map((userId) => {
                          const user = users.find(u => u.id === userId);
                          return (
                            <span key={userId} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {user?.name || 'Bilinmeyen Kullanıcı'}
                              <button
                                type="button"
                                aria-label="Atananı kaldır"
                                onClick={() => setNewTask({
                                  ...newTask,
                                  assigned_users: newTask.assigned_users.filter(id => id !== userId)
                                })}
                                className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-xs text-blue-700 hover:bg-blue-200 hover:text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-300"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative z-[2147483647] assignee-dropdown-container">
                      <input
                        type="text"
                        placeholder="Kullanıcı atayın..."
                        value={assigneeSearch}
                        className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ minHeight: '48px' }}
                        onChange={(e) => {
                          setAssigneeSearch(e.target.value);
                          setShowAssigneeDropdown(true);
                        }}
                        onFocus={() => setShowAssigneeDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => setShowAssigneeDropdown(false), 200);
                        }}
                      />

                      {showAssigneeDropdown && users && users.length > 0 && (
                        <div
                          className="absolute w-full mt-1 rounded-md shadow-xl max-h-60 overflow-y-auto bg-white"
                          style={{
                            backgroundColor: '#1f2937',
                            opacity: 1,
                            zIndex: 2147483647,
                            filter: 'none',
                            backdropFilter: 'none',
                            WebkitBackdropFilter: 'none',
                            mixBlendMode: 'normal',
                            isolation: 'isolate',
                            pointerEvents: 'auto'
                          }}
                        >
                          {getEligibleAssignedUsers(newTask.responsible_id)
                            .filter(u =>
                              u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) &&
                              !newTask.assigned_users.includes(u.id)
                            )
                            .map(u => (
                              <div
                                key={u.id}
                                className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-blue-50 cursor-pointer text-[24px] sm:text-[24px] text-gray-900 border-gray-200 last:border-b-0 text-left"
                                style={{ backgroundColor: '#1f2937' }}
                                onClick={() => {
                                  setNewTask({
                                    ...newTask,
                                    assigned_users: [...newTask.assigned_users, u.id]
                                  });
                                  setAssigneeSearch('');
                                  setShowAssigneeDropdown(false);
                                }}
                              >
                                {u.name}
                              </div>
                            ))}
                          {getEligibleAssignedUsers(newTask.responsible_id).filter(u =>
                            u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) &&
                            !newTask.assigned_users.includes(u.id)
                          ).length === 0 && (
                              <div
                                className="px-3 sm:px-4 py-2 sm:py-3 text-gray-500 text-[16px] sm:text-[24px] border-b border-gray-200"
                                style={{ backgroundColor: 'gray' }}
                              >
                                Kullanıcı bulunamadı
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">Dosyalar</label>
                  <div className="w-full border border-gray-300 rounded-md p-3 sm:p-4 bg-white" style={{ minHeight: '24px', paddingTop: '10px', paddingBottom: '10px', paddingLeft: '5px' }}>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setNewTask({
                          ...newTask,
                          attachments: [...newTask.attachments, ...files]
                        });
                      }}
                      className="w-full !text-[24px] sm:!text-[24px] text-gray-600"
                    />
                    {newTask.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="!text-[24px] font-medium text-gray-700 text-left">Seçilen Dosyalar:</p>
                        {newTask.attachments.map((file, index) => (
                          <div key={index} className="!flex !items-center !justify-between !px-2 !py-2 !bg-gray-50 !rounded !border !border-gray-200">
                            <div className="flex-1 min-w-0">
                              <div className="!text-[24px] sm:!text-[20px] text-gray-700 text-left truncate">
                                {file.name || 'Dosya'}
                              </div>
                              {file.size && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => setNewTask({
                                ...newTask,
                                attachments: newTask.attachments.filter((_, i) => i !== index)
                              })}
                              className="text-red-600 hover:text-red-800 ml-2 px-2 py-1 rounded hover:bg-red-50"
                              title="Dosyayı kaldır"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <br />
                <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                  <label className="!text-[24px] font-medium text-slate-200 text-left">Görev Açıklaması</label>
                  <textarea
                    placeholder="Görev açıklamasını girin..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh]"
                  />
                </div>
                <br />
                <div className="mt-4 sm:mt-6 mb-4">
                  <button
                    onClick={handleAddTask}
                    disabled={addingTask || !newTask.title}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-md transition-colors !text-[16px] sm:!text-[24px] font-medium"
                  >
                    {addingTask ? 'Ekleniyor...' : 'Ekle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWeeklyGoals && createPortal(
        <div className="fixed inset-0 z-[999998]" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowWeeklyGoals(false)} style={{ pointerEvents: 'auto' }} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
            <div className="fixed z-[100260] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-[1500px] max-h-[90vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden"
              style={{ paddingBottom: '10px', pointerEvents: 'auto' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0f172a] relative">
                <div className="flex-1">
                  {weeklyUserId && Array.isArray(users) ? (
                    <div className="text-sm text-neutral-300" style={{ paddingLeft: '10px' }}>
                      {(() => {
                        const targetUser = users.find(u => u.id === weeklyUserId);
                        return targetUser ? (
                          <>
                            {targetUser.name} <br /> {targetUser.email}
                          </>
                        ) : (
                          'Bilinmeyen Kullanıcı'
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-300" style={{ paddingLeft: '10px' }}>
                      {user?.name} <br /> {user?.email}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center">
                  <h3 className="!text-[24px] font-semibold">Haftalık Hedefler</h3>
                </div>
                <div className="flex-1 flex justify-end">
                  <button onClick={() => setShowWeeklyGoals(false)} className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto scrollbar-stable" style={{ maxHeight: 'calc(90vh - 80px)', paddingTop: '10px' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-[10px]"></span>
                  <button className="rounded px-3 py-1 bg-white/10 hover:bg-white/20"
                    onClick={() => {
                      const base = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); base.setDate(base.getDate() - 7);
                      loadWeeklyGoals(fmtYMD(getMonday(base)));
                    }}>◀ Önceki</button><span className="w-[10px]"></span>
                  <div>
                    <input type="date" className="ml-2 rounded bg-white/10 border border-white/20 px-2 py-1 text-[24px]" value={weeklyWeekStart} onChange={(e) => loadWeeklyGoals(e.target.value)} />
                  </div>
                  <span className="w-[10px]"></span>
                  <button className="rounded px-3 py-1 bg-white/10 hover:bg-white/20" onClick={() => { const base = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); base.setDate(base.getDate() + 7); loadWeeklyGoals(fmtYMD(getMonday(base))); }}>Sonraki ▶</button>
                  <div className="text-sm text-neutral-300 text-[24px]" style={{ paddingLeft: '30px' }}>
                    {(() => { const cur = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); const next = new Date(cur); next.setDate(next.getDate() + 7); return `Bu hafta: ${isoWeekNumber(cur)} • Gelecek hafta: ${isoWeekNumber(next)}`; })()}
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-sm text-neutral-300 text-[24px]" style={{ paddingRight: '20px' }}>
                    <span>{combinedLocks.targets_locked ? 'Hedef kilitli' : 'Hedef açık'} • {combinedLocks.actuals_locked ? 'Gerçekleşme kilitli' : 'Gerçekleşme açık'}</span>
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 cursor-default ml-2"
                      title={
                        'Kural: \nGelecek haftalar tamamen açık. Geçmiş haftalar tamamen kapalı. \nHer hafta Pazartesi 10:00’a kadar içinde bulunulan haftanın hedefleri açık, 10:00’dan sonra hedefler kapalı. \nGerçekleşme Pazartesi 10:00’dan sonra açık.'
                      }
                    >
                      ℹ️
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '8px 6px' }}>
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-3 py-2 text-left text-[24px]">Haftalık Hedef</th>
                        <th className="px-3 py-2 text-left text-[24px]" style={{ paddingLeft: '20px' }}>Aksiyon Planları</th>
                        <th className="px-3 py-2 text-center text-[24px]" style={{ width: '100px', paddingRight: '20px', paddingLeft: '20px' }}>Hedef(dk)</th>
                        <th className="px-3 py-2 text-center text-[24px]">Ağırlık (%)</th>
                        <th className="px-3 py-2 text-center text-[24px]">Gerçekleşme(dk)</th>
                        <th className="px-3 py-2 text-center text-[24px]" style={{ width: '100px', paddingRight: '20px', paddingLeft: '20px' }}>Gerçekleşme(%)</th>
                        <th className="px-3 py-2 text-center text-[24px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(weeklyGoals.items || []).filter(x => !x.is_unplanned).map((row, idx) => {
                        const lockedTargets = combinedLocks.targets_locked && user?.role !== 'admin';
                        const lockedActuals = combinedLocks.actuals_locked && user?.role !== 'admin';
                        const t = Math.max(0, Number(row.target_minutes || 0));
                        const a = Math.max(0, Number(row.actual_minutes || 0));
                        const w = (t / 2700) * 100; // satır ağırlığı
                        const eff = a > 0 && t > 0 ? (t / a) : 0; // verimlilik (katsayı) — sınır yok
                        const rate = (eff * w).toFixed(1); // satırın performans katkısı (%)
                        return (
                          <tr key={row.id || `p-${idx}`} className="odd:bg-white/[0.02]">
                            <td className="px-3 py-2 align-top" style={{ verticalAlign: 'middle', paddingTop: '6px' }}>
                              <textarea disabled={lockedTargets || user?.role === 'observer'} value={row.title || ''}
                                onChange={e => {
                                  const items = [...weeklyGoals.items];
                                  items.find((r, i) => i === weeklyGoals.items.indexOf(row)).title = e.target.value;
                                  setWeeklyGoals({ ...weeklyGoals, items });
                                }} className="w-full rounded bg-white/10 border border-white/10 px-3 py-2 min-h-[80px] text-[16px] resize-y" />
                            </td>
                            <td className="px-3 py-2 align-top" style={{ verticalAlign: 'middle', paddingTop: '6px', paddingLeft: '20px' }}>
                              <textarea disabled={lockedTargets || user?.role === 'observer'} value={row.action_plan || ''} onChange={e => {
                                const items = [...weeklyGoals.items];
                                items.find((r, i) => i === weeklyGoals.items.indexOf(row)).action_plan = e.target.value;
                                setWeeklyGoals({ ...weeklyGoals, items });
                              }}
                                className="w-full rounded bg-white/10 border border-white/10 px-3 py-2 min-h-[80px] min-w-[250px] text-[16px] resize-y" />
                            </td>
                            <td className="px-3 py-2 text-center" style={{ verticalAlign: 'middle', width: '20px' }}>
                              <input type="number" inputMode="numeric" step="1" min="0" disabled={lockedTargets || user?.role === 'observer'} value={row.target_minutes || 0}
                                onChange={e => {
                                  const items = [...weeklyGoals.items];
                                  items.find((r, i) => i === weeklyGoals.items.indexOf(row)).target_minutes = Number(e.target.value || 0);
                                  setWeeklyGoals({ ...weeklyGoals, items });
                                }}
                                className="w-24 text-center rounded bg-white/10 border border-white/10 px-2 py-2 h-10 text-[32px]"
                                style={{ width: '90px', height: '83px', textAlign: 'center' }}
                              />
                            </td>
                            <td className="px-3 py-2 text-center text-neutral-200 text-[32px]" style={{ verticalAlign: 'middle' }}>{((t / 2700) * 100).toFixed(1)}</td>
                            <td className="px-3 py-2 text-center" style={{ verticalAlign: 'middle', width: '20px' }}>
                              <input type="number" inputMode="numeric" step="1" min="0" disabled={lockedActuals || user?.role === 'observer'} value={row.actual_minutes || 0}
                                onChange={e => { const items = [...weeklyGoals.items]; items.find((r, i) => i === weeklyGoals.items.indexOf(row)).actual_minutes = Number(e.target.value || 0); setWeeklyGoals({ ...weeklyGoals, items }); }}
                                className="w-24 text-center rounded bg-white/10 border border-white/10 px-2 py-2 h-10 text-[32px]"
                                style={{ width: '90px', height: '83px', textAlign: 'center' }}
                              /></td>
                            <td className="px-3 py-2 text-center text-neutral-200 text-[32px]" style={{ verticalAlign: 'middle', width: '20px' }}>{rate}</td>
                            <td className="px-3 py-2 text-center" style={{ verticalAlign: 'middle' }}>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="text-blue-300 hover:text-blue-200 text-[24px]"
                                  onClick={() => {
                                    setSelectedGoalIndex(weeklyGoals.items.indexOf(row));
                                    setGoalDescription(row.description || '');
                                    setShowGoalDescription(true);
                                  }}
                                  title="Açıklama Ekle/Düzenle"
                                >
                                  🔍
                                </button>
                                <span className="w-[10px]"></span>
                                {user?.role !== 'observer' && (!lockedTargets || user?.role === 'admin') && (
                                  <button className="text-rose-300 hover:text-rose-200 text-[24px]" onClick={() => {
                                    const items = weeklyGoals.items.filter(x => x !== row);
                                    setWeeklyGoals({ ...weeklyGoals, items });
                                  }}>X</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {user?.role !== 'observer' && (!combinedLocks.targets_locked || user?.role === 'admin') && (
                    <div className="mt-2" style={{ padding: '10px' }}>
                      <button className="rounded px-3 py-1 bg-white/10 hover:bg-white/20 w-full"
                        disabled={combinedLocks.targets_locked && user?.role !== 'admin'}
                        onClick={() => { setWeeklyGoals({ ...weeklyGoals, items: [...weeklyGoals.items, { title: '', action_plan: '', target_minutes: 0, weight_percent: 0, actual_minutes: 0, is_unplanned: false }] }); }}
                      >
                        + Satır Ekle</button>
                    </div>
                  )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded p-3" style={{ marginLeft: '2px', paddingRight: '5px' }}>
                  <div className="text-neutral-200 font-medium mb-2 text-[24px]" style={{ paddingLeft: '10px' }}>Plana dahil olmayan işler</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '8px 6px' }}>
                      <thead className="bg-white/10">
                        <tr>
                          <th className="px-3 py-2 text-left text-[24px]">Açıklama</th>
                          <th className="px-3 py-2 text-left text-[24px]">Aksiyon Planı</th>
                          <th className="px-3 py-2 text-right text-[24px]">Süre (dk)</th>
                          <th className="px-3 py-2 text-[24px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(weeklyGoals.items || []).filter(x => x.is_unplanned).map((row, idx) => (
                          <tr key={row.id || `u-${idx}`} className="odd:bg-white/[0.02]">
                            <td className="px-3 py-2">
                              <textarea disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'} value={row.title || ''} onChange={e => {
                                const items = [...weeklyGoals.items];
                                items.find((r, i) => i === weeklyGoals.items.indexOf(row)).title = e.target.value;
                                setWeeklyGoals({ ...weeklyGoals, items });
                              }}
                                className="w-full rounded bg-white/10 border border-white/10 px-3 py-2 min-h-[80px] text-[16px] resize-y" /></td>
                            <td className="px-3 py-2">
                              <textarea disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'} value={row.action_plan || ''}
                                onChange={e => {
                                  const items = [...weeklyGoals.items];
                                  items.find((r, i) => i === weeklyGoals.items.indexOf(row)).action_plan = e.target.value;
                                  setWeeklyGoals({ ...weeklyGoals, items });
                                }}
                                className="w-full rounded bg-white/10 border border-white/10 px-3 py-2 min-h-[80px] text-[16px] resize-y" /></td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'} value={row.actual_minutes || 0}
                                onChange={e => {
                                  const items = [...weeklyGoals.items];
                                  items.find((r, i) => i === weeklyGoals.items.indexOf(row)).actual_minutes = Number(e.target.value || 0);
                                  setWeeklyGoals({ ...weeklyGoals, items });
                                }}
                                className="w-24 text-center rounded bg-white/10 border border-white/10 px-2 py-2 h-10 text-[32px]"
                                style={{ width: '90px', height: '83px', textAlign: 'center' }} />
                            </td>
                            <td className="px-3 py-2 text-center" style={{ verticalAlign: 'middle' }}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="text-blue-300 hover:text-blue-200 text-[24px]"
                                  onClick={() => {
                                    setSelectedGoalIndex(weeklyGoals.items.indexOf(row));
                                    setGoalDescription(row.description || '');
                                    setShowGoalDescription(true);
                                  }}
                                  title="Açıklama Ekle/Düzenle"
                                >
                                  🔍
                                </button>
                                <span className="w-[10px]"></span>
                                {((!combinedLocks.actuals_locked || user?.role === 'admin') && user?.role !== 'observer') && (
                                  <button className="text-rose-300 hover:text-rose-200 text-[24px]"
                                    onClick={() => {
                                      const items = weeklyGoals.items.filter(x => x !== row);
                                      setWeeklyGoals({ ...weeklyGoals, items });
                                    }}>X</button>)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!combinedLocks.actuals_locked || user?.role === 'admin') && user?.role !== 'observer' && (
                      <div className="mt-2" style={{ paddingLeft: '10px' }}>
                        <button className="rounded px-3 py-1 bg-white/10 hover:bg-white/20 w-full"
                          onClick={() => { setWeeklyGoals({ ...weeklyGoals, items: [...weeklyGoals.items, { title: '', action_plan: '', actual_minutes: 0, is_unplanned: true }] }); }}
                          style={{ marginBottom: '10px' }}
                        >
                          + Satır Ekle</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4" style={{ marginLeft: '2px' }}>
                  <div className="bg-white/5 border border-white/10 rounded p-3 text-[24px]" style={{ paddingLeft: '10px' }}>
                    <div>Toplam Hedef Zamanı: <span className="font-semibold">{weeklyLive.totalTarget} dk</span></div>
                    <div>Toplam Ağırlık: <span className="font-semibold">{weeklyLive.totalWeight}%</span></div>
                    <div>Plandışı Süre: <span className="font-semibold">{weeklyLive.unplannedMinutes} dk</span></div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3 text-[24px]" style={{ paddingLeft: '10px' }}>
                    <div>Planlı Skor: {weeklyLive.plannedScore}%</div>
                    <div>Plandışı Bonus: {weeklyLive.unplannedBonus}%</div>
                    <div className="text-lg font-semibold">
                      Performans Sonucu:

                      <span
                        className="ml-2 font-bold"
                        style={{ color: getPerformanceGrade(weeklyLive.finalScore).color }}
                      >
                        <span className="w-[50px]"></span> {weeklyLive.finalScore}% {getPerformanceGrade(weeklyLive.finalScore).grade} {getPerformanceGrade(weeklyLive.finalScore).description}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-[98%]" style={{ paddingTop: '10px', paddingLeft: '15px', paddingBottom: '10px' }}>
                  <button className="flex-1 rounded px-4 py-2 bg-white/10 hover:bg-white/20" onClick={() => loadWeeklyGoals(weeklyWeekStart)}>Yenile</button>
                  <span className="w-[10px]"></span>
                  {user?.role !== 'observer' && (!combinedLocks.targets_locked || user?.role === 'admin') && (
                    <button className="flex-1 rounded px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={weeklyLive.totalTarget > 2700} onClick={saveWeeklyGoals}>Kaydet</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showGoalDescription && createPortal(
        <div className="fixed inset-0 z-[999998]" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'auto'
        }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowGoalDescription(false)} style={{ pointerEvents: 'auto' }} />
          <div className="relative z-10 w-[30vw] max-w-4xl rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden"
            style={{
              maxHeight: '80vh',
              transform: 'translate(0, 0)',
              margin: 'auto',
              paddingRight: '5px',
              pointerEvents: 'auto'
            }}>
            <div className="flex items-center px-6 py-4 border-b border-white/10 bg-[#0f172a]" style={{ paddingRight: '10px', paddingLeft: '10px' }}>
              <div className="flex-1"></div>
              <div className="flex-1 text-center">
                <h3 className="text-xl font-semibold">Hedef Açıklaması</h3>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => setShowGoalDescription(false)}
                  className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8" style={{ maxHeight: 'calc(80vh - 80px)', paddingLeft: '10px', paddingRight: '10px' }}>
              <div className="flex-1 gap-3 mb-6 p-6 bg-white/5 rounded-lg">
                {weeklyGoals.items[selectedGoalIndex].title && (
                  <h4 className="text-xl font-medium text-blue-300 mb-3">Hedef: {weeklyGoals.items[selectedGoalIndex].title || 'Başlık belirtilmemiş'}</h4>
                )}
                {weeklyGoals.items[selectedGoalIndex].action_plan && (
                  <h4 className="text-xl font-medium text-blue-300 mb-3">Aksiyon Planı: {weeklyGoals.items[selectedGoalIndex].action_plan}</h4>
                )}
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-medium text-blue-300 mb-3">Ek Açıklama:</h3>
                <textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  className="w-full h-[150px] rounded bg-white/10 border border-white/10 px-4 py-3 text-[24px] text-white placeholder-neutral-400 resize-y text-base"
                  placeholder="Bu hedefle ilgili ek açıklamalarınızı buraya yazabilirsiniz..."
                  disabled={user?.role === 'observer' || (combinedLocks.targets_locked && user?.role !== 'admin')}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => setShowGoalDescription(false)}
                  className="w-full px-6 py-3 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-lg font-medium"
                >
                  İptal
                </button>
                <span className="w-[20px]"></span>
                {user?.role !== 'observer' && (!combinedLocks.targets_locked || user?.role === 'admin') && (
                  <button
                    onClick={async () => {
                      if (selectedGoalIndex !== null) {
                        const items = [...weeklyGoals.items];
                        items[selectedGoalIndex].description = goalDescription;
                        setWeeklyGoals({ ...weeklyGoals, items });
                        // Backend'e kaydet
                        try {
                          await saveWeeklyGoals();
                          addNotification('Açıklama başarıyla kaydedildi.', 'success');
                        } catch (error) {
                          console.warn('Goal description save failed:', error);
                          addNotification('Açıklama kaydedilemedi.', 'error');
                        }
                      }
                      setShowGoalDescription(false);
                    }}
                    className="w-full px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors text-lg font-medium"
                  >
                    Kaydet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <div className="bg-white">
        {showWeeklyOverview ? (
          <div className="flex justify-center">
            <div className="px-2 xs:px-3 sm:px-4 lg:px-6" style={{ width: '1440px' }}>
              <div className="space-y-4" style={{ minWidth: '1440px', paddingTop: '10px', paddingBottom: '10px' }}>
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-3 overflow-x-auto">
                  <button
                    onClick={() => {
                      setShowWeeklyOverview(false);
                      setWeeklyOverviewError(null);
                    }}
                    className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Görev Listesine Dön
                  </button>
                  <span className="w-[10px]"></span>
                  <button
                    className="rounded px-3 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-sm"
                    onClick={() => {
                      const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                      base.setDate(base.getDate() - 7);
                      loadWeeklyOverview(fmtYMD(getMonday(base)));
                    }}
                  >
                    ◀ Önceki
                  </button>
                  <span className="w-[10px]"></span>
                  <input
                    type="date"
                    className="rounded border border-gray-300 bg-white px-3 py-1 text-[24px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={effectiveWeeklyOverviewWeekStart}
                    onChange={(e) => loadWeeklyOverview(e.target.value)}
                  />
                  <span className="w-[10px]"></span>
                  <button
                    className="rounded px-3 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-sm"
                    onClick={() => {
                      const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                      base.setDate(base.getDate() + 7);
                      loadWeeklyOverview(fmtYMD(getMonday(base)));
                    }}
                  >
                    Sonraki ▶
                  </button>
                  <div className="ml-auto text-sm text-gray-500 whitespace-nowrap">
                    {(() => {
                      const cur = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                      const next = new Date(cur);
                      next.setDate(next.getDate() + 7);
                      return `Bu hafta: ${isoWeekNumber(cur)} • Gelecek hafta: ${isoWeekNumber(next)}`;
                    })()}
                  </div>
                </div>
                {weeklyOverviewError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {weeklyOverviewError}
                  </div>
                )}
                <div className="bg-[#1f2937] rounded-lg shadow-lg overflow-hidden">
                  {weeklyOverviewLoading ? (
                    <div className="py-12 text-center text-gray-500 text-sm">
                      Haftalık hedef listesi yükleniyor...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-white/10 text-[16px] cursor-pointer">
                        <thead className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white text-[18px]">
                          <tr>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('name')} role="button">Kullanıcı</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('leader_name')} role="button">Lider</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('total_target_minutes')} role="button">Hedef (dk)</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('total_actual_minutes')} role="button">Gerçekleşme (dk)</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('unplanned_minutes')} role="button">Plandışı (dk)</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('planned_score')} role="button">Planlı (%)</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('unplanned_bonus')} role="button">Plandışı (%)</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('final_score')} role="button">Final Skor (%)</th>
                            <th className="px-4 py-3 text-center font-semibold text-white uppercase tracking-wide" onClick={() => toggleWeeklyOverviewSort('total_actual_minutes')} role="button">Toplam Süre (DK)</th>
                          </tr>
                        </thead>
                        <tbody className="text-white">
                          {weeklyOverview.items.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-6 text-center text-gray-500 text-sm">
                                Listelenecek kullanıcı bulunamadı.
                              </td>
                            </tr>
                          ) : (
                            sortedWeeklyOverview.map((item, index) => {
                              const grade = getPerformanceGrade(Number(item.final_score || 0));
                              const targetWeek = weeklyOverview.week_start || effectiveWeeklyOverviewWeekStart;
                              const baseBg = index % 2 === 0 ? 'rgba(55, 65, 81, 0.92)' : 'rgba(75, 85, 99, 0.88)';
                              return (
                                <tr
                                  key={item.user_id}
                                  onClick={() => {
                                    setShowWeeklyGoals(true);
                                    loadWeeklyGoals(targetWeek, item.user_id);
                                  }}
                                  className="transition-colors"
                                  style={{ backgroundColor: baseBg, height: '50px' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(129, 140, 248, 0.45)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = baseBg; }}
                                >
                                  <td className="px-4 py-3 text-sm text-left text-white text-indigo-400">{item.name}</td>
                                  <td className="px-4 py-3 text-sm text-left text-white">{item.leader_name || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-center text-white">{Number(item.total_target_minutes || 0).toLocaleString('tr-TR')}</td>
                                  <td className="px-4 py-3 text-sm text-center text-white">{Number(item.total_actual_minutes || 0).toLocaleString('tr-TR')}</td>
                                  <td className="px-4 py-3 text-sm text-center text-white">{Number(item.unplanned_minutes || 0).toLocaleString('tr-TR')}</td>
                                  <td className="px-4 py-3 text-sm text-center text-white">{Number(item.planned_score || 0).toFixed(1)}</td>
                                  <td className="px-4 py-3 text-sm text-center text-white">{Number(item.unplanned_bonus || 0).toFixed(1)}</td>
                                  <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: grade.color }}>{Number(item.final_score || 0).toFixed(1)}</td>
                                  <td className="px-4 py-3 text-sm text-center text-white">{Number((item.total_actual_minutes || 0) + (item.unplanned_minutes || 0))}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="px-2 xs:px-3 sm:px-4 lg:px-6" style={{ width: '1440px' }}>


                <div className="flex items-center space-x-3 border-b border-gray-200 pb-3 overflow-x-auto" style={{ minWidth: '1440px', paddingTop: '10px', paddingBottom: '10px' }}>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'active'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-transparent'
                      }`}
                  >
                    Aktif ({taskCounts.active})
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'completed'
                      ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-transparent'
                      }`}
                    style={{ marginLeft: '5px' }}
                  >
                    Tamamlanan ({taskCounts.completed})
                  </button>
                  <button
                    onClick={() => setActiveTab('deleted')}
                    className={`px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'deleted'
                      ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-transparent'
                      }`}
                    style={{ marginLeft: '5px' }}
                  >
                    İptal ({taskCounts.deleted})
                  </button>

                  <div className="relative" style={{ marginLeft: '5px' }}>
                    <select
                      value={selectedTaskType}
                      onChange={(e) => setSelectedTaskType(e.target.value)}
                      className="px-3 xs:px-4 sm:px-4 py-2.5 text-[16px] xs:text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm appearance-none cursor-pointer"
                      style={{ height: '40px', minWidth: '140px' }}
                    >
                      <option value="all">Tüm Türler</option>
                      <option value="new_product">Yeni Ürün</option>
                      <option value="fixture">Fikstür</option>
                      <option value="apparatus">Aparat</option>
                      <option value="development">Geliştirme</option>
                      <option value="revision">Revizyon</option>
                      <option value="mold">Kalıp</option>
                      <option value="test_device">Test Cihazı</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div className="relative flex-shrink-0 items-center" style={{ marginLeft: 'auto' }}>
                    <input
                      type="text"
                      placeholder="Görev ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="!w-48 xs:!w-56 sm:!w-64 px-4 py-2.5 text-xs xs:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      style={{ height: '30px', fontSize: '16px' }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      name="search"
                      id="task-search"
                      onFocus={(e) => {
                        e.target.setAttribute('autocomplete', 'off');
                        e.target.setAttribute('autocorrect', 'off');
                        e.target.setAttribute('autocapitalize', 'off');
                        e.target.setAttribute('spellcheck', 'false');
                      }}
                      onInput={(e) => {
                        if (e.target.value && !e.isTrusted) {
                          e.target.value = '';
                          setSearchTerm('');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="bg-gray-50 border-b border-gray-200" style={{ minWidth: '1440px' }}>
                <div className={`grid gap-0 px-2 xs:px-3 sm:px-4 lg:px-6 pt-2 xs:pt-3 text-xs xs:text-sm font-medium text-gray-500 uppercase tracking-wider grid-cols-[180px_100px_100px_220px_220px_140px_220px_80px_180px]`}>
                  <button onClick={() => toggleSort('title')} className="flex items-center justify-center px-2">
                    <span>Başlık</span><span className="text-[10px] ml-1">{sortIndicator('title')}</span>
                  </button>
                  <button onClick={() => toggleSort('priority')} className="flex items-center justify-center px-2">
                    <span>Öncelik</span><span className="text-[10px] ml-1">{sortIndicator('priority')}</span>
                  </button>
                  <button onClick={() => toggleSort('task_type')} className="flex items-center justify-center px-2">
                    <span>Tür</span><span className="text-[10px] ml-1">{sortIndicator('task_type')}</span>
                  </button>
                  <button onClick={() => toggleSort('responsible_name')} className="flex items-center justify-center px-2">
                    <span>Sorumlu</span><span className="text-[10px] ml-1">{sortIndicator('responsible_name')}</span>
                  </button>
                  <button onClick={() => toggleSort('creator_name')} className="flex items-center justify-center px-2">
                    <span>Oluşturan</span><span className="text-[10px] ml-1">{sortIndicator('creator_name')}</span>
                  </button>
                  <button onClick={() => toggleSort('start_date')} className="flex items-center justify-center px-2">
                    <span>Başlangıç</span><span className="text-[10px] ml-1">{sortIndicator('start_date')}</span>
                  </button>
                  <button onClick={() => toggleSort('assigned_count')} className="flex items-center justify-center px-2">
                    <span>Atananlar</span><span className="text-[10px] ml-1">{sortIndicator('assigned_count')}</span>
                  </button>
                  <button onClick={() => toggleSort('attachments_count')} className="flex items-center justify-center px-2">
                    <span>Dosyalar</span><span className="text-[10px] ml-1">{sortIndicator('attachments_count')}</span>
                  </button>
                  {activeTab === 'active' ? (
                    <button className="flex items-center justify-center px-2">
                      <span>Güncel Durum</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center px-2 select-none cursor-default">
                      <span>Eylem</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div style={{ width: '1440px' }}>
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={`grid gap-0 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-200 grid-cols-[180px_100px_100px_220px_220px_140px_220px_80px_180px]`}
                    style={{ paddingTop: '10px', paddingBottom: '10px' }}
                  >
                    <div className="px-2">
                      <div className="text-xs xs:text-sm font-medium text-blue-600 hover:text-blue-800">
                        {task.title || `Görev ${task.id}`}
                      </div>
                    </div>
                    <div className="px-2">
                      <span
                        className="inline-flex items-center px-1 xs:px-1.5 py-0.5 xs:py-1 rounded-full text-xs xs:text-sm font-medium"
                        style={{
                          backgroundColor: getPriorityColor(task.priority) + '20',
                          color: getPriorityColor(task.priority),
                          paddingBottom: '5px',
                          paddingTop: '5px',
                          paddingLeft: '5px',
                          paddingRight: '5px'
                        }}
                      >
                        {getPriorityText(task.priority)}
                      </span>
                    </div>
                    <div className="px-2">
                      <span
                        className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: getTaskTypeColor(task.task_type) + '20',
                          color: getTaskTypeColor(task.task_type),
                          paddingBottom: '5px',
                          paddingTop: '5px',
                          paddingLeft: '5px',
                          paddingRight: '5px'
                        }}
                      >
                        {getTaskTypeText(task.task_type)}
                      </span>
                    </div>
                    <div className="px-2 text-xs xs:text-sm text-gray-900">
                      {task.responsible?.name || 'Atanmamış'}
                    </div>
                    <div className="px-2 text-xs xs:text-sm text-gray-900">
                      {task.creator?.name || 'Bilinmiyor'}
                    </div>
                    <div className="px-2 text-xs xs:text-sm text-gray-900">
                      {task.start_date ? formatDateOnly(task.start_date) : '-'}
                    </div>
                    <div className="px-2 text-xs xs:text-sm text-gray-900 truncate">
                      {Array.isArray(task.assigned_users) && task.assigned_users.length > 0
                        ? task.assigned_users.map(u => (typeof u === 'object' ? (u.name || u.email || `#${u.id}`) : String(u))).join(', ')
                        : '-'}
                    </div>
                    <div className="px-2 text-xs xs:text-sm text-gray-900">
                      {task.attachments?.length > 0 ? `${task.attachments.length} dosya` : '-'}
                    </div>
                    <div className="px-2 flex justify-center items-center">
                      {activeTab === 'active' ? (
                        <div
                          className="relative group"
                          onMouseEnter={() => loadTaskHistoryForTooltip(task.id)}
                        >
                          <div
                            className="w-8 h-8 rounded-full cursor-help shadow-lg transition-all duration-200 hover:scale-110"
                            style={{
                              backgroundColor: getStatusColor(task.status),
                              border: '3px solid rgba(255, 255, 255, 0.3)',
                              boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                              width: '24px',
                              height: '24px'
                            }}
                            title={getStatusText(task.status)}
                          ></div>
                          <div
                            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 text-white text-xs rounded-lg shadow-xl border border-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50"
                            style={{
                              backgroundColor: 'rgba(17, 24, 39, 0.98)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              minWidth: '300px',
                              maxWidth: '400px',
                              padding: '20px 16px'
                            }}
                          >
                            <div className="text-justify">Bitiş Tarihi: {task.due_date ? formatDateOnly(task.due_date) : 'Belirtilmemiş'}</div>
                            <div className="text-justify">Durum: {getStatusText(task.status)}</div>
                            <div className="max-w-full break-words whitespace-normal text-justify">{getLastAddedDescription(taskHistories[task.id] || [])}</div>
                            <div
                              className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent"
                              style={{ borderBottomColor: 'rgba(17, 24, 39, 0.98)' }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermanentDelete(task.id);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded transition-colors"
                          title="Görevi kalıcı olarak sil"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredTasks.length === 0 && (
                <div className="flex justify-center">
                  <div className="text-center py-6 xs:py-8 sm:py-10 lg:py-12" style={{ width: '1440px' }}>
                    <div className="text-gray-500 text-sm xs:text-base sm:text-lg">
                      {activeTab === 'active' && 'Aktif görev bulunamadı'}
                      {activeTab === 'completed' && 'Tamamlanan görev bulunamadı'}
                      {activeTab === 'deleted' && 'İptal edilen görev bulunamadı'}
                    </div>
                    <div className="text-gray-400 text-xs mt-2">
                      {searchTerm ? 'Aramayı temizlemeyi deneyin' :
                        (activeTab === 'active' && (user?.role === 'admin' || user?.role === 'team_leader') ? 'Yeni görev ekleyin' : 'Henüz görev bulunmuyor')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showDetailModal && selectedTask && createPortal(
        <div className="fixed inset-0 z-[999996]" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/70" onClick={handleCloseModal} style={{ pointerEvents: 'auto' }} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-2 sm:p-4" style={{ pointerEvents: 'none' }}>
            <div
              className="
                fixed z-[100100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                w-[95vw] max-w-[58%]
                max-h-[90vh] rounded-2xl border border-white/10 box-border
                shadow-[0_25px_80px_rgba(0,0,0,.6)] flex flex-col overflow-hidden
              "
              style={{ backgroundColor: '#111827', color: '#e5e7eb', pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="border-b flex-none"
                style={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,.1)', padding: '0px 10px' }}
              >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="justify-self-start">

                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold text-white text-center">Görev Detayı</h2>
                  <div className="justify-self-end">
                    <button
                      onClick={handleCloseModal}
                      className="rounded-md px-2 py-1 text-neutral-300 hover:text-white hover:bg-white/10"
                      aria-label="Kapat"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex min-w-0 overflow-hidden overflow-x-hidden divide-x divide-white/10">
                <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-stable" style={{ padding: '0px 24px' }}>
                  <div className="py-6 flex flex-col gap-4 sm:gap-6 min-h-[calc(105vh-280px)]">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-4">
                        {error}
                      </div>
                    )}
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Başlık
                      </label>
                      <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                        {selectedTask.title ?? ""}
                      </div>
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Durum
                      </label>
                      {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.id === selectedTask.responsible?.id || user?.role === 'admin')) ? (
                        <select
                          value={detailDraft?.status || 'waiting'}
                          onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), status: e.target.value }))}
                          className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ height: '40px' }}
                        >
                          <option value="waiting">Bekliyor</option>
                          <option value="in_progress">Devam Ediyor</option>
                          <option value="investigating">Araştırılıyor</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="cancelled">İptal</option>
                        </select>
                      ) : (
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                          {getStatusText(selectedTask.status)}
                        </div>
                      )}
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Öncelik
                      </label>
                      {user?.role === 'admin' ? (
                        <select
                          value={detailDraft?.priority || 'medium'}
                          onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), priority: e.target.value }))}
                          className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ height: '40px' }}
                        >
                          <option value="low">Düşük</option>
                          <option value="medium">Orta</option>
                          <option value="high">Yüksek</option>
                          <option value="critical">Kritik</option>
                        </select>
                      ) : (
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                          {getPriorityText(selectedTask.priority)}
                        </div>
                      )}
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Görev Türü
                      </label>
                      {user?.role === 'admin' ? (
                        <select
                          value={detailDraft?.task_type || 'development'}
                          onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), task_type: e.target.value }))}
                          className="w-full rounded-md px-3 py-2 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ height: '40px' }}
                        >
                          <option value="new_product">Yeni Ürün</option>
                          <option value="fixture">Fikstür</option>
                          <option value="apparatus">Aparat</option>
                          <option value="development">Geliştirme</option>
                          <option value="revision">Revizyon</option>
                          <option value="mold">Kalıp</option>
                          <option value="test_device">Test Cihazı</option>
                        </select>
                      ) : (
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                          {getTaskTypeText(selectedTask.task_type)}
                        </div>
                      )}
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Sorumlu
                      </label>
                      {(user?.role === 'admin') ? (
                        <select
                          value={detailDraft?.responsible_id || ''}
                          onChange={(e) => {
                            const rid = e.target.value ? parseInt(e.target.value) : '';
                            setDetailDraft(prev => ({ ...(prev || {}), responsible_id: rid }));
                          }}
                          className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ height: '40px' }}
                        >
                          <option value="">Seçin</option>
                          {getEligibleResponsibleUsers().map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 flex items-center" style={{ height: '40px' }}>
                          {selectedTask.responsible?.name || 'Atanmamış'}
                        </div>
                      )}
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Oluşturan
                      </label>
                      <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ height: '40px' }}>
                        {selectedTask.creator?.name || 'Bilinmiyor'}
                      </div>
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Atananlar
                      </label>
                      <div className="w-full rounded-md p-3 sm:p-4 bg-white " style={{ minHeight: '24px', height: 'fit-content' }}>
                        {user?.role === 'admin' ? (
                          <div className="assignee-dropdown-detail-container relative">
                            {Array.isArray(detailDraft?.assigned_user_ids) && detailDraft.assigned_user_ids.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 mb-3 overflow-hidden">
                                {(detailDraft.assigned_user_ids || []).map((id) => {
                                  const u = (users || []).find(x => x.id === id) || (selectedTask.assigned_users || []).find(x => (typeof x === 'object' ? x.id : x) === id);
                                  const name = u ? (typeof u === 'object' ? (u.name || u.email || `#${id}`) : String(u)) : `#${id}`;
                                  return (
                                    <span key={id} className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 rounded-full text-sm max-w-full px-3 py-1">
                                      <span className="truncate">{name}</span>
                                      <button
                                        type="button"
                                        aria-label="Atananı kaldır"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextIds = (detailDraft?.assigned_user_ids || []).filter(v => v !== id);
                                          setDetailDraft(prev => ({ ...(prev || {}), assigned_user_ids: nextIds }));
                                        }}
                                        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-xs text-blue-700 hover:bg-blue-200 hover:text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-300"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            <input
                              ref={assigneeDetailInputRef}
                              type="text"
                              placeholder="Kullanıcı atayın..."
                              value={assigneeSearchDetail}
                              className="w-[99%] rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ minHeight: '32px' }}
                              onChange={(e) => {
                                setAssigneeSearchDetail(e.target.value);
                                setShowAssigneeDropdownDetail(true);
                              }}
                              onFocus={() => setShowAssigneeDropdownDetail(true)}
                              onBlur={() => {
                                setTimeout(() => setShowAssigneeDropdownDetail(false), 200);
                              }}
                            />

                            {showAssigneeDropdownDetail && users && users.length > 0 && (
                              <div
                                className="absolute w-full mt-1 border-2 border-gray-400 rounded-md shadow-xl max-h-60 overflow-y-auto bg-white"
                                style={{
                                  backgroundColor: '#1f2937',
                                  opacity: 1,
                                  zIndex: 2147483647,
                                  filter: 'none',
                                  backdropFilter: 'none',
                                  WebkitBackdropFilter: 'none',
                                  mixBlendMode: 'normal',
                                  isolation: 'isolate',
                                  pointerEvents: 'auto'
                                }}
                              >
                                {getEligibleAssignedUsers(selectedTask.responsible?.id)
                                  .filter(u => {
                                    const q = assigneeSearchDetail.toLowerCase();
                                    const name = (u.name || '').toLowerCase();
                                    const email = (u.email || '').toLowerCase();
                                    const matches = !q || name.includes(q) || email.includes(q);
                                    const already = (detailDraft?.assigned_user_ids || []).includes(u.id);
                                    return matches && !already;
                                  })
                                  .map(u => (
                                    <div
                                      key={u.id}
                                      className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-blue-50 cursor-pointer text-[24px] sm:text-[24px] text-gray-900 border-b border-gray-200 last:border-b-0 text-left"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={async () => {
                                        const nextIds = Array.from(new Set([...(detailDraft?.assigned_user_ids || []), u.id]));
                                        setDetailDraft(prev => ({ ...(prev || {}), assigned_user_ids: nextIds }));
                                        setAssigneeSearchDetail('');
                                        setShowAssigneeDropdownDetail(true);
                                        setTimeout(() => assigneeDetailInputRef.current?.focus(), 0);
                                      }}
                                    >
                                      {u.name}
                                    </div>
                                  ))}
                                {getEligibleAssignedUsers(selectedTask.responsible?.id).filter(u => {
                                  const q = assigneeSearchDetail.toLowerCase();
                                  const name = (u.name || '').toLowerCase();
                                  const email = (u.email || '').toLowerCase();
                                  const matches = !q || name.includes(q) || email.includes(q);
                                  const already = (detailDraft?.assigned_user_ids || []).some(id => id === u.id);
                                  return matches && !already;
                                }).length === 0 && (
                                    <div className="px-3 sm:px-4 py-2 sm:py-3 text-gray-500 text-[16px] sm:text-[24px] border-b border-gray-200">
                                      Kullanıcı bulunamadı
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            {Array.isArray(detailDraft?.assigned_user_ids) && detailDraft.assigned_user_ids.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-2 overflow-hidden">
                                {(detailDraft.assigned_user_ids || []).map((id) => {
                                  const u = (users || []).find(x => x.id === id) || (selectedTask.assigned_users || []).find(x => (typeof x === 'object' ? x.id : x) === id);
                                  const name = u ? (typeof u === 'object' ? (u.name || u.email || `#${id}`) : String(u)) : `#${id}`;
                                  return (
                                    <span key={id} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm max-w-[240px]">
                                      <span className="truncate">{name}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center ">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Dosyalar
                      </label>
                      <div className="w-full !text-[18px] p-3 sm:p-4 bg-white" style={{ minHeight: '18px', height: 'fit-content' }}>
                        {uploadProgress && (
                          <div className="mb-3">
                            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all duration-150"
                                style={{ width: `${Math.max(0, Math.min(100, uploadProgress.percent ?? 10))}%` }}
                              />
                            </div>
                            <div className="text-right text-xs text-gray-500 mt-1">
                              {typeof uploadProgress.percent === 'number' ? `${uploadProgress.percent}%` : '...'}
                            </div>
                          </div>
                        )}
                        {(user?.role === 'admin' || (user?.role === 'team_leader' && (user?.id === selectedTask.creator?.id || user?.id === selectedTask.responsible?.id))) ? (
                          <div className="space-y-3 !text-[18px]">
                            <input
                              type="file"
                              multiple
                              accept={[
                                'image/*',
                                '.pdf',
                                '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                                '.zip', '.rar', '.7z',
                                '.sldprt', '.sldasm', '.slddrw',
                                '.step', '.stp', '.iges', '.igs',
                                '.x_t', '.x_b', '.stl', '.3mf',
                                '.dwg', '.dxf', '.eprt', '.easm', '.edrw'
                              ].join(',')}
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;
                                try {
                                  setUploadProgress({ percent: 0, label: 'Dosyalar yükleniyor' });
                                  await Tasks.uploadAttachments(selectedTask.id, files, (p) => {
                                    setUploadProgress({ percent: p, label: 'Dosyalar yükleniyor' });
                                  });
                                  const t = await Tasks.get(selectedTask.id);
                                  setSelectedTask(t.task || t);
                                  addNotification('Dosyalar yüklendi', 'success');
                                } catch {
                                  addNotification('Yükleme başarısız', 'error');
                                } finally {
                                  setUploadProgress(null);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full !text-[18px] sm:!text-[16px] text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-[18px] sm:file:text-[16px] file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-colors"
                            />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                <div className="text-gray-800" style={{ paddingLeft: '12px' }}>Yüklenen dosya: <span className="font-semibold">{(selectedTask.attachments || []).length}</span> adet</div>
                                {(selectedTask.attachments || []).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setAttachmentsExpanded(v => !v)}
                                    className="rounded px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {attachmentsExpanded ? '⮝' : '⮟'}
                                  </button>
                                )}
                              </div>
                              {attachmentsExpanded && (selectedTask.attachments || []).length > 0 && (
                                <div className="space-y-1">
                                  {(selectedTask.attachments || []).map(a => (
                                    <div key={a.id} className="flex items-center justify-between bg-gray-50 border-gray-200 rounded px-2 py-1" style={{ paddingTop: '10px', paddingLeft: '10px' }}>
                                      <div className="flex-1 min-w-0">
                                        <a
                                          href={(() => {
                                            if (a.signed_url) {
                                              const url = a.signed_url;
                                              return url.startsWith('http') ? url : `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
                                            }
                                            if (a.url) return a.url;
                                            if (a.path) return `${apiOrigin}/storage/${a.path}`;
                                            return '#';
                                          })()}
                                          target="_blank"
                                          rel="noreferrer"
                                          download={a.original_name || a.name || 'dosya'}
                                          className="text-blue-600 hover:underline text-[16px] truncate block"
                                          title={a.original_name || 'Dosya'}
                                        >
                                          {a.original_name || a.name || 'Dosya'}
                                        </a>
                                        {a.size && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {(a.size / 1024 / 1024).toFixed(2)} MB
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await Tasks.deleteAttachment(a.id);
                                            const t = await Tasks.get(selectedTask.id);
                                            setSelectedTask(t.task || t);
                                            addNotification('Dosya silindi', 'success');
                                          } catch (err) {
                                            console.error('Delete attachment error:', err);
                                            addNotification('Silinemedi', 'error');
                                          }
                                        }}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded flex items-center justify-center ml-2"
                                        title="Dosyayı sil"
                                        style={{ width: '65px', height: '40px' }}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                              <div className="text-gray-800">Yüklenen dosya: <span className="font-semibold">{(selectedTask.attachments || []).length}</span> adet</div>
                              {(selectedTask.attachments || []).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setAttachmentsExpanded(v => !v)}
                                  className="rounded px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {attachmentsExpanded ? '⮝' : '⮟'}
                                </button>
                              )}
                            </div>
                            {attachmentsExpanded && (selectedTask.attachments || []).length > 0 ? (
                              <div className="space-y-1">
                                {(selectedTask.attachments || []).map(a => (
                                  <div key={a.id} className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                                    <a
                                      href={(() => {
                                        if (a.signed_url) {
                                          const url = a.signed_url;
                                          return url.startsWith('http') ? url : `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
                                        }
                                        if (a.url) return a.url;
                                        if (a.path) return `${apiOrigin}/storage/${a.path}`;
                                        return '#';
                                      })()}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={a.original_name || a.name || 'dosya'}
                                      className="text-blue-600 hover:underline text-sm block"
                                      title={a.original_name || 'Dosya'}
                                    >
                                      {a.original_name || a.name || 'Dosya'}
                                    </a>
                                    {a.size && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {(a.size / 1024 / 1024).toFixed(2)} MB
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              (selectedTask.attachments || []).length === 0 && <span className="text-gray-500 text-sm">-</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Tarihler
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 min-w-0">
                        <div className="min-w-0">
                          <label className="block !text-[24px] sm:!text-[16px] !leading-[1.2] !font-medium text-left mb-1">Başlangıç</label>
                          {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.role === 'admin')) ? (
                            <input
                              type="date"
                              value={editingDates.start_date}
                              onChange={(e) => {
                                setEditingDates(prev => ({
                                  ...prev,
                                  start_date: e.target.value
                                }));
                              }}
                              onBlur={(e) => handleDateChange(selectedTask.id, 'start_date', e.target.value)}
                              className="w-[98%] min-w-0 rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ minHeight: '32px' }}
                            />
                          ) : (
                            <div className="w-full min-w-0 rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 flex items-center truncate" style={{ minHeight: '24px' }}>
                              {selectedTask.start_date ? formatDateOnly(selectedTask.start_date) : '-'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <label className="block !text-[24px] sm:!text-[16px] !leading-[1.2] !font-medium text-left mb-1">Bitiş</label>
                          {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.role === 'admin' || user?.role === 'team_leader')) ? (
                            <input
                              type="date"
                              value={editingDates.due_date}
                              onChange={(e) => {
                                setEditingDates(prev => ({
                                  ...prev,
                                  due_date: e.target.value
                                }));
                              }}
                              onBlur={(e) => handleDateChange(selectedTask.id, 'due_date', e.target.value)}
                              className="w-[98%] min-w-0 rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ minHeight: '32px', paddingLeft: '6px' }}
                            />
                          ) : (
                            <div className="w-full min-w-0 rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] bg-white text-gray-900 flex items-center truncate" style={{ minHeight: '24px' }}>
                              {selectedTask.due_date ? formatDateOnly(selectedTask.due_date) : '-'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <br />
                    <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-slate-200 text-left">
                        Görev Açıklaması
                      </label>
                      <div className="w-[99%]">
                        {user?.role === 'admin' ? (
                          <textarea
                            value={descDraft}
                            onChange={(e) => {
                              setDescDraft(e.target.value);
                            }}
                            placeholder="Görev açıklamasını girin..."
                            className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh]"
                          />
                        ) : (
                          <textarea
                            readOnly
                            value={selectedTask.description ?? ''}
                            placeholder="Görev açıklamasını girin..."
                            className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh]"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-[480px] md:w-[420px] lg:w-[480px] max-w-[48%] shrink-0 bg-[#0f172a] flex flex-col overflow-hidden">
                  <div className="border-b border-white/10 flex-none" style={{ padding: '10px' }}>
                    <h3 className="text-lg md:text-xl font-semibold text-white">👁️ Son Görüntüleme</h3>
                    <div className="mt-3 space-y-2">
                      {Array.isArray(taskLastViews) && taskLastViews.length > 0 ? (
                        taskLastViews.map(v => (
                          <div key={v.user_id} className="flex items-center justify-between text-sm">
                            <div className="text-neutral-200 truncate mr-3">
                              {v.name}
                              {v.is_responsible ? <span className="ml-2 text-xs text-blue-300"></span> : null}
                            </div>
                            <div className="text-neutral-400 whitespace-nowrap">{v.last_viewed_at ? formatDate(v.last_viewed_at) : '-'}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-neutral-400 text-sm">Kayıt bulunamadı</div>
                      )}
                    </div>
                  </div>
                  <div className="border-b border-white/10 flex-none" style={{ padding: '1px' }}>
                    <div className="flex items-center justify-between" style={{ paddingLeft: '10px' }}>
                      <h3 className="text-lg md:text-xl font-semibold text-white">📢 Görev Geçmişi</h3>
                      <button
                        onClick={() => { if (user?.role === 'admin') setHistoryDeleteMode(v => !v); }}
                        className={`rounded px-2 py-1 ${user?.role === 'admin' ? 'text-neutral-300 hover:bg-white/10' : 'text-neutral-500 cursor-not-allowed'}`}
                        title={user?.role === 'admin' ? (historyDeleteMode ? 'Silme modunu kapat' : 'Silme modunu aç') : 'Sadece admin'}
                      >⚙️</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-stable space-y-4" style={{ padding: '10px' }}>
                    {Array.isArray(taskHistory) && taskHistory.length > 0 ? (
                      taskHistory.map((h) => (
                        <div key={h.id} className="bg-white/5 border-white/10 p-3 rounded max-w-full overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                              <div className="text-[11px] text-blue-300 mb-1">{formatDateOnly(h.created_at)}</div>
                              {h.field === 'comment' ? (
                                <div className="text-sm max-w-full overflow-hidden">
                                  <span className="font-medium text-white">{h.user?.name || 'Kullanıcı'}:<br></br></span>{' '}
                                  <span className="text-neutral-200 break-words whitespace-normal block max-w-full">{renderHistoryValue(h.field, h.new_value)}</span>
                                </div>
                              ) : (h.new_value && typeof h.new_value === 'string' && h.new_value.trim().length > 0 &&
                                !h.field.includes('status') && !h.field.includes('priority') &&
                                !h.field.includes('task_type') && !h.field.includes('date') &&
                                !h.field.includes('attachments') && !h.field.includes('assigned') &&
                                !h.field.includes('responsible') && !h.field.includes('assigned_users') &&
                                !h.new_value.toLowerCase().includes('dosya') &&
                                !h.new_value.toLowerCase().includes('eklendi') &&
                                !h.new_value.toLowerCase().includes('silindi') &&
                                !h.new_value.toLowerCase().includes('değiştirildi') &&
                                !h.new_value.toLowerCase().includes('→')) ? (
                                <div className="text-sm max-w-full overflow-hidden">
                                  <span className="font-medium text-white">{h.user?.name || 'Kullanıcı'}:<br></br></span>{' '}
                                  <span className="text-neutral-200 break-words whitespace-normal block max-w-full">{h.new_value}</span>
                                </div>
                              ) : h.field === 'attachments' ? (
                                <div className="text-sm text-neutral-200">
                                  {(() => {
                                    const normalizeToNames = (val) => {
                                      let arr;
                                      try {
                                        const v = typeof val === 'string' ? JSON.parse(val) : val;
                                        arr = Array.isArray(v) ? v : (v != null ? [v] : []);
                                      } catch {
                                        arr = val != null ? [val] : [];
                                      }
                                      return arr.map((item) => {
                                        if (item == null) return '';
                                        if (typeof item === 'string') return item;
                                        if (typeof item === 'object') {
                                          return (
                                            item.original_name ||
                                            item.name ||
                                            item.filename ||
                                            item.file_name ||
                                            item.title ||
                                            item.path ||
                                            item.url ||
                                            JSON.stringify(item)
                                          );
                                        }
                                        return String(item);
                                      });
                                    };
                                    const added = normalizeToNames(h.new_value);
                                    const removed = normalizeToNames(h.old_value);
                                    const actor = h.user?.name || 'Kullanıcı';
                                    if (added.length > 0 && removed.length === 0) {
                                      return (
                                        <>
                                          <span className="font-medium text-white">{actor}</span> dosya ekledi.
                                          <ul className="mt-1 list-disc list-inside text-neutral-300 space-y-0.5">
                                            {added.map((name, idx) => (
                                              <li key={`a-${idx}`} className="break-all">{name}</li>
                                            ))}
                                          </ul>
                                        </>
                                      );
                                    }
                                    if (removed.length > 0 && added.length === 0) {
                                      return (
                                        <>
                                          <span className="font-medium text-white">{actor}</span> dosya sildi.
                                          <ul className="mt-1 list-disc list-inside text-neutral-300 space-y-0.5">
                                            {removed.map((name, idx) => (
                                              <li key={`r-${idx}`} className="break-all">{name}</li>
                                            ))}
                                          </ul>
                                        </>
                                      );
                                    }
                                    return (
                                      <>
                                        <span className="font-medium text-white">{actor}</span> dosya ekledi/sildi.
                                        {added.length > 0 && (
                                          <>
                                            <div className="mt-1 text-neutral-400">Eklendi:</div>
                                            <ul className="list-disc list-inside text-neutral-300 space-y-0.5">
                                              {added.map((name, idx) => (
                                                <li key={`a2-${idx}`} className="break-all">{name}</li>
                                              ))}
                                            </ul>
                                          </>
                                        )}
                                        {removed.length > 0 && (
                                          <>
                                            <div className="mt-1 text-neutral-400">Silindi:</div>
                                            <ul className="list-disc list-inside text-neutral-300 space-y-0.5">
                                              {removed.map((name, idx) => (
                                                <li key={`r2-${idx}`} className="break-all">{name}</li>
                                              ))}
                                            </ul>
                                          </>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              ) : h.field === 'assigned_users' ? (
                                <div className="text-sm">
                                  {(() => {
                                    const normalizeToNames = (val) => {
                                      let arr;
                                      try {
                                        const v = typeof val === 'string' ? JSON.parse(val) : val;
                                        arr = Array.isArray(v) ? v : (v != null ? [v] : []);
                                      } catch {
                                        arr = val != null ? [val] : [];
                                      }
                                      return arr.map((id) => {
                                        return resolveUserName(id);
                                      });
                                    };
                                    const oldUsers = normalizeToNames(h.old_value);
                                    const newUsers = normalizeToNames(h.new_value);
                                    const added = newUsers.filter(user => !oldUsers.includes(user));
                                    const removed = oldUsers.filter(user => !newUsers.includes(user));

                                    const actor = h.user?.name || 'Kullanıcı';
                                    if (added.length > 0 && removed.length === 0) {
                                      return (
                                        <>
                                          <span className="font-medium text-white">{actor}</span> atanan kullanıcıları güncelledi.
                                          <div className="mt-1 text-neutral-400">Atanan Kullanıcı:</div>
                                          <ul className="mt-1 list-disc list-inside text-neutral-300 space-y-0.5">
                                            {added.map((name, idx) => (
                                              <li key={`a-${idx}`} className="break-all">{name}</li>
                                            ))}
                                          </ul>
                                        </>
                                      );
                                    }
                                    if (removed.length > 0 && added.length === 0) {
                                      return (
                                        <>
                                          <span className="font-medium text-white">{actor}</span> atanan kullanıcıları güncelledi.
                                          <div className="mt-1 text-neutral-400">Kaldırılan Kullanıcı:</div>
                                          <ul className="mt-1 list-disc list-inside text-neutral-300 space-y-0.5">
                                            {removed.map((name, idx) => (
                                              <li key={`r-${idx}`} className="break-all">{name}</li>
                                            ))}
                                          </ul>
                                        </>
                                      );
                                    }
                                    return (
                                      <>
                                        <span className="font-medium text-white">{actor}</span> atanan kullanıcıları güncelledi.
                                        {added.length > 0 && (
                                          <>
                                            <div className="mt-1 text-neutral-400">Atanan Kullanıcı:</div>
                                            <ul className="list-disc list-inside text-neutral-300 space-y-0.5">
                                              {added.map((name, idx) => (
                                                <li key={`a2-${idx}`} className="break-all">{name}</li>
                                              ))}
                                            </ul>
                                          </>
                                        )}
                                        {removed.length > 0 && (
                                          <>
                                            <div className="mt-1 text-neutral-400">Kaldırılan Kullanıcı:</div>
                                            <ul className="list-disc list-inside text-neutral-300 space-y-0.5">
                                              {removed.map((name, idx) => (
                                                <li key={`r2-${idx}`} className="break-all">{name}</li>
                                              ))}
                                            </ul>
                                          </>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <span className="font-medium text-white">{h.user?.name || 'Kullanıcı'}</span>{' '}
                                  {renderFieldLabel(h.field)} değiştirdi <br></br> "<span className="text-neutral-300">{renderHistoryValue(h.field, h.old_value)}</span> →{' '}
                                  <span className="text-neutral-300">{renderHistoryValue(h.field, h.new_value)}</span>"
                                </div>
                              )}
                            </div>
                            {(user?.role === 'admin' && historyDeleteMode && h.field === 'comment') && (
                              <button
                                onClick={async () => { try { await Tasks.deleteHistory(selectedTask.id, h.id); const h2 = await Tasks.getHistory(selectedTask.id); setTaskHistory(Array.isArray(h2) ? h2 : []); setTaskHistories(prev => ({ ...prev, [selectedTask.id]: Array.isArray(h2) ? h2 : [] })); addNotification('Yorum silindi', 'success'); } catch (err) { console.error('Delete history error:', err); addNotification('Silinemedi', 'error'); } }}
                                className="shrink-0 rounded px-2 py-1 text-rose-300 hover:text-white hover:bg-rose-600/30 text-xs"
                                title="Yorumu sil"
                              >🗑️</button>
                            )}
                          </div>
                          <div className="sticky bottom-0 w-full border-t border-white/10 bg-[#0b1625]/90 backdrop-blur px-8 py-5"></div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-neutral-400 py-4">Henüz görev geçmişi bulunmuyor</div>
                    )}

                    {Array.isArray(comments) && comments.map((c) => (
                      <div key={c.id} className="bg-white/5 border border-white/10 p-3 rounded">
                        <div className="text-[11px] text-neutral-400 mb-1">{formatDate(c.timestamp)}</div>
                        <div className="text-sm">
                          <span className="font-medium text-white">{c.author}</span> {c.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  {user?.role !== 'observer' && (
                    <div className="border-t border-white/10 flex-none p-4">
                      <div className="relative flex items-center bg-gray-800 rounded-2xl border-none border-gray-600 py-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Yorum yap/Not ekle"
                          className="flex-1 bg-transparent border-none outline-none px-4 text-white placeholder-gray-400 resize-none"
                          style={{
                            height: '80px',
                            overflowY: 'auto',
                            fontSize: '16px',
                            color: 'white',
                            lineHeight: '1'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment();
                            }
                          }}
                        />
                        <div className="pr-3 flex items-center h-[100%] border-0" style={{ height: '80px', backgroundColor: '#1f2937' }}>
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="rounded-full flex items-center justify-center transition-all duration-300"
                            style={{
                              height: '80px',
                              backgroundColor: newComment.trim() ? '#10b981' : '#4b5563',
                              boxShadow: newComment.trim() ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                              transform: newComment.trim() ? 'scale(0.8)' : 'scale(0.8)',
                              cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                              border: newComment.trim() ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(255, 255, 255, 0.1)',
                              opacity: newComment.trim() ? '1' : '0.6',
                            }}
                            onMouseEnter={(e) => {
                              if (newComment.trim()) {
                                e.target.style.backgroundColor = '#059669';
                                e.target.style.transform = 'scale(0.8)';
                                e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (newComment.trim()) {
                                e.target.style.backgroundColor = '#10b981';
                                e.target.style.transform = 'scale(0.8)';
                                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                              }
                            }}
                          >
                            <span className="text-[40px]">⮝</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showUserProfile && createPortal(
        <div className="fixed inset-0 z-[999980]" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowUserProfile(false)} style={{ pointerEvents: 'auto' }} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
            <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[800px] max-h-[85vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden" style={{ pointerEvents: 'auto' }}>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-[#0f172a] px-4 py-3">
                <div></div>
                <h2 className="font-semibold text-neutral-100 text-center">Profil</h2>
                <div className="justify-self-end">
                  <button onClick={() => setShowUserProfile(false)}
                    className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">✕</button>
                </div>
              </div>

              <div className="p-4 xs:p-6 sm:p-8 space-y-4 xs:space-y-6 sm:space-y-8 overflow-y-auto scrollbar-stable" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                <div className="bg-white/5 rounded-xl p-6 mx-4" style={{ padding: '15px' }}>
                  <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 260px' }}>
                    <div>
                      <div className="grid items-center gap-x-8 gap-y-4" style={{ gridTemplateColumns: '120px 1fr' }}>
                        <div className="text-neutral-300 !text-[18px]">İsim</div>
                        <div className="font-semibold !text-[18px] truncate">{user?.name || 'Belirtilmemiş'}</div>

                        <div className="text-neutral-300 !text-[18px]">E-posta</div>
                        <div className="!text-[18px] truncate">{user?.email || 'Belirtilmemiş'}</div>

                        <div className="text-neutral-300 !text-[18px]">Rol</div>
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 !text-[18px]">{getRoleText(user?.role)}</div>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      {user?.role !== 'observer' && (
                        <button
                          className="w-full h-full rounded px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                          onClick={async () => {
                            setWeeklyUserId(null); // Kendi hedeflerini göster
                            setShowWeeklyGoals(true);
                            await loadWeeklyGoals(null, null); // Kendi hedeflerini yükle
                          }}
                        >
                          <span className="!text-[40px]">🎯</span>
                          <span className="!text-[24px]">Haftalık Hedefler</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="sticky bottom-0 w-full border-t border-white/10 bg-[#0b1625]/90 backdrop-blur px-8 py-5"></div>
                <div className="bg-white/5 rounded-xl p-6 mx-4">
                  <div className="!text-[24px] font-medium mb-4 flex items-center" style={{ paddingLeft: '15px' }}>
                    🔐 <span className="ml-2">Şifre Değiştir</span>
                  </div>
                  <PasswordChangeForm onDone={() => setShowUserProfile(false)} />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showTeamModal && createPortal(
        <div className="fixed inset-0 z-[999994]" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTeamModal(false)} style={{ pointerEvents: 'auto' }} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
            <div className="fixed z-[100230] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[900px] max-h-[80vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden" style={{ pointerEvents: 'auto' }}>
              <div className="flex items-center justify-center px-5 py-3 border-b border-white/10 bg-[#0f172a] relative">
                <h2 className="font-semibold text-center">Takım</h2>
                <button onClick={() => setShowTeamModal(false)} className="absolute" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                  <span className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">✕</span>
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto scrollbar-stable" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                {Array.isArray(teamMembers) && teamMembers.filter(m => m.role !== 'observer').length > 0 ? (
                  teamMembers.filter(m => m.role !== 'observer').map(m => (
                    <div key={m.id} className="flex items-center text-[24px] justify-between bg-white/5 rounded px-3 py-2"
                      style={{ paddingTop: '20px', paddingBottom: '20px', paddingLeft: '10px', paddingRight: '10px' }}>
                      <div>
                        <div className="font-medium text-white">{m.name}</div>
                        <div className="text-sm text-neutral-300">{m.email}</div>
                      </div>
                      <button className="rounded px-3 py-2 bg-blue-600 hover:bg-blue-700" onClick={async () => {
                        setShowTeamModal(false); setWeeklyUserId(m.id);
                        setShowWeeklyGoals(true); await loadWeeklyGoals(null, m.id);
                      }} style={{ height: '70px' }}>Hedefleri Aç</button>
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
      )}

      {showUserPanel && createPortal(
        <div className="fixed inset-0 z-[999993]" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowUserPanel(false)} style={{ pointerEvents: 'auto' }} />
          <div className="relative flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] max-w-[1485px] max-h-[85vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden"
              style={{ pointerEvents: 'auto' }}>
              <div className="border-b flex-none" style={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,.1)', padding: '0px 10px' }}>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="justify-self-start"></div>
                  <h2 className="text-xl md:text-2xl font-semibold text-white text-center">Kullanıcı Yönetimi</h2>
                  <div className="justify-self-end">
                    <button
                      onClick={() => setShowUserPanel(false)}
                      className="rounded-md px-2 py-1 text-neutral-300 hover:text-white hover:bg-white/10"
                      aria-label="Kapat"
                    >✕</button>
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 divide-x divide-white/10 overflow-y-auto scrollbar-stable" style={{ height: 'calc(80vh - 72px)' }}>
                <div className="w-2/5 min-w-0 space-y-6" style={{ paddingRight: '20px', paddingLeft: '20px' }}>
                  {user?.role === 'admin' && (
                    <div className="pt-4" style={{ paddingTop: '5px' }}>
                      <div className="font-medium mb-2 !text-[32px]" style={{ paddingBottom: '10px' }}>Yeni Kullanıcı Ekle</div>
                      <AdminCreateUser />
                    </div>
                  )}
                </div>
                <div className="w-3/5 shrink-0 bg-[#0f172a] overflow-y-auto scrollbar-stable" style={{ padding: '20px' }}>
                  <div className="flex text-[24px] font-semibold mb-4 space-y-3" style={{ marginBottom: '10px' }}>
                    <span>Kullanıcılar</span> <span className="w-[50px]"></span>
                    <input
                      type="text"
                      placeholder="Kullanıcı ara..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 !text-[24px] text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: 'black' }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      name="user-search"
                      id="user-search"
                      onFocus={(e) => {
                        e.target.setAttribute('autocomplete', 'off');
                        e.target.setAttribute('autocorrect', 'off');
                        e.target.setAttribute('autocapitalize', 'off');
                        e.target.setAttribute('spellcheck', 'false');
                      }}
                      onInput={(e) => {
                        if (e.target.value && !e.isTrusted) {
                          e.target.value = '';
                          setUserSearchTerm('');
                        }
                      }}
                    />
                  </div>
                  <div className="text-[16px] font-semibold mb-4 space-y-3">
                    <div className="flex items-center gap-3 bg-blue-500/20 border rounded-[20px] !w-[100%] justify-end" style={{ marginBottom: '10px', paddingTop: '10px', paddingBottom: '10px' }}>
                      <span className="text-[18px] text-blue-300 whitespace-nowrap" style={{ marginRight: '30px' }}>
                        {selectedUsers.length} kullanıcı seçildi ▶
                      </span>
                      <select
                        value={bulkLeaderId}
                        onChange={(e) => setBulkLeaderId(e.target.value)}
                        style={{ paddingLeft: '5px', marginRight: '30px' }}
                        className="rounded border border-white/10 bg-white/5 !py-2 !text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 !h-[35px] !w-[50%]"
                      >
                        <option value="">Lider Seçin</option>
                        <option value="remove">Lideri Kaldır</option>
                        {Array.isArray(users) && users
                          .filter(u => u.role === 'team_leader' || u.role === 'admin')
                          .map(leader => (
                            <option key={`bulk-${leader.id}`} value={leader.id}>
                              {leader.name} ({getRoleText(leader.role)})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!bulkLeaderId) return;
                          const leaderId = bulkLeaderId === 'remove' ? null : parseInt(bulkLeaderId);
                          const leaderName = bulkLeaderId === 'remove' ? 'Lideri Kaldır' :
                            users.find(u => u.id === leaderId)?.name || 'Bilinmeyen';
                          if (!confirm(`${selectedUsers.length} kullanıcıya "${leaderName}" lider olarak atanacak. Devam etmek istiyor musunuz?`)) {
                            return;
                          }
                          try {
                            setLoading(true);
                            let successCount = 0;
                            let errorCount = 0;

                            for (const userId of selectedUsers) {
                              try {
                                await updateUserAdmin(userId, { leader_id: leaderId });
                                successCount++;
                              } catch (err) {
                                console.error(`User ${userId} update error:`, err);
                                errorCount++;
                              }
                            }

                            if (successCount > 0) {
                              addNotification(`${successCount} kullanıcı güncellendi`, 'success');
                              await loadUsers();
                            }
                            if (errorCount > 0) {
                              addNotification(`${errorCount} kullanıcı güncellenemedi`, 'error');
                            }

                            setSelectedUsers([]);
                            setBulkLeaderId('');
                          } catch (err) {
                            console.error('Bulk update error:', err);
                            addNotification('Toplu güncelleme başarısız', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={!bulkLeaderId}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm"
                        style={{ marginRight: '20px' }}
                      >
                        Uygula
                      </button>
                      <span className="!px-3"></span>
                      <button
                        onClick={() => { setSelectedUsers([]); setBulkLeaderId(''); }}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm"
                        style={{ marginRight: '20px' }}
                      >
                        İptal
                      </button>
                    </div>
                  </div>

                  <div className="sticky bottom-0 w-full bg-[#0b1625]/90 backdrop-blur px-8 py-5"></div>
                  {user?.role === 'admin' ? (
                    <div className="space-y-3">
                      {Array.isArray(users) && users
                        .filter(u => {
                          // Arama terimi filtresi
                          if (userSearchTerm) {
                            const searchTerm = userSearchTerm.toLowerCase();
                            const matchesSearch = (
                              u.name?.toLowerCase().includes(searchTerm) ||
                              u.email?.toLowerCase().includes(searchTerm) ||
                              getRoleText(u.role)?.toLowerCase().includes(searchTerm)
                            );
                            if (!matchesSearch) return false;
                          }
                          return true;
                        })
                        .map((u) => {
                          const hasResetRequest = passwordResetRequests.some(req => req.user_id === u.id);
                          return (
                            <div
                              key={u.id}
                              className="bg-white/5 rounded-lg px-4 py-4 gap-4 hover:bg-white/10 transition-colors"
                              style={hasResetRequest ? { border: '2px solid red' } : { border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex text-[16px] items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(u.id)}
                                    disabled={u.role === 'admin' || u.role === 'team_leader' || u.role === 'observer'}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUsers(prev => [...prev, u.id]);
                                      } else {
                                        setSelectedUsers(prev => prev.filter(id => id !== u.id));
                                      }
                                    }}
                                    className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ${u.role === 'admin' || u.role === 'team_leader' || u.role === 'observer'
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'cursor-pointer'
                                      }`}
                                    style={{ scale: '3', marginLeft: '15px', marginRight: '20px' }}
                                  />
                                  <div>
                                    <div className="text-base font-medium truncate text-white">{u.name}</div>
                                    <div className="text-xs text-gray-400 truncate mt-1">{u.email}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {(u.role === 'team_member') && (
                                    <select
                                      className="!text-[16px] rounded px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={u.leader_id || ''}
                                      onChange={async (e) => {
                                        const val = e.target.value ? parseInt(e.target.value) : null;
                                        try {
                                          await updateUserAdmin(u.id, { leader_id: val });
                                          addNotification('Lider ataması güncellendi', 'success');
                                          await loadUsers();
                                        } catch (err) {
                                          console.error('Leader assign error:', err);
                                          addNotification(err?.response?.data?.message || 'Lider atanamadı', 'error');
                                        }
                                      }}
                                      style={{ padding: '5px' }}
                                    >
                                      <option value="">Lider Yok</option>
                                      {Array.isArray(users) && users.filter(x => x.role === 'team_leader' || x.role === 'admin').map(l => (
                                        <option key={`ldr-${l.id}`} value={l.id}>{l.name} ({getRoleText(l.role)})</option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    className="text-xs rounded px-3 py-2 transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={async () => {
                                      if (!confirm(`${u.name} kullanıcısının şifresini "123456" olarak sıfırlamak istediğinizden emin misiniz?`)) return;

                                      try {
                                        setLoading(true);
                                        await PasswordReset.adminResetPassword(u.id, '123456');
                                        addNotification('Şifre başarıyla "123456" olarak sıfırlandı', 'success');
                                        await loadPasswordResetRequests();
                                      } catch (err) {
                                        console.error('Admin reset password error:', err);
                                        addNotification(err.response?.data?.message || 'Şifre sıfırlanamadı', 'error');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    style={{ marginLeft: '10px' }}
                                  >
                                    ⟳
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <select
                                      className="text-[16px] rounded px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={u.role}
                                      onChange={async (e) => { try { await updateUserAdmin(u.id, { role: e.target.value }); addNotification('Rol güncellendi', 'success'); await loadUsers(); } catch { addNotification('Güncellenemedi', 'error'); } }}
                                      style={{ padding: '5px', marginLeft: '10px' }}
                                    >
                                      <option value="admin">Yönetici</option>
                                      <option value="team_leader">Takım Lideri</option>
                                      <option value="team_member">Takım Üyesi</option>
                                      <option value="observer">Gözlemci</option>
                                    </select>
                                  </div>
                                  <button className="text-xs rounded bg-rose-600 hover:bg-rose-700 transition-colors"
                                    onClick={async () => {
                                      if (!confirm('Silinsin mi?')) return; try {
                                        await deleteUserAdmin(u.id);
                                        addNotification('Kullanıcı silindi', 'success');
                                        await loadUsers();
                                      }
                                      catch (err) {
                                        console.error('Delete user error:', err);
                                        addNotification('Silinemedi', 'error');
                                      }
                                    }}
                                    style={{ marginLeft: '10px' }}
                                  >X</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      {Array.isArray(users) && users.filter(u => {
                        // Arama terimi filtresi
                        if (userSearchTerm) {
                          const searchTerm = userSearchTerm.toLowerCase();
                          const matchesSearch = (
                            u.name?.toLowerCase().includes(searchTerm) ||
                            u.email?.toLowerCase().includes(searchTerm) ||
                            getRoleText(u.role)?.toLowerCase().includes(searchTerm)
                          );
                          if (!matchesSearch) return false;
                        }
                        // Lider filtresi
                        return true;
                      }).length === 0 && userSearchTerm && (
                          <div className="text-center py-4 text-gray-400">
                            {userSearchTerm ? `"${userSearchTerm}" için kullanıcı bulunamadı` : 'Seçilen filtreye uygun kullanıcı bulunamadı'}
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400">Yalnızca admin kullanıcı listesi görüntüler.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {
        error && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
          </div>
        )
      }
    </div>
  );
}
export default App;
