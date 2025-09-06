import React, { useEffect, useState, useRef } from 'react';
import { login, restore, getUser, getUsers, Tasks, Notifications, registerUser, updateUserAdmin, deleteUserAdmin, changePassword, forgotPassword, resetPassword, apiOrigin, PasswordReset } from './api';
import { api } from './api';
import './App.css'
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import logo from './assets/logo.svg';


function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskHistories, setTaskHistories] = useState({});
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const bellRef = useRef(null);
  const notifPanelRef = useRef(null);
  const [notifPos, setNotifPos] = useState({ top: 64, right: 16 });
  const badgeCount = Array.isArray(notifications)
    ? notifications.filter(n => !n.isFrontendNotification && !n.read_at).length
    : 0;
  const [historyDeleteMode, setHistoryDeleteMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: '' });
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('all');
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);

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
  const assigneeOpenRef = useRef(false);
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
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Otomatik doldurmayı engelle
  useEffect(() => {
    const preventAutofill = () => {
      // Tüm input alanlarını bul
      const inputs = document.querySelectorAll('input');

      inputs.forEach(input => {
        // Otomatik doldurma özelliklerini kaldır
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-form-type', 'other');

        // Şifre alanları için özel işlem
        if (input.type === 'password') {
          input.setAttribute('autocomplete', 'new-password');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        // Arama alanları için özel işlem
        if (input.placeholder && (input.placeholder.includes('ara') || input.placeholder.includes('search'))) {
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        // Otomatik doldurma olaylarını engelle
        input.addEventListener('focus', (e) => {
          e.target.setAttribute('autocomplete', 'off');
          e.target.setAttribute('data-lpignore', 'true');
        });

        input.addEventListener('input', (e) => {
          // Eğer otomatik doldurma tespit edilirse, değeri temizle
          if (e.target.value && !e.isTrusted) {
            e.target.value = '';
          }
        });

        // Otomatik doldurma olaylarını engelle
        input.addEventListener('animationstart', (e) => {
          if (e.animationName === 'onAutoFillStart') {
            e.target.value = '';
          }
        });
      });
    };

    // Sayfa yüklendiğinde çalıştır
    preventAutofill();

    // Her 50ms'de bir kontrol et (daha sık)
    const interval = setInterval(preventAutofill, 50);

    // Cleanup
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
  }, [showDetailModal, selectedTask, descDraft, user?.role]);

  useEffect(() => {
    if (showDetailModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showDetailModal]);

  async function checkAuth() {
    try {
      setLoading(true);
      console.log('🔍 Checking authentication...');
      console.log('🌐 API Base URL:', api.defaults.baseURL);
      const isAuthenticated = await restore();
      if (isAuthenticated) {
        try {
          const userData = await getUser();
          setUser(userData);
          await Promise.all([
            loadTasks(),
            loadUsers(),
            loadNotifications()
          ]);
        } catch (err) {
          console.error('User fetch error:', err);
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setError('Oturum kontrolü başarısız');
    } finally {
      setLoading(false);
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
          const comboboxOpen = assigneeOpenRef.current === true;
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
            } else {
            }
          }
        }
      }
    } catch (e) {
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
  }, [user?.id]);

  async function loadUsers() {
    try {
      const usersList = await getUsers();
      setUsers(usersList);
    } catch (err) {
      console.error('Users load error:', err);
      setUsers([]);
    }
  }

  async function loadPasswordResetRequests() {
    try {
      if (user?.role === 'admin') {
        console.log('Loading password reset requests...');
        const requests = await PasswordReset.getResetRequests();
        console.log('Password reset requests loaded:', requests);
        setPasswordResetRequests(requests);
      }
    } catch (err) {
      console.error('Load password reset requests error:', err);
      // Hata durumunda boş array set et
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
      }));

      list = list.filter(n => !n.read_at);
      
      // Şifre sıfırlandı bildirimlerini filtrele (mantıksız çünkü kullanıcı zaten giriş yapmış)
      list = list.filter(n => {
        const message = n.message || '';
        return !message.includes('Şifreniz admin tarafından sıfırlandı');
      });

      setNotifications(list);
      
      // Bildirimler yüklendikten sonra şifre sıfırlama taleplerini de yükle
      if (user?.role === 'admin') {
        await loadPasswordResetRequests();
      }
    } catch (err) {
      console.error('Notifications load error:', err);
      if (err.response?.status === 401) {
        console.warn('Unauthorized notification access, clearing notifications');
      } else if (err.response?.status === 404) {
        console.warn('Notifications endpoint not found');
      } else {
        console.error('Unexpected notification error:', err.message);
      }
      setNotifications([]);
    }
  }


  async function doLogin() {
    try {
      setLoading(true);
      setError(null);

      const u = await login(loginForm.email, loginForm.password);
      setUser(u);

      addNotification('Başarıyla giriş yapıldı', 'success');
      await Promise.all([
        loadTasks(),
        loadUsers(),
        loadNotifications(),
        loadPasswordResetRequests()
      ]);
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
    setUser(null);
    setTasks([]);
    setError(null);
    setSelectedTask(null);
  }

  function validateDates(startDate, endDate) {
    if (!startDate || !endDate) {
      return { isValid: true };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return {
        isValid: false,
        message: 'Bitiş tarihi başlangıç tarihinden önce olamaz!'
      };
    }

    return { isValid: true };
  }

  async function handleAddTask() {
    try {
      setLoading(true);
      setError(null);

      const dateValidation = validateDates(newTask.start_date, newTask.due_date);
      if (!dateValidation.isValid) {
        setError(dateValidation.message);
        setLoading(false);
        return;
      }

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
          headers: { 'Content-Type': 'multipart/form-data' }
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

      // Bildirimleri yenile
      await loadNotifications();

      resetNewTask();
      setShowAddForm(false);
    } catch (err) {
      console.error('Add task error:', err);
      setError('Görev eklenemedi');
      addNotification('Görev eklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTask(taskId, updates) {
    try {
      setLoading(true);
      setError(null);

      if (updates.start_date !== undefined || updates.due_date !== undefined) {
        const currentTask = tasks.find(t => t.id === taskId);
        const startDate = updates.start_date !== undefined ? updates.start_date : currentTask?.start_date;
        const dueDate = updates.due_date !== undefined ? updates.due_date : currentTask?.due_date;

        const dateValidation = validateDates(startDate, dueDate);
        if (!dateValidation.isValid) {
          setError(dateValidation.message);
          setLoading(false);
          return;
        }
      }

      const response = await Tasks.update(taskId, updates);
      const updatedTask = response.task || response;

      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return currentTasks.map(task =>
          task.id === taskId ? updatedTask : task
        );
      });

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updatedTask);
        // Görev güncellendiğinde geçmişi de yenile
        try {
          const history = await Tasks.getHistory(taskId);
          setTaskHistory(Array.isArray(history) ? history : []);
        } catch (err) {
          console.error('Task history refresh error:', err);
        }
      }

      // Tooltip için taskHistories state'ini de güncelle
      try {
        const history = await Tasks.getHistory(taskId);
        setTaskHistories(prev => ({
          ...prev,
          [taskId]: Array.isArray(history) ? history : []
        }));
      } catch (err) {
        console.error('Task histories update error:', err);
      }

      addNotification('Görev başarıyla güncellendi', 'success');
      return response;
    } catch (err) {
      console.error('Update task error:', err);
      setError('Görev güncellenemedi');
      addNotification('Görev güncellenemedi', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('Bu görevi iptal etmek istediğinizden emin misiniz? (Görev silinmeyecek, sadece iptal edilecek)')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await handleUpdateTask(taskId, { status: 'cancelled' });

      addNotification('Görev başarıyla iptal edildi', 'success');
    } catch (err) {
      console.error('Delete task error:', err);
      setError('Görev iptal edilemedi');
      addNotification('Görev iptal edilemedi', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePermanentDelete(taskId) {
    if (!window.confirm('Bu görevi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await Tasks.delete(taskId);

      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return currentTasks.filter(task => task.id !== taskId);
      });

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
        setShowDetailModal(false);
      }

      addNotification('Görev kalıcı olarak silindi', 'success');
    } catch (err) {
      console.error('Permanent delete task error:', err);
      setError('Görev silinemedi');
      addNotification('Görev silinemedi', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    await handleUpdateTask(taskId, { status: newStatus });
  }

  async function handleDateChange(taskId, field, newDate) {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const startDate = field === 'start_date' ? newDate : currentTask.start_date;
    const dueDate = field === 'due_date' ? newDate : currentTask.due_date;

    const dateValidation = validateDates(startDate, dueDate);
    if (!dateValidation.isValid) {
      setError(dateValidation.message);
      return;
    }

    await handleUpdateTask(taskId, { [field]: newDate });
  }

  async function handleTaskClick(task) {
    setSelectedTask(task);
    setShowDetailModal(true);

    try {
      const history = await Tasks.getHistory(task.id);
      setTaskHistory(Array.isArray(history) ? history : []);

    } catch (err) {
      console.error('Task history load error:', err);
      if (err.response?.status === 404) {
        console.warn('Task history not found for task:', task.id);
      } else if (err.response?.status === 403) {
        console.warn('Access denied to task history for task:', task.id);
      }
      setTaskHistory([]);
      setComments([]);
    }
  }

  async function handleCloseModal() {
    if (selectedTask && descDraft !== (selectedTask.description ?? '') && user?.role === 'admin') {
      try {
        await handleUpdateTask(selectedTask.id, { description: descDraft ?? '' });
        addNotification('Değişiklikler kaydedildi', 'success');
      } catch (error) {
        console.error('Auto-save error:', error);
        addNotification('Değişiklikler kaydedilemedi', 'error');
      }
    }

    setShowDetailModal(false);
    setSelectedTask(null);
    setNewComment('');
    setHistoryDeleteMode(false);
  }



  async function handleAddComment() {
    const text = newComment.trim();
    if (!text || !selectedTask) return;

    try {
      const res = await Tasks.comment(selectedTask.id, text);
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

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      addNotification('Bağlantı kopyalandı', 'success');
    } catch (e) {
      addNotification('Kopyalama başarısız', 'error');
    }
  }

  function buildTaskShareText(task) {
    const base = `Görev #${task?.id ?? ''} - ${task?.title ?? ''}`.trim();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    return `${base}\nKaynak: ${url}`;
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
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatDateOnly(dateLike) {
    if (!dateLike) return '-';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  function getLastAddedDescription(taskHistory) {
    if (!Array.isArray(taskHistory) || taskHistory.length === 0) {
      return 'Henüz açıklama eklenmemiş';
    }

    // Sadece comment field'ı olan yorumları al
    const comments = taskHistory.filter(h => h.field === 'comment' && h.new_value && h.new_value.trim().length > 0);

    if (comments.length > 0) {
      // En son yorumu al
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

  function formatRelativeTime(dateLike) {
    if (!dateLike) return 'Bilinmiyor';
    try {
      const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
      if (Number.isNaN(date.getTime())) return 'Bilinmiyor';
      const now = new Date();
      const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      if (diffInDays === 0) return 'Bugün';
      if (diffInDays === 1) return 'Dün';
      if (diffInDays < 7) return `${diffInDays} gün önce`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} hafta önce`;
      return `${Math.floor(diffInDays / 30)} ay önce`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Bilinmiyor';
    }
  }

  function toInputDT(value) {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  }

  function toISO(localDTString) {
    if (!localDTString) return '';
    const d = new Date(localDTString);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
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
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const userRows = jsonData.slice(1).filter(row => row.length >= 4);

          const users = userRows.map((row, index) => {
            const [name, email, role, password] = row;

            const validRoles = ['admin', 'team_leader', 'team_member', 'observer'];
            const validRole = validRoles.includes(role?.toLowerCase()) ? role.toLowerCase() : 'team_member';

            return {
              name: name?.toString().trim() || '',
              email: email?.toString().trim() || '',
              role: validRole,
              password: password?.toString().trim() || '123456',
              rowIndex: index + 2
            };
          }).filter(user => user.name && user.email);

          resolve(users);
        } catch (error) {
          reject(new Error('Excel dosyası okunamadı: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsArrayBuffer(file);
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
          await registerUser({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            password_confirmation: userData.password,
            role: userData.role
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
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" placeholder="Mevcut şifre" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" placeholder="Yeni şifre" value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" placeholder="Yeni şifre (tekrar)" value={form.again} onChange={e => setForm({ ...form, again: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
        <button disabled={!can} className="w-full rounded px-4 py-3 bg-green-600 hover:bg-green-700 !text-[20px]" onClick={async () => { try { await changePassword(form.current, form.next); onDone?.(); setForm({ current: '', next: '', again: '' }); } catch (err) { console.error('Password change error:', err); addNotification('Şifre güncellenemedi', 'error'); } }}>Güncelle</button>
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
          <label className="block font-medium text-neutral-300 !text-[24px]">
            Mevcut Şifre
          </label>
          {/* Gizli input alanları otomatik doldurmayı engellemek için */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" />
          <input type="password" style={{ display: 'none' }} autoComplete="current-password" />
          <input
            type="password"
            className="w-full border border-white/20 bg-white/10 text-white !text-[24px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-6 py-4"
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
          />
        </div>

        <div className="space-y-6">
          <label className="block font-medium text-neutral-300 !text-[24px]">
            Yeni Şifre
          </label>
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
          />
        </div>

        <div className="space-y-6">
          <label className="block font-medium text-neutral-300 !text-[24px]">
            Yeni Şifre (Tekrar)
          </label>
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
        <div className="border-b border-white/10 pb-4">
          <div className="space-y-4">
            <input className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400" placeholder="İsim" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input type="email" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400" placeholder="E-posta" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400" placeholder="Şifre" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
            <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400" placeholder="Şifre (tekrar)" value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
            <select className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="admin" className="bg-gray-800 text-white">Yönetici</option>
              <option value="team_leader" className="bg-gray-800 text-white">Takım Lideri</option>
              <option value="team_member" className="bg-gray-800 text-white">Takım Üyesi</option>
              <option value="observer" className="bg-gray-800 text-white">Gözlemci</option>
            </select>
            <button className="w-full rounded px-4 py-3 bg-green-600 hover:bg-green-700 !text-[20px]" onClick={async () => {
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

        <div className="border-b border-white/10 pb-4">
          <h4 className="!text-[18px] font-medium text-white mb-4">Excel'den Toplu Kullanıcı Ekle</h4>

          <div className="space-y-4">
            <div className="bg-blue-900/20 border-blue-500/30 rounded-lg p-4">
              <div className="!text-[16px] text-blue-200 space-y-1">
                <div className="mt-3 !text-[16px] text-blue-300">
                  İlk satır başlık olarak kabul edilir, veriler 2. satırdan başlar.
                </div>
                <div>• A2: Kullanıcı Adı Soyadı</div>
                <div>• B2: E-posta Adresi</div>
                <div>• C2: Rol (admin/team_leader/team_member/observer)</div>
                <div>• D2: Şifre (boşsa varsayılan: 123456)</div>
              </div>
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
              className="w-full !text-[18px] text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[16px] file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-colors"
            />

            <div className="!text-[16px] text-gray-400" style={{ paddingBottom: '10px' }}>
              Excel dosyası seçin (.xlsx veya .xls formatında)
            </div>
          </div>
        </div>
      </div>
    );
  }

  function AssigneeMultiSelect({ allUsers, selected, onChange, responsibleId = null }) {
    const boxRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selectedIds = new Set((selected || []).map(u => u.id));
    const eligibleUsers = getEligibleAssignedUsers(responsibleId);
    const all = Array.isArray(eligibleUsers) ? eligibleUsers : [];
    const q = query.trim().toLowerCase();
    const predicate = (u) => {
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    };
    const filteredSelected = all.filter(predicate).filter(u => selectedIds.has(u.id));
    const filteredOthers = all.filter(predicate).filter(u => !selectedIds.has(u.id));

    useEffect(() => {
      const onDown = (e) => {
        if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }, []);

    useEffect(() => { assigneeOpenRef.current = open; }, [open]);

    function removeOne(id) {
      const next = (selected || []).map(u => u.id).filter(x => x !== id);
      onChange(next);
    }

    function toggleOne(id) {
      const cur = new Set((selected || []).map(u => u.id));
      if (cur.has(id)) cur.delete(id); else cur.add(id);
      onChange(Array.from(cur));
    }

    function clearAll() {
      onChange([]);
    }

    return (
      <div ref={boxRef} className="relative w-full ">
        <div
          className="min-h-[56px] w-full rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 py-2 flex flex-wrap items-center gap-2 text-slate-100 focus-within:ring-2 focus-within:ring-sky-500/40 focus-within:border-sky-500/40"
          onClick={() => setOpen(true)}
        >
          {(selected || []).map(u => (
            <span key={u.id} className="inline-flex items-center !text-[18px] gap-1 rounded-full bg-white/10 border border-white/10 px-2 py-1 text-[11px] shrink-0 text-slate-100" style={{ padding: '0px 10px 0px 10px' }}>
              {u.name}
            </span>
          ))}
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder=""
            className="flex-1 !min-w-[1px] bg-transparent py-2 text-slate-100 placeholder:text-neutral-400 caret-white border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none focus:shadow-none appearance-none"
          />

          <button className="text-neutral-300 rounded px-1 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}>▾</button>
        </div>

        {open && (
          <div className="absolute z-[100300] mt-1 w-full max-h-72 overflow-auto rounded-md border border-white/10 bg-[#0f172a] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-[#0f172a] border-b border-white/10">
              <div className="!text-[18px] text-neutral-300">• Seçili: {selectedIds.size}</div>
              {selectedIds.size > 0 && (
                <button className="text-xs rounded px-2 py-1 bg-white/10 hover:bg-white/20" onClick={(e) => { e.stopPropagation(); clearAll(); }}>Tümünü kaldır</button>
              )}
            </div>

            {filteredSelected.length > 0 && (
              <div className="px-3 pt-2 pb-1 !text-[18px] text-neutral-400"></div>
            )}
            {filteredSelected.map(u => (
              <div key={u.id} className="px-3 py-2 !text-[18px] flex items-center justify-between gap-2 bg-blue-900/20 hover:bg-blue-900/30">
                <label className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleOne(u.id)}>
                  <input type="checkbox" checked readOnly className="accent-sky-500" />
                  <span className="text-[18px]">{u.name}</span>
                </label>
                <button className="text-neutral-300 hover:text-white text-sm" title="Kaldır" onClick={(e) => { e.stopPropagation(); removeOne(u.id); }}>×</button>
              </div>
            ))}

            {filteredOthers.length > 0 && (
              <div className="px-3 pt-2 pb-1 text-[24px] text-neutral-400">Kullanıcılar</div>
            )}
            {filteredOthers.length === 0 && filteredSelected.length === 0 && (
              <div className="px-3 py-2 !text-[32px] text-neutral-400">Sonuç yok</div>
            )}
            {filteredOthers.map(u => (
              <div key={u.id} className="px-3 py-2 !text-[24px] flex items-center gap-2 cursor-pointer hover:bg-white/10" onClick={() => toggleOne(u.id)}>
                <input type="checkbox" checked={false} readOnly className="accent-sky-500" />
                <span className="text-[24px] text-slate-100">{u.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }


  let filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
    // Durum filtresi
    if (activeTab === 'active' && (task.status === 'completed' || task.status === 'cancelled')) {
      return false;
    }
    if (activeTab === 'completed' && task.status !== 'completed') {
      return false;
    }
    if (activeTab === 'deleted' && task.status !== 'cancelled') {
      return false;
    }

    // Görev türü filtresi
    if (selectedTaskType !== 'all' && task.task_type !== selectedTaskType) {
      return false;
    }

    // Arama filtresi
    const q = lowerSafe(searchTerm);
    if (!q) return true;
    const title = lowerSafe(task?.title);
    const desc = lowerSafe(task?.description);
    return title.includes(q) || desc.includes(q);
  }) : [];

  if (Array.isArray(filteredTasks) && sortConfig?.key) {
    const key = sortConfig.key;
    const dir = sortConfig.dir === 'asc' ? 1 : -1;
    filteredTasks = [...filteredTasks].sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];
      if (key === 'id') {
        const at = Number(a?.id) || 0;
        const bt = Number(b?.id) || 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      } else if (key === 'start_date' || key === 'due_date' || key === 'end_date') {
        const at = av ? new Date(av).getTime() : 0;
        const bt = bv ? new Date(bv).getTime() : 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      } else if (key === 'priority') {
        const map = { low: 1, medium: 2, high: 3, critical: 4 };
        const at = map[a?.priority] ?? 0;
        const bt = map[b?.priority] ?? 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      } else if (key === 'status') {
        const order = { waiting: 1, in_progress: 2, investigating: 3, completed: 4, cancelled: 5 };
        const at = order[a?.status] ?? 0;
        const bt = order[b?.status] ?? 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      } else if (key === 'responsible_name') {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
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
                const result = await PasswordReset.requestReset(loginForm.email);
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
                ? (showForgotPassword ? 'Kod Gönderiliyor...' : 'Giriş yapılıyor...')
                : (showForgotPassword ? 'Kodu Gönder' : 'Giriş Yap')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 xs:h-16 sm:h-18 lg:h-20">
            <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 lg:space-x-6">
              <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-3">
                <div className="flex items-center bg-white rounded-lg p-1 shadow-sm">
                  <img
                    src={logo}
                    alt="Vaden Logo"
                    style={{ width: '200px', height: '100px' }}
                    className="!w-8 !h-8 xs:!w-10 xs:!h-10 sm:!w-12 sm:!h-12"
                    onLoad={() => { }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 xs:space-x-2 sm:space-x-3 lg:space-x-4">
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
                    <hr className="my-1" />
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
                  <div className="fixed inset-0 z-[9998] bg-black/80"
                    onClick={() => setShowNotifications(false)} />

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
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0" style={{ padding: '10px' }}>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-neutral-100">Bildirimler</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => { try { await Notifications.markAllAsRead(); await loadNotifications(); } catch (err) { console.error('Mark all notifications error:', err); addNotification('İşlem başarısız', 'error'); } }}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-blue-300 border border-blue-400/40 bg-blue-500/10"
                          >
                            Tümünü okundu yap
                          </button>
                        </div>
                      </div>

                      <div className="overflow-y-auto notification-scrollbar flex-1 min-h-0" style={{ padding: '10px' }}>
                        {(!Array.isArray(notifications) || notifications.length === 0) ? (
                          <div className="p-4 text-center text-neutral-400">Bildirim bulunmuyor</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-3 border-b border-white/10 last:border-b-0 ${n.read_at ? 'bg-white/5' : 'bg-blue-500/10'} hover:bg-white/10 transition-colors`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm text-white">{n.message}</p>
                                  <p className="text-xs text-neutral-400 mt-1">{formatDate(n.created_at)}</p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  {!n.read_at && (
                                    <button
                                      onClick={async () => {
                                        try { await Notifications.markAsRead(n.id); await loadNotifications(); }
                                        catch (err) { console.error('Mark notification error:', err); addNotification('Bildirim işaretlenemedi', 'error'); }
                                      }}
                                      className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded hover:bg-blue-500/20 transition-colors"
                                      title="Okundu olarak işaretle"
                                    >✓</button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      try { await Notifications.delete(n.id); await loadNotifications(); addNotification('Bildirim silindi', 'success'); }
                                      catch (err) { console.error('Delete notification error:', err); addNotification('Bildirim silinemedi', 'error'); }
                                    }}
                                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                                    title="Bildirimi sil"
                                  >🗑️</button>
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
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[100300]">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 1)' }}
            onClick={() => {
              setShowAddForm(false);
              resetNewTask();
            }}
          />
          <div className="relative z-10 flex items-center justify-center p-2 sm:p-4 min-h-full">
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1400px] max-h-[100vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden">
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
              <div className="overflow-y-auto flex flex-col gap-4 sm:gap-6" style={{ height: 'auto', maxHeight: 'calc(95vh - 80px)', padding: '20px 20px 20px 20px' }}>
                {/* Error Display */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-4">
                    {error}
                  </div>
                )}
                <br />
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Görev Başlığı</label>
                  <input
                    type="text"
                    placeholder="Görev başlığını girin..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border shadow-sm"
                    style={{ minHeight: '48px' }}
                  />
                </div>
                <br />
                {/* Öncelik */}
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Öncelik</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minHeight: '48px' }}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>
                <br />
                {/* Görev Türü */}
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Görev Türü</label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {/* Durum */}
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Durum</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {/* Sorumlu */}
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Sorumlu</label>
                  <select
                    value={newTask.responsible_id || ''}
                    onChange={(e) => setNewTask({ ...newTask, responsible_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {/* Tarihler */}
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
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
                {/* Atananlar */}
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-start">
                  <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">Atananlar</label>
                  <div className="w-full border border-gray-300 rounded-md p-3 sm:p-4 bg-white" style={{ minHeight: '48px', height: 'fit-content' }}>
                    {/* Seçilen kullanıcılar */}
                    {newTask.assigned_users.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {newTask.assigned_users.map((userId, index) => {
                          const user = users.find(u => u.id === userId);
                          return (
                            <span key={userId} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {user?.name || 'Bilinmeyen Kullanıcı'}
                              <button
                                onClick={() => setNewTask({
                                  ...newTask,
                                  assigned_users: newTask.assigned_users.filter(id => id !== userId)
                                })}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Kullanıcı arama ve seçme - Combobox */}
                    <div className="relative z-[2147483647]">
                      <input
                        type="text"
                        placeholder="Kullanıcı atayın..."
                        value={assigneeSearch}
                        className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                      {/* Dropdown */}
                      {showAssigneeDropdown && users && users.length > 0 && (
                        <div
                          className="absolute w-full mt-1 border-2 border-gray-400 rounded-md shadow-xl max-h-60 overflow-y-auto bg-white"
                          style={{
                            backgroundColor: '#ffffff',
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
                                className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-blue-50 cursor-pointer text-[24px] sm:text-[24px] text-gray-900 border-b border-gray-200 last:border-b-0 text-left"
                                style={{ backgroundColor: 'gray' }}
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
                {/* Dosyalar */}
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-start">
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
                <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-start">
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
                    disabled={loading || !newTask.title}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-md transition-colors !text-[16px] sm:!text-[24px] font-medium"
                  >
                    {loading ? 'Ekleniyor...' : 'Ekle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white">
        <div className="px-2 xs:px-3 sm:px-4 lg:px-6">
          <h2 className="text-xs xs:text-sm sm:text-base lg:text-lg font-semibold text-gray-900 py-2 xs:py-3 sm:py-4 border-b border-gray-200">
            Görev Takip Sistemi
          </h2>

          <div className="flex items-center space-x-3 border-b border-gray-200 pb-3 overflow-x-auto">
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
            >
              Tamamlanan ({taskCounts.completed})
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'deleted'
                ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-transparent'
                }`}
            >
              İptal ({taskCounts.deleted})
            </button>

            {/* Görev Türü Filtresi */}
            <div className="relative">
              <select
                value={selectedTaskType}
                onChange={(e) => setSelectedTaskType(e.target.value)}
                className="px-3 xs:px-4 sm:px-4 py-2.5 text-xs xs:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm appearance-none cursor-pointer"
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
                className="w-48 xs:w-56 sm:w-64 px-4 py-2.5 text-xs xs:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                style={{ height: '30px' }}
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
                  // Otomatik doldurma tespit edilirse temizle
                  if (e.target.value && !e.isTrusted) {
                    e.target.value = '';
                    setSearchTerm('');
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-b border-gray-200 min-w-[400px]">
          <div className="grid grid-cols-[180px_100px_100px_220px_140px_140px_120px_80px_100px] gap-0 px-2 xs:px-3 sm:px-4 lg:px-6 pt-2 xs:pt-3 text-xs xs:text-sm font-medium text-gray-500 uppercase tracking-wider">
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
            <button className="flex items-center justify-center px-2">
              <span>Güncel Durum</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="grid grid-cols-[180px_100px_100px_220px_140px_140px_120px_80px_100px] gap-0 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-5 hover:bg-gray-50 cursor-pointer transition-colors"
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
                    color: getPriorityColor(task.priority)
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
                    color: getTaskTypeColor(task.task_type)
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
                {task.assigned_users?.length > 0
                  ? task.assigned_users.map(u => u.name).join(', ')
                  : '-'
                }
              </div>
              <div className="px-2 text-xs xs:text-sm text-gray-900">
                {task.attachments?.length > 0 ? `${task.attachments.length} dosya` : '-'}
              </div>
              <div className="px-2 flex justify-center items-center">
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
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-6 xs:py-8 sm:py-10 lg:py-12">
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
        )}
      </div>

      {showDetailModal && selectedTask && createPortal(
        <div className="fixed inset-0 z-[100100]">
          <div className="absolute inset-0 bg-black/70" onClick={handleCloseModal} />

          <div className="relative z-10 flex min-h-full items-center justify-center p-2 sm:p-4">
            <div
              className="
                fixed z-[100100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                w-[95vw] max-w-[1600px]
                max-h-[90vh] rounded-2xl border border-white/10 box-border
                shadow-[0_25px_80px_rgba(0,0,0,.6)] flex flex-col overflow-hidden
              "
              style={{ backgroundColor: '#111827', color: '#e5e7eb' }}
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
                <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden" style={{ padding: '0px 24px' }}>
                  <div className="py-6 flex flex-col gap-4 sm:gap-6 min-h-[calc(105vh-280px)]">
                    {/* Error Display */}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-4">
                        {error}
                      </div>
                    )}
                    {/* ID */}
                    <br />
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        ID
                      </label>
                      <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                        {selectedTask.id ?? ""}
                      </div>
                    </div>
                    <br />
                    {/* Başlık */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Başlık
                      </label>
                      <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                        {selectedTask.title ?? ""}
                      </div>
                    </div>
                    <br />
                    {/* Durum */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Durum
                      </label>
                      {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.id === selectedTask.responsible?.id || user?.role === 'admin')) ? (
                        <select
                          value={selectedTask.status || 'waiting'}
                          onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                          className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ minHeight: '24px' }}
                        >
                          <option value="waiting">Bekliyor</option>
                          <option value="in_progress">Devam Ediyor</option>
                          <option value="investigating">Araştırılıyor</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="cancelled">İptal</option>
                        </select>
                      ) : (
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                          {getStatusText(selectedTask.status)}
                        </div>
                      )}
                    </div>
                    <br />
                    {/* Öncelik */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Öncelik
                      </label>
                      {user?.role === 'admin' ? (
                        <select
                          value={selectedTask.priority || 'medium'}
                          onChange={async (e) => {
                            const val = e.target.value;
                            try { await handleUpdateTask(selectedTask.id, { priority: val }); } catch { }
                          }}
                          className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ minHeight: '24px' }}
                        >
                          <option value="low">Düşük</option>
                          <option value="medium">Orta</option>
                          <option value="high">Yüksek</option>
                          <option value="critical">Kritik</option>
                        </select>
                      ) : (
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                          {getPriorityText(selectedTask.priority)}
                        </div>
                      )}
                    </div>
                    <br />
                    {/* Görev Türü */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Görev Türü
                      </label>
                      {user?.role === 'admin' ? (
                        <select
                          value={selectedTask.task_type || 'development'}
                          onChange={async (e) => {
                            const val = e.target.value;
                            try { await handleUpdateTask(selectedTask.id, { task_type: val }); } catch { }
                          }}
                          className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ minHeight: '24px' }}
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
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                          {getTaskTypeText(selectedTask.task_type)}
                        </div>
                      )}
                    </div>
                    <br />
                    {/* Sorumlu */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Sorumlu
                      </label>
                      {(user?.role === 'admin') ? (
                        <select
                          value={selectedTask.responsible?.id || ''}
                          onChange={async (e) => {
                            const rid = e.target.value ? parseInt(e.target.value) : null;
                            try { await handleUpdateTask(selectedTask.id, { responsible_id: rid }); } catch { }
                          }}
                          className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ minHeight: '24px' }}
                        >
                          <option value="">Seçin</option>
                          {getEligibleResponsibleUsers().map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                          {selectedTask.responsible?.name || 'Atanmamış'}
                        </div>
                      )}
                    </div>
                    <br />
                    {/* Oluşturan */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Oluşturan
                      </label>
                      <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                        {selectedTask.creator?.name || 'Bilinmiyor'}
                      </div>
                    </div>
                    <br />
                    {/* Atananlar */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-start">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Atananlar
                      </label>
                      <div className="w-full border border-gray-300 rounded-md p-3 sm:p-4 bg-white " style={{ minHeight: '24px', height: 'fit-content' }}>
                        {user?.role === 'admin' ? (
                          <AssigneeMultiSelect
                            allUsers={users}
                            selected={selectedTask.assigned_users || []}
                            responsibleId={selectedTask.responsible?.id}
                            onChange={async (ids) => {
                              try {
                                await Tasks.assignUsers(selectedTask.id, ids);
                                const t = await Tasks.get(selectedTask.id);
                                setSelectedTask(t.task || t);
                                addNotification('Atananlar güncellendi', 'success');
                              } catch {
                                addNotification('Güncellenemedi', 'error');
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full border border-gray-300 rounded-md p-3 sm:p-4 bg-white " style={{ minHeight: '24px', height: 'fit-content' }}>
                            {(selectedTask.assigned_users || []).length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {selectedTask.assigned_users.map(u => (
                                  <span key={u.id} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[24px]">
                                    {u.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <br />
                    {/* Dosyalar */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Dosyalar
                      </label>
                      <div className="w-full border !text-[18px] border-gray-300 rounded-md p-3 sm:p-4 bg-white" style={{ minHeight: '18px', height: 'fit-content', padding: '5px' }}>
                        {(user?.role === 'admin' || (user?.role === 'team_leader' && (user?.id === selectedTask.creator?.id || user?.id === selectedTask.responsible?.id))) ? (
                          <div className="space-y-3 !text-[18px]">
                            <input
                              type="file"
                              multiple
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;
                                try {
                                  await Tasks.uploadAttachments(selectedTask.id, files);
                                  const t = await Tasks.get(selectedTask.id);
                                  setSelectedTask(t.task || t);
                                  addNotification('Dosyalar yüklendi', 'success');
                                } catch {
                                  addNotification('Yükleme başarısız', 'error');
                                } finally {
                                  e.target.value = '';
                                }
                              }}
                              className="w-full !text-[18px] sm:!text-[24px] text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-[24px] sm:file:text-[24px] file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-colors"
                            />
                            <div className="space-y-1">
                              {(selectedTask.attachments || []).map(a => (
                                <div key={a.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1">
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
                                    className="text-red-600 hover:text-red-800 text-[16px] p-1 rounded hover:bg-red-50 ml-2"
                                    title="Dosyayı sil"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
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
                            {(selectedTask.attachments || []).length === 0 && <span className="text-gray-500 text-sm">-</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <br />
                    {/* Tarihler */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-slate-200 text-left">
                        Tarihler
                      </label>
                      <div className="flex flex-row gap-2 sm:gap-4">
                        <div className="flex-1">
                          <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1">Başlangıç</label>
                          {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.role === 'admin')) ? (
                            <input
                              type="date"
                              value={selectedTask.start_date ? selectedTask.start_date.slice(0, 10) : ''}
                              onChange={(e) => handleDateChange(selectedTask.id, 'start_date', e.target.value)}
                              className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ minHeight: '24px' }}
                            />
                          ) : (
                            <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                              {selectedTask.start_date ? formatDateOnly(selectedTask.start_date) : '-'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1">Bitiş</label>
                          {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.role === 'admin' || user?.role === 'team_leader')) ? (
                            <input
                              type="date"
                              value={selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : ''}
                              onChange={(e) => handleDateChange(selectedTask.id, 'due_date', e.target.value)}
                              className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ minHeight: '24px' }}
                            />
                          ) : (
                            <div className="w-full rounded-md px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] bg-white text-gray-900 flex items-center" style={{ minHeight: '24px' }}>
                              {selectedTask.due_date ? formatDateOnly(selectedTask.due_date) : '-'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <br />
                    {/* Açıklama */}
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[192px_1fr] gap-2 sm:gap-4 items-start">
                      <label className="!text-[24px] font-medium text-slate-200 text-left">
                        Görev Açıklaması
                      </label>
                      <div className="w-full">
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
                  <div className="border-b border-white/10 flex-none" style={{ padding: '1px' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg md:text-xl font-semibold text-white">📢 Görev Geçmişi</h3>
                      <button
                        onClick={() => { if (user?.role === 'admin') setHistoryDeleteMode(v => !v); }}
                        className={`rounded px-2 py-1 ${user?.role === 'admin' ? 'text-neutral-300 hover:bg-white/10' : 'text-neutral-500 cursor-not-allowed'}`}
                        title={user?.role === 'admin' ? (historyDeleteMode ? 'Silme modunu kapat' : 'Silme modunu aç') : 'Sadece admin'}
                      >⚙️</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4" style={{ padding: '10px' }}>
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

                                    // Yeni eklenen kullanıcıları bul
                                    const added = newUsers.filter(user => !oldUsers.includes(user));
                                    // Kaldırılan kullanıcıları bul
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
                      <div className="relative flex items-center bg-gray-800 rounded-2xl border border-gray-600 py-2">
                        {/* Input alanı */}
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Yorum yap/Not ekle"
                          className="flex-1 bg-transparent border-none outline-none px-4 text-white placeholder-gray-400 resize-none"
                          style={{
                            minHeight: '48px',
                            maxHeight: '120px',
                            fontSize: '16px',
                            lineHeight: '1.5'
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment();
                            }
                          }}
                          onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                          }}
                        />

                        <div className="pr-3 flex items-center">
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="rounded-full flex items-center justify-center transition-all duration-300"
                            style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: newComment.trim() ? '#10b981' : '#4b5563',
                              boxShadow: newComment.trim() ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                              transform: newComment.trim() ? 'scale(1)' : 'scale(0.9)',
                              cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                              border: newComment.trim() ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(255, 255, 255, 0.1)',
                              opacity: newComment.trim() ? '1' : '0.6'
                            }}
                            onMouseEnter={(e) => {
                              if (newComment.trim()) {
                                e.target.style.backgroundColor = '#059669';
                                e.target.style.transform = 'scale(1.1)';
                                e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (newComment.trim()) {
                                e.target.style.backgroundColor = '#10b981';
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                              }
                            }}
                          >
                            <div
                              style={{
                                width: '0',
                                height: '0',
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '8px solid white',
                                transform: 'rotate(-90deg)',
                                marginLeft: '2px'
                              }}
                            ></div>
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
      )
      }

      {showUserProfile && createPortal(
        <div className="fixed inset-0 z-[100200]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowUserProfile(false)} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[800px] max-h-[85vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-center px-5 py-3 border-b border-white/10 bg-[#0f172a] relative">
                <h3 className="!text-[24px] font-semibold text-center">Kullanıcı Ayarları</h3>
                <button onClick={() => setShowUserProfile(false)} className="absolute" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                  <span className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">✕</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-4 xs:p-6 sm:p-8 space-y-4 xs:space-y-6 sm:space-y-8 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                <div className="bg-white/5 rounded-xl p-6 mx-4" style={{ padding: '15px' }}>
                  <div className="grid items-center gap-x-8 gap-y-4" style={{ gridTemplateColumns: '120px 1fr' }}>
                    <div className="text-neutral-300 !text-[18px]">İsim</div>
                    <div className="font-semibold !text-[18px] truncate">{user?.name || 'Belirtilmemiş'}</div>

                    <div className="text-neutral-300 !text-[18px]">E-posta</div>
                    <div className="!text-[18px] truncate">{user?.email || 'Belirtilmemiş'}</div>

                    <div className="text-neutral-300 !text-[18px]">Rol</div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 !text-[18px]">{getRoleText(user?.role)}</div>
                  </div>
                </div>
                <div className="sticky bottom-0 w-full border-t border-white/10 bg-[#0b1625]/90 backdrop-blur px-8 py-5"></div>
                <div className="bg-white/5 rounded-xl p-6 mx-4">
                  <div className="!text-[20px] font-medium mb-4 flex items-center" style={{ paddingLeft: '15px' }}>
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

      {showUserPanel && createPortal(
        <div className="fixed inset-0 z-[100200]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowUserPanel(false)} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[98vw] max-w-[1800px] max-h-[85vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-center border-b border-white/10 bg-[#0f172a] relative">
                <h3 className="!text-[32px] font-semibold text-center">Kullanıcı Ayarları</h3>
                <button onClick={() => setShowUserPanel(false)} className="absolute" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                  <span className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">✕</span>
                </button>
              </div>
              {/* Body */}
              <div className="flex min-w-0 divide-x divide-white/10 overflow-y-auto" style={{ height: 'calc(80vh - 72px)' }}>
                <div className="flex-1 min-w-0 space-y-6" style={{ padding: '20px' }}>
                  <div className="grid items-center gap-x-10 gap-y-4" style={{ gridTemplateColumns: '220px 1fr' }}>
                    <div className="text-neutral-300 !text-[32px]">İsim</div>
                    <div className="font-semibold !text-[32px] truncate">{user?.name}</div>

                    <div className="text-neutral-300 !text-[32px]">E-posta</div>
                    <div className="!text-[32px] truncate">{user?.email}</div>

                    <div className="text-neutral-300 !text-[32px]">Rol</div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 !text-[32px]">{getRoleText(user?.role)}</div>
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-2">
                    <div className="!text-[24px] font-medium mb-2">Şifre Değiştir</div>
                    <PasswordChangeInline onDone={() => addNotification('Şifre güncellendi', 'success')} />
                  </div>
                  {user?.role === 'admin' && (
                    <div className="border-t border-white/10 pt-4">
                      <div className="!text-[24px] font-medium mb-2">Yeni Kullanıcı Ekle</div>
                      <AdminCreateUser />
                    </div>
                  )}
                </div>
                <div className="w-[600px] shrink-0 bg-[#0f172a] overflow-y-auto" style={{ padding: '20px' }}>
                  <div className="text-[24px] font-semibold mb-3">Kullanıcılar</div>

                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Kullanıcı ara..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 !text-[16px] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        // Otomatik doldurma tespit edilirse temizle
                        if (e.target.value && !e.isTrusted) {
                          e.target.value = '';
                          setUserSearchTerm('');
                        }
                      }}
                    />
                  </div>

                  <div className="sticky bottom-0 w-full border-t border-white/10 bg-[#0b1625]/90 backdrop-blur px-8 py-5"></div>
                  {user?.role === 'admin' ? (
                    <div className="space-y-3">
                      {Array.isArray(users) && users
                        .filter(u => {
                          if (!userSearchTerm) return true;
                          const searchTerm = userSearchTerm.toLowerCase();
                          return (
                            u.name?.toLowerCase().includes(searchTerm) ||
                            u.email?.toLowerCase().includes(searchTerm) ||
                            getRoleText(u.role)?.toLowerCase().includes(searchTerm)
                          );
                        })
                        .map((u, index) => {
                          const hasResetRequest = passwordResetRequests.some(req => req.user_id === u.id);
                          console.log(`User ${u.name} (${u.id}): hasResetRequest = ${hasResetRequest}`, passwordResetRequests);
                          return (
                            <div 
                              key={u.id} 
                              className="bg-white/5 rounded-lg px-4 py-4 gap-4 hover:bg-white/10 transition-colors"
                              style={hasResetRequest ? { border: '2px solid red' } : { border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                  <div>
                                    <div className="text-base font-medium truncate text-white">{u.name}</div>
                                    <div className="text-xs text-gray-400 truncate mt-1">{u.email}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
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
                                   >
                                     Şifre Sıfırla
                                   </button>
                                  <select
                                    className="text-xs rounded px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={u.role}
                                    onChange={async (e) => { try { await updateUserAdmin(u.id, { role: e.target.value }); addNotification('Rol güncellendi', 'success'); await loadUsers(); } catch { addNotification('Güncellenemedi', 'error'); } }}
                                  >
                                    <option value="admin">Yönetici</option>
                                    <option value="team_leader">Takım Lideri</option>
                                    <option value="team_member">Takım Üyesi</option>
                                    <option value="observer">Gözlemci</option>
                                  </select>

                                  <button className="text-xs rounded px-3 py-2 bg-rose-600 hover:bg-rose-700 transition-colors" onClick={async () => { if (!confirm('Silinsin mi?')) return; try { await deleteUserAdmin(u.id); addNotification('Kullanıcı silindi', 'success'); await loadUsers(); } catch (err) { console.error('Delete user error:', err); addNotification('Silinemedi', 'error'); } }}>Sil</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      {Array.isArray(users) && users.filter(u => {
                        if (!userSearchTerm) return true;
                        const searchTerm = userSearchTerm.toLowerCase();
                        return (
                          u.name?.toLowerCase().includes(searchTerm) ||
                          u.email?.toLowerCase().includes(searchTerm) ||
                          getRoleText(u.role)?.toLowerCase().includes(searchTerm)
                        );
                      }).length === 0 && userSearchTerm && (
                          <div className="text-center py-4 text-gray-400">
                            "{userSearchTerm}" için kullanıcı bulunamadı
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



      {/* Error Display */}
      {
        error && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
          </div>
        )
      }
    </div >
  );
}

export default App;