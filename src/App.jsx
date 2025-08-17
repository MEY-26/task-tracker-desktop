import React, { useEffect, useState, useRef } from 'react';
import { login, restore, getUser, getUsers, Tasks, Notifications } from './api';
import './App.css'
import { createPortal } from 'react-dom';


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
    responsible_id: null,
    assigned_users: [],
    start_date: '',
    due_date: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const bellRef = useRef(null);
  const notifPanelRef = useRef(null);  // bildirim paneli
  const [notifPos, setNotifPos] = useState({ top: 64, right: 16 });
  const badgeCount = Array.isArray(notifications)
    ? notifications.filter(n => !n.isFrontendNotification && !n.read_at).length
    : 0;

  useEffect(() => {
    if (!showNotifications) return; // Panel kapalıyken hiçbir dinleyici ekleme

    const place = () => {
      if (!bellRef.current) return;
      const r = bellRef.current.getBoundingClientRect();
      setNotifPos({
        top: r.bottom + 8 + window.scrollY,
        right: Math.max(16, window.innerWidth - r.right + 8),
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

    // TEK bir cleanup bloğu
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [showNotifications]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
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

  async function loadUsers() {
    try {
      const usersList = await getUsers();
      console.log('Loaded users:', usersList); // Debug için
      setUsers(usersList);
    } catch (err) {
      console.error('Users load error:', err);
      setUsers([]);
    }
  }

  async function loadNotifications() {
    try {
      const res = await Notifications.list();
      console.log('raw notifications response:', res);

      // Her şekli yakala
      let list =
        Array.isArray(res) ? res :
          Array.isArray(res?.notifications) ? res.notifications :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.data?.notifications) ? res.data.notifications :
                [];

      // UI’nin beklediği alanları garanti et
      list = list.map((n, i) => ({
        id: n.id ?? n.uuid ?? `srv_${i}`,
        message: n.data?.message ?? n.message ?? '',
        created_at: n.created_at ?? n.updated_at ?? n.timestamp ?? new Date().toISOString(),
        read_at: n.read_at ?? null,
        isFrontendNotification: false, // backend bildirimi
        // istersen orijinali de tut:
        raw: n,
      }));

      setNotifications(list);
      console.log('loaded notifications:', list.length);
    } catch (err) {
      console.error('Notifications load error:', err);
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
        loadNotifications()
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
      timestamp: new Date(),
      isFrontendNotification: true // Frontend bildirimi olduğunu işaretle
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

  async function handleAddTask() {
    try {
      setLoading(true);
      setError(null);

      // responsible_id'nin number olduğundan emin olalım
      const responsibleId = newTask.responsible_id ? parseInt(newTask.responsible_id) : user.id;

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        responsible_id: responsibleId,
        start_date: newTask.start_date ? new Date(newTask.start_date).toISOString() : null,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      };

      console.log('Sending task data:', taskData); // Debug için

      const response = await Tasks.create(taskData);
      const createdTask = response.task || response;

      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return [...currentTasks, createdTask];
      });

      addNotification('Görev başarıyla eklendi', 'success');

      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'waiting',
        responsible_id: null,
        assigned_users: [],
        start_date: '',
        due_date: ''
      });
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
      }

      addNotification('Görev başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Update task error:', err);
      setError('Görev güncellenemedi');
      addNotification('Görev güncellenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
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

      addNotification('Görev başarıyla silindi', 'success');
    } catch (err) {
      console.error('Delete task error:', err);
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
    await handleUpdateTask(taskId, { [field]: newDate });
  }

  async function handleTaskClick(task) {
    setSelectedTask(task);
    setShowDetailModal(true);

    try {
      const history = await Tasks.getHistory(task.id);
      console.log('Task history loaded:', history); // Debug için
      setTaskHistory(Array.isArray(history) ? history : []);

      // Mock comments data for now
      setComments([
        {
          id: 1,
          author: "Siz",
          text: `@${task.responsible?.name || 'Kullanıcı'} görev durumu güncellendi.`,
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          isSystemMessage: true
        }
      ]);
    } catch (err) {
      console.error('Task history load error:', err);
      setTaskHistory([]);
      setComments([]);
    }
  }

  function handleCloseModal() {
    setShowDetailModal(false);
    setSelectedTask(null);
    setNewComment('');
  }

  function handleAddComment() {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      author: user?.name || "Siz",
      text: newComment,
      timestamp: new Date(),
      isSystemMessage: false
    };

    setComments(prev => {
      const currentComments = Array.isArray(prev) ? prev : [];
      return [...currentComments, comment];
    });
    setNewComment('');
    addNotification('Yorum eklendi', 'success');
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

  function formatDate(dateLike) {
    if (!dateLike) return '-';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatRelativeTime(dateLike) {
    if (!dateLike) return '';
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return 'Bugün';
    if (diffInDays === 1) return 'Dün';
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} hafta önce`;
    return `${Math.floor(diffInDays / 30)} ay önce`;
  }

  // Tarihi input[type=datetime-local] formatına güvenli çevir
  function toInputDT(value) {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  }

  // Inputtan gelen 'YYYY-MM-DDTHH:mm' değerini ISO stringe çevir
  function toISO(localDTString) {
    if (!localDTString) return '';
    const d = new Date(localDTString);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  // Güvenli küçük harf çevirici
  function lowerSafe(v) {
    return (v ?? '').toString().toLowerCase();
  }


  const filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const q = lowerSafe(searchTerm);
    const title = lowerSafe(task?.title);
    const desc = lowerSafe(task?.description);
    const matchesSearch = q === '' || title.includes(q) || desc.includes(q);
    return matchesStatus && matchesSearch;
  }) : [];

  // Login Screen
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MDI</h1>
            <p className="text-gray-600">Mühendislik Revizyon Talepleri</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); doLogin(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ornek@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şifre
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Şifrenizi girin"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* Left Side - Brand */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="text-sm text-gray-500">Özel grup</div>
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-1 rounded-full">
                  <span className="text-yellow-600">⭐</span>
                  <span>Takip ediliyor</span>
                </div>
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-blue-600">👥</span>
                  <span>{Array.isArray(tasks) ? tasks.length : 0} öğe</span>
                </div>
              </div>
            </div>

            {/* Right Side - Search & User */}
            <div className="flex items-center space-x-6">
              {/* Search Bar */}
              <div className="relative hidden md:block">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Bu listede ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80 pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  ref={bellRef}
                  onClick={async () => {
                    const next = !showNotifications;
                    if (next) await loadNotifications(); // açarken çek
                    setShowNotifications(next);
                  }}
                  className="relative rounded-lg p-2 text-gray-300 hover:bg-white/5 hover:text-white overflow-visible"
                  aria-label="Bildirimler"
                >
                  {/* KIRMIZI ROZET */}
                  {badgeCount > 0 && (
                    <span
                      className="
          pointer-events-none absolute -top-1 -left-1
          grid place-items-center z-10
          w-5 h-5 rounded-full text-white text-[11px] font-bold
          border-2 border-neutral-900
        "
                      style={{ backgroundColor: '#ef4444' }}  // bg-red-600 garanti
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}

                  {/* zil ikonu */}
                  <span className="text-lg">🔔</span>
                </button>
              </div>


              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user?.name || 'Kullanıcı'}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Çıkış
                </button>
              </div>

              {showNotifications && createPortal(
                <>
                  {/* (varsa) yarı saydam arkaplan */}
                  <div className="fixed inset-0 z-[9998]" style={{ backgroundColor: 'rgba(0,0,0,.6)' }}
                    onClick={() => setShowNotifications(false)} />

                  {/* PANEL KAPSAYICI */}
                  <div
                    ref={notifPanelRef}
                    className="fixed z-[99999] p-3"              // <— kenarlara boşluk
                    style={{
                      top: notifPos.top,
                      right: notifPos.right,
                      opacity: 1,
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none',
                    }}
                  >
                    {/* ASIL KART */}
                    <div
                      className="w-[360px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#111827]"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-neutral-100">Bildirimler</h3>
                          {/* istersen toplam sayıyı burada göstermeyebilirsin */}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => { /* markAllAsRead */ }}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-blue-300 border border-blue-400/40 bg-blue-500/10"
                          >
                            Tümünü okundu
                          </button>
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="rounded-lg p-1 text-neutral-300 hover:bg-white/10 hover:text-white"
                            aria-label="Kapat"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Liste alanı */}
                      <div className="max-h-64 overflow-y-auto">
                        {(!Array.isArray(notifications) || notifications.length === 0) ? (
                          <div className="p-4 text-center text-gray-500">Bildirim bulunmuyor</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-3 border-b border-gray-100 last:border-b-0 ${n.read_at ? 'bg-gray-50' : 'bg-blue-50'}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900">{n.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(n.created_at)}</p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  {!n.read_at && (
                                    <button
                                      onClick={async () => {
                                        try { await Notifications.markAsRead(n.id); await loadNotifications(); }
                                        catch { addNotification('Bildirim işaretlenemedi', 'error'); }
                                      }}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >✓</button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      try { await Notifications.delete(n.id); await loadNotifications(); addNotification('Bildirim silindi', 'success'); }
                                      catch { addNotification('Bildirim silinemedi', 'error'); }
                                    }}
                                    className="text-red-600 hover:text-red-800 text-xs"
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

      {/* Action Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="text-xl">+</span>
                <span className="font-medium">Yeni öğe ekle</span>
              </button>

              <div className="hidden lg:flex items-center space-x-2">
                <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2">
                  <span>📝</span><span>Kılavuz görünümünde düzenle</span>
                </button>
                <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2">
                  <span>🔗</span><span>Paylaş</span>
                </button>
                <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2">
                  <span>📋</span><span>Bağlantıyı kopyala</span>
                </button>
                <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2">
                  <span>📤</span><span>Dışa Aktar</span>
                </button>
                <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2">
                  <span>⚙️</span><span>Otomatikleştir</span>
                </button>
                <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center space-x-2">
                  <span>📊</span><span>Tümleştir</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <span className="text-lg">📐</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">✨ Yeni Görev</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Görev Başlığı</label>
                  <input
                    type="text"
                    placeholder="Görev başlığını girin..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                  />
                </div>

                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="critical">Kritik</option>
                </select>

                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="waiting">Bekliyor</option>
                  <option value="in_progress">Devam Ediyor</option>
                  <option value="investigating">Araştırılıyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal</option>
                </select>

                <select
                  value={newTask.responsible_id || ''}
                  onChange={(e) => setNewTask({ ...newTask, responsible_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sorumlu Seçin</option>
                  {users && users.length > 0 ? (
                    users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                  ) : (
                    <option value="" disabled>Kullanıcılar yükleniyor...</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <input
                  type="datetime-local"
                  placeholder="Başlangıç Tarihi"
                  value={newTask.start_date}
                  onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="datetime-local"
                  placeholder="Bitiş Tarihi"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <textarea
                placeholder="Görev Açıklaması"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows="3"
                className="mt-4 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleAddTask}
                  disabled={loading || !newTask.title}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {loading ? 'Ekleniyor...' : 'Ekle'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtreler:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tümü</option>
            <option value="waiting">Bekliyor</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="investigating">Araştırılıyor</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>
        </div>
      </div>

      {/* Main Content - Task List */}
      <div className="bg-white">
        <div className="px-6">
          <h2 className="text-lg font-semibold text-gray-900 py-4 border-b border-gray-200">
            Görev Takip Sistemi
          </h2>
        </div>

        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1">Başlık</div>
            <div>Öncelik</div>
            <div>Durum</div>
            <div>Açıklama</div>
            <div className="col-span-2">Sorumlu</div>
            <div className="col-span-2">Oluşturan</div>
            <div>Başlangıç</div>
            <div>Bitiş</div>
            <div>Atananlar</div>
            <div>Dosyalar</div>
            <div>İşlemler</div>
          </div>
        </div>

        {/* Task List */}
        <div className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="col-span-1">
                <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  {task.title || `Görev ${task.id}`}
                </div>
              </div>
              <div>
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getPriorityColor(task.priority) + '20',
                    color: getPriorityColor(task.priority)
                  }}
                >
                  {getPriorityText(task.priority)}
                </span>
              </div>
              <div>
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getStatusColor(task.status) + '20',
                    color: getStatusColor(task.status)
                  }}
                >
                  {getStatusText(task.status)}
                </span>
              </div>
              <div className="text-sm text-gray-900 truncate">
                {task.description || 'Açıklama yok'}
              </div>
              <div className="text-sm text-gray-900 col-span-2">
                {task.responsible?.name || 'Atanmamış'}
              </div>
              <div className="text-sm text-gray-900 col-span-2">
                {task.creator?.name || 'Bilinmiyor'}
              </div>
              <div className="text-sm text-gray-900">
                {task.start_date ? formatDate(task.start_date) : '-'}
              </div>
              <div className="text-sm text-gray-900">
                {task.due_date ? formatDate(task.due_date) : '-'}
              </div>
              <div className="text-sm text-gray-900">
                {task.assigned_users?.length > 0
                  ? task.assigned_users.map(u => u.name).join(', ')
                  : '-'
                }
              </div>
              <div className="text-sm text-gray-900">
                {task.attachments?.length > 0
                  ? `${task.attachments.length} dosya`
                  : '-'
                }
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(task.id, 'completed');
                  }}
                  className="text-green-600 hover:text-green-800 text-xs"
                >
                  ✓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Görev bulunamadı</div>
            <div className="text-gray-400 text-sm mt-2">
              {searchTerm || filterStatus !== 'all' ? 'Filtreleri değiştirmeyi deneyin' : 'Yeni görev ekleyin'}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tümünü düzenle</h2>
                  <p className="text-sm text-gray-500">
                    {selectedTask.id || `301.02.0071-03.304.00399`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">🔗 Bağlantıyı kopyala</button>
                <button className="text-gray-600 hover:text-gray-800 text-sm">📝</button>
                <button className="text-red-600 hover:text-red-800 text-sm">🗑️</button>
              </div>
            </div>
            {/* Modal Body */}
            <div className="flex h-[calc(90vh-140px)]">
              {/* Left Panel - Task Details */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
                <div className="space-y-6">
                  {/* Task ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                    <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                      {selectedTask.id}
                    </div>
                  </div>

                  {/* Task Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTask.title}
                    </div>
                  </div>

                  {/* Task Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📝 Açıklama</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded min-h-[80px]">
                      {selectedTask.description || "Açıklama yok"}
                    </div>
                  </div>

                  {/* Excel File Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📎 Excel_Dosya_Linki</label>
                    <a
                      href="https://yildizpul.sharepoint.com/sites/MDI/MDI/MDI/Tasks/03.304.00399"
                      className="text-blue-600 hover:text-blue-800 underline text-sm block bg-gray-50 p-2 rounded"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://yildizpul.sharepoint.com/sites/MDI/MDI/MDI/Tasks/03.304.00399 Gövde İşlemesinde İstila bağla...
                    </a>
                  </div>

                  {/* Status Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">🔘 Durum</label>
                      {/* Yetki kontrolü: Sadece görev sahibi, sorumlu kişi ve admin durumu değiştirebilir */}
                      {(user?.id === selectedTask.creator?.id ||
                        user?.id === selectedTask.responsible?.id ||
                        user?.role === 'admin') ? (
                        <select
                          value={selectedTask.status || 'waiting'}
                          onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="waiting">Bekliyor</option>
                          <option value="in_progress">Devam Ediyor</option>
                          <option value="investigating">Araştırılıyor</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="cancelled">İptal</option>
                        </select>
                      ) : (
                        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: getStatusColor(selectedTask.status) + '20',
                              color: getStatusColor(selectedTask.status)
                            }}
                          >
                            {getStatusText(selectedTask.status)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">⚡ Öncelik</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: getPriorityColor(selectedTask.priority) + '20',
                            color: getPriorityColor(selectedTask.priority)
                          }}
                        >
                          {getPriorityText(selectedTask.priority)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">👤 Sorumlu</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTask.responsible?.name || 'Atanmamış'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">👨‍💼 Oluşturan</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTask.creator?.name || 'Bilinmiyor'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📅 Başlangıç Tarihi</label>
                      {/* Yetki kontrolü: Sadece görev sahibi ve admin tarihleri değiştirebilir */}
                      {(user?.id === selectedTask.creator?.id || user?.role === 'admin') ? (
                        <input
                          type="datetime-local"
                          value={selectedTask.start_date ? selectedTask.start_date.slice(0, 16) : ''}
                          onChange={(e) => handleDateChange(selectedTask.id, 'start_date', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {selectedTask.start_date ? formatDate(selectedTask.start_date) : '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📅 Bitiş Tarihi</label>
                      {/* Yetki kontrolü: Sadece görev sahibi ve admin tarihleri değiştirebilir */}
                      {(user?.id === selectedTask.creator?.id || user?.role === 'admin') ? (
                        <input
                          type="datetime-local"
                          value={selectedTask.due_date ? selectedTask.due_date.slice(0, 16) : ''}
                          onChange={(e) => handleDateChange(selectedTask.id, 'due_date', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {selectedTask.due_date ? formatDate(selectedTask.due_date) : '-'}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTask.assigned_users && selectedTask.assigned_users.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">👥 Atanan Kullanıcılar</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTask.assigned_users.map(user => user.name).join(', ')}
                      </div>
                    </div>
                  )}

                  {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📎 Dosyalar</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTask.attachments.map(attachment => (
                          <div key={attachment.id} className="flex justify-between items-center py-1">
                            <span>{attachment.original_name}</span>
                            <button
                              onClick={() => Tasks.deleteAttachment(attachment.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4 border-t border-gray-200">
                    {/* Kabul/Red butonları - Sadece sorumlu kişi */}
                    {selectedTask.status === 'waiting' && user?.id === selectedTask.responsible?.id && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await Tasks.accept(selectedTask.id);
                              await loadTasks();
                              addNotification('Görev kabul edildi', 'success');
                            } catch (err) {
                              addNotification('Görev kabul edilemedi', 'error');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                        >
                          Kabul Et
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await Tasks.reject(selectedTask.id);
                              await loadTasks();
                              addNotification('Görev reddedildi', 'success');
                            } catch (err) {
                              addNotification('Görev reddedilemedi', 'error');
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                        >
                          Reddet
                        </button>
                      </>
                    )}

                    {/* Durum değiştirme - Sadece görev sahibi, sorumlu kişi ve admin */}
                    {['in_progress', 'investigating'].includes(selectedTask.status) &&
                      (user?.id === selectedTask.creator?.id ||
                        user?.id === selectedTask.responsible?.id ||
                        user?.role === 'admin') && (
                        <button
                          onClick={async () => {
                            try {
                              await Tasks.toggleStatus(selectedTask.id);
                              await loadTasks();
                              addNotification('Görev durumu değiştirildi', 'success');
                            } catch (err) {
                              addNotification('Durum değiştirilemedi', 'error');
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                        >
                          Durumu Değiştir
                        </button>
                      )}

                    {/* Hatırlatma - Sadece görev sahibi ve admin */}
                    {(user?.id === selectedTask.creator?.id || user?.role === 'admin') && (
                      <button
                        onClick={async () => {
                          try {
                            await Tasks.remind(selectedTask.id);
                            addNotification('Hatırlatma gönderildi', 'success');
                          } catch (err) {
                            addNotification('Hatırlatma gönderilemedi', 'error');
                          }
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                      >
                        Hatırlat
                      </button>
                    )}

                    {/* Silme - Sadece görev sahibi ve admin */}
                    {(user?.id === selectedTask.creator?.id || user?.role === 'admin') && (
                      <button
                        onClick={() => handleDeleteTask(selectedTask.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel - Comments */}
              <div className="w-96 bg-gray-50">
                <div className="h-full flex flex-col">
                  {/* Comments Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">📢 Açıklamalar</h3>
                      <button className="text-gray-400 hover:text-gray-600">⚙️</button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {/* Task History */}
                    {Array.isArray(taskHistory) && taskHistory.length > 0 ? (
                      taskHistory.map((history) => (
                        <div key={history.id} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                          <div className="text-xs text-blue-600 mb-1">{formatRelativeTime(history.created_at)}</div>
                          <div className="flex items-start space-x-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                              {history.user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-900">
                                <span className="font-medium">{history.user?.name || 'Kullanıcı'}</span>
                                {' '}{history.field === 'status' ? 'durumu' : history.field === 'priority' ? 'önceliği' : history.field}
                                değiştirdi: <span className="text-gray-600">{history.old_value || 'boş'}</span> → <span className="text-gray-600">{history.new_value || 'boş'}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatRelativeTime(history.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        Henüz görev geçmişi bulunmuyor
                      </div>
                    )}

                    {/* Display dynamic comments */}
                    {Array.isArray(comments) && comments.map((comment) => (
                      <div key={comment.id} className="bg-white border border-gray-200 p-3 rounded">
                        <div className="text-xs text-gray-500 mb-1">{formatRelativeTime(comment.timestamp)}</div>
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                            {comment.author.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">
                              <span className="font-medium">{comment.author}</span> {comment.text}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatRelativeTime(comment.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="@bahset veya yorum yap"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows="3"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex space-x-2">
                        <button className="text-gray-400 hover:text-gray-600">📎</button>
                        <button className="text-gray-400 hover:text-gray-600">😊</button>
                      </div>
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
    </div>
  );
}

export default App;