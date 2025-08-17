import React, { useEffect, useState, useRef } from 'react';
import { login, restore, getUser, getUsers, Tasks, Notifications, registerUser, updateUserAdmin, deleteUserAdmin, changePassword } from './api';
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
  // Sıralama yapılandırması
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'desc' });
  // key örnekleri: 'title', 'priority', 'status', 'description', 'responsible_name', 'creator_name', 'start_date', 'due_date', 'assigned_count', 'attachments_count'
  const [searchTerm, setSearchTerm] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member' });
  const bellRef = useRef(null);
  const notifPanelRef = useRef(null);  // bildirim paneli
  const [notifPos, setNotifPos] = useState({ top: 64, right: 16 });
  const badgeCount = Array.isArray(notifications)
    ? notifications.filter(n => !n.isFrontendNotification && !n.read_at).length
    : 0;
  const [historyDeleteMode, setHistoryDeleteMode] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

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

  // ESC ile modal kapatma
  useEffect(() => {
    if (!showDetailModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDetailModal]);

  useEffect(() => {
    if (showDetailModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showDetailModal]);

  useEffect(() => {
    if (!showDetailModal) return;
    const onKey = (e) => { if (e.key === 'Escape') handleCloseModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDetailModal]);


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

      // UI'nin beklediği alanları garanti et
      list = list.map((n, i) => ({
        id: n.id ?? n.uuid ?? `srv_${i}`,
        message: n.data?.message ?? n.message ?? '',
        created_at: n.created_at ?? n.updated_at ?? n.timestamp ?? new Date().toISOString(),
        read_at: n.read_at ?? null,
        isFrontendNotification: false, // backend bildirimi
        // istersen orijinali de tut:
        raw: n,
      }));

      // Okunmuş bildirimleri (read_at dolu olanları) liste dışı bırak
      list = list.filter(n => !n.read_at);

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

      // Eski mock yorumlar kaldırıldı
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
    setHistoryDeleteMode(false);
    setShowAssigneePicker(false);
  }

  async function handleAddComment() {
    const text = newComment.trim();
    if (!text || !selectedTask) return;

    try {
      const res = await Tasks.comment(selectedTask.id, text);
      // Arayüzde de gösterelim
      // Sunucudan en güncel history'yi çekelim; duplikasyon olmaması için tek kaynağı backend yapıyoruz
      try {
        const h = await Tasks.getHistory(selectedTask.id);
        setTaskHistory(Array.isArray(h) ? h : []);
      } catch { }
      // Yorum kutusunu boşalt
      setNewComment('');
      addNotification('Yorum eklendi', 'success');
    } catch (e) {
      addNotification('Yorum eklenemedi', 'error');
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

  function resolveUserName(userId) {
    if (userId === null || userId === undefined || userId === '') return '-';
    const idNum = typeof userId === 'string' ? parseInt(userId) : userId;
    const u = Array.isArray(users) ? users.find(x => x.id === idNum) : null;
    return u?.name ?? String(userId);
  }

  // Geçmiş değerlerini alan bazında okunur hale getir
  function renderHistoryValue(field, value) {
    if (field === 'status') return getStatusText(value);
    if (field === 'priority') return getPriorityText(value);
    if (field === 'comment') return value ?? '';
    if (field === 'responsible_id' || field === 'created_by') return resolveUserName(value);
    if (field === 'start_date' || field === 'due_date' || field === 'end_date') return formatDate(value);
    return value ?? 'boş';
  }

  function renderFieldLabel(field) {
    switch (field) {
      case 'status':
        return 'durumu';
      case 'priority':
        return 'önceliği';
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

  // Inline components inside App for brevity
  function PasswordChangeInline({ onDone }) {
    const [form, setForm] = useState({ current: '', next: '', again: '' });
    const can = form.current && form.next && form.again && form.next === form.again;
    return (
      <div className="space-y-3">
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px]" placeholder="Mevcut şifre" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px]" placeholder="Yeni şifre" value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px]" placeholder="Yeni şifre (tekrar)" value={form.again} onChange={e => setForm({ ...form, again: e.target.value })} />
        <button disabled={!can} className="rounded px-4 py-3 bg-blue-600 disabled:opacity-50 !text-[24px]" onClick={async () => { try { await changePassword(form.current, form.next); onDone?.(); setForm({ current: '', next: '', again: '' }); } catch { addNotification('Şifre güncellenemedi', 'error'); } }}>Güncelle</button>
      </div>
    );
  }

  function AdminCreateUser() {
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member' });
    return (
      <div className="space-y-3">
        <input className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px]" placeholder="İsim" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px]" placeholder="E-posta" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px]" placeholder="Şifre" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <input type="password" className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[32px]" placeholder="Şifre (tekrar)" value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })} />
        <select className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px]" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="admin">Yönetici</option>
          <option value="team_leader">Takım Lideri</option>
          <option value="team_member">Takım Üyesi</option>
          <option value="observer">Gözlemci</option>
        </select>
        <button className="rounded px-4 py-3 bg-green-600 !text-[24px]" onClick={async () => { try { await registerUser(form); addNotification('Kullanıcı eklendi', 'success'); setForm({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member' }); await loadUsers(); } catch { addNotification('Kullanıcı eklenemedi', 'error'); } }}>Ekle</button>
      </div>
    );
  }


  // Sadece arama alanına göre filtrele (filtreler kaldırıldı)
  let filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const q = lowerSafe(searchTerm);
    if (!q) return true;
    const title = lowerSafe(task?.title);
    const desc = lowerSafe(task?.description);
    return title.includes(q) || desc.includes(q);
  }) : [];

  // Sorting
  if (Array.isArray(filteredTasks) && sortConfig?.key) {
    const key = sortConfig.key;
    const dir = sortConfig.dir === 'asc' ? 1 : -1; // 'Yeni' -> desc
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
      // fallback string compare
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

  // Login Screen
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Görev Takip Sistemi</h1>
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
                  <div className="text-sm text-gray-500">Vaden Original</div>
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

            {/* Right Side - Controls: Yeni Görev, Kullanıcı, Zil, Çıkış */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-md"
              >
                <span className="text-xl">+</span>
                <span className="font-medium">Yeni Görev Ekle</span>
              </button>

              <button
                onClick={() => setShowUserPanel && setShowUserPanel(true)}
                className="text-sm font-medium text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                title={user?.email || ''}
              >
                {user?.name || 'Kullanıcı'}
              </button>

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

              {/* Çıkış butonu */}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Çıkış
              </button>

              {showNotifications && createPortal(
                <>
                  {/* (varsa) yarı saydam arkaplan */}
                  <div className="fixed inset-0 z-[9998] bg-black/80"
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
                            onClick={async () => { try { await Notifications.markAllAsRead(); await loadNotifications(); } catch { addNotification('İşlem başarısız', 'error'); } }}
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

      {/* Add Task Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100300]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddForm(false)} />
          <div className="relative z-10 flex items-center justify-center p-4 min-h-full">
            {/* Dark modal container aligned with other panels */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[min(1100px,calc(100vw-48px))] max-h-[75vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-2 border-b border-white/10 bg-[#0f172a]">
                <div></div>
                <h2 className="font-semibold text-neutral-100 text-center">Yeni Görev</h2>
                <div className="justify-self-end">
                  <button onClick={() => setShowAddForm(false)} className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">✕</button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex flex-col gap-6" style={{height:'calc(75vh - 48px)'}}>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
                  <div className="space-y-2 mb-4">
                    <label className="!text-[32px] font-medium">Görev Başlığı</label>
                    <input
                      type="text"
                      placeholder="Görev başlığını girin..."
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 !text-[32px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                  </div>

                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="rounded-md px-3 py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>

                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="rounded-md px-3 py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
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
                    className="rounded-md px-3 py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  >
                    <option value="">Sorumlu Seçin</option>
                    {users && users.length > 0 ? (
                      users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                    ) : (
                      <option value="" disabled>Kullanıcılar yükleniyor...</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8">
                  <input
                    type="date"
                    placeholder="Başlangıç Tarihi"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    className="rounded-md px-3 py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  />
                  <input
                    type="date"
                    placeholder="Bitiş Tarihi"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="rounded-md px-3 py-3 !text-[24px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  />
                </div>

                <div className="mt-2">
                  <textarea
                    placeholder="Görev Açıklaması"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full rounded-md px-4 py-3 !text-[32px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[180px] max-h-[40vh]"
                  />
                </div>

                <div className="mt-2 flex space-x-2">
                  <button onClick={handleAddTask} disabled={loading || !newTask.title} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-4 py-3 rounded-md transition-colors !text-[24px]">{loading ? 'Ekleniyor...' : 'Ekle'}</button>
                  <button onClick={() => setShowAddForm(false)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-md transition-colors !text-[24px]">İptal</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Eski filtre bar kaldırıldı */}

      {/* Main Content - Task List */}
      <div className="bg-white">
        <div className="px-6">
          <h2 className="text-lg font-semibold text-gray-900 py-4 border-b border-gray-200">
            Görev Takip Sistemi
          </h2>
        </div>

        {/* Table Header + Column Sorts */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-13 gap-4 px-6 pt-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <button onClick={() => toggleSort('id')} className="w-full flex items-center justify-between">
              <span>ID</span><span className="text-[10px]">{sortIndicator('id')}</span>
            </button>
            <button onClick={() => toggleSort('title')} className="w-full flex items-center justify-between">
              <span>Başlık</span><span className="text-[10px]">{sortIndicator('title')}</span>
            </button>
            <button onClick={() => toggleSort('priority')} className="w-full flex items-center justify-between">
              <span>Öncelik</span><span className="text-[10px]">{sortIndicator('priority')}</span>
            </button>
            <button onClick={() => toggleSort('status')} className="w-full flex items-center justify-between">
              <span>Durum</span><span className="text-[10px]">{sortIndicator('status')}</span>
            </button>
            <button onClick={() => toggleSort('description')} className="w-full flex items-center justify-between">
              <span>Açıklama</span><span className="text-[10px]">{sortIndicator('description')}</span>
            </button>
            <button onClick={() => toggleSort('responsible_name')} className="w-full flex items-center justify-between col-span-2">
              <span>Sorumlu</span><span className="text-[10px]">{sortIndicator('responsible_name')}</span>
            </button>
            <button onClick={() => toggleSort('creator_name')} className="w-full flex items-center justify-between">
              <span>Oluşturan</span><span className="text-[10px]">{sortIndicator('creator_name')}</span>
            </button>
            <button onClick={() => toggleSort('start_date')} className="w-full flex items-center justify-between">
              <span>Başlangıç</span><span className="text-[10px]">{sortIndicator('start_date')}</span>
            </button>
            <button onClick={() => toggleSort('due_date')} className="w-full flex items-center justify-between">
              <span>Bitiş</span><span className="text-[10px]">{sortIndicator('due_date')}</span>
            </button>
            <button onClick={() => toggleSort('assigned_count')} className="w-full flex items-center justify-between">
              <span>Atananlar</span><span className="text-[10px]">{sortIndicator('assigned_count')}</span>
            </button>
            <button onClick={() => toggleSort('attachments_count')} className="w-full flex items-center justify-between">
              <span>Dosyalar</span><span className="text-[10px]">{sortIndicator('attachments_count')}</span>
            </button>
            <div>İşlemler</div>
          </div>
        </div>

        {/* Task List */}
        <div className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="grid grid-cols-13 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div>
                <div className="text-sm text-gray-900">{task.id}</div>
              </div>
              <div>
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
              <div className="text-sm text-gray-900">
                {task.creator?.name || 'Bilinmiyor'}
              </div>
              <div className="text-sm text-gray-900">
                {task.start_date ? formatDateOnly(task.start_date) : '-'}
              </div>
              <div className="text-sm text-gray-900">
                {task.due_date ? formatDateOnly(task.due_date) : '-'}
              </div>
              <div className="text-sm text-gray-900 truncate">
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
              {searchTerm ? 'Aramayı temizlemeyi deneyin' : 'Yeni görev ekleyin'}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTask && createPortal(
        <div className="fixed inset-0 z-[100100]">
          {/* OPak arka plan */}
          <div className="absolute inset-0 bg-black/70" onClick={handleCloseModal} />

          {/* İçerik taşıyıcı – tam ortalı */}
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div
              className="
                fixed z-[100100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                w-full max-w-[min(1300px,calc(100vw-48px))]
                max-h-[90vh] rounded-2xl border border-white/10 box-border
                shadow-[0_25px_80px_rgba(0,0,0,.6)] flex flex-col overflow-hidden
              "
              style={{ backgroundColor: '#111827', color: '#e5e7eb' }}  // opak koyu zemin
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header (flex-none) */}
              <div
                className="px-5 py-3 border-b flex-none"
                style={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,.1)' }}
              >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  {/* Left: Share button */}
                  <div className="justify-self-start">
                    <button
                      onClick={() => copyToClipboard(buildTaskShareText(selectedTask))}
                      className="rounded-md px-2 py-1 text-xs font-medium"
                      style={{ color: '#93c5fd', border: '1px solid rgba(59,130,246,.35)', backgroundColor: 'rgba(59,130,246,.12)' }}
                    >
                      🔗 Bağlantıyı kopyala
                    </button>
                  </div>
                  {/* Center: Title */}
                  <h2 className="text-xl md:text-2xl font-semibold text-white text-center">Görev Detayı</h2>
                  {/* Right: Close */}
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

              {/* Gövde (flex-1) */}
              <div className="flex-1 flex min-w-0 overflow-hidden overflow-x-hidden divide-x divide-white/10">
                {/* Sol panel – kaydırılabilir */}
                <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 sm:px-10">
                  <div className="py-6 flex flex-col gap-6 min-h-[calc(100vh-220px)]">
                    {/* ID */}
                    <div className="flex gap-4 items-center min-w-0">
                      <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-semibold text-slate-200">
                        ID
                      </label>
                      <input
                        readOnly
                        value={selectedTask.id ?? ""}
                        className="flex-1 min-w-0 w-full min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60"
                      />
                    </div>

                    {/* Başlık */}
                    <div className="flex gap-4 items-center min-w-0">
                      <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-semibold text-slate-200">
                        Başlık
                      </label>
                      <input
                        readOnly
                        value={selectedTask.title ?? ""}
                        className="flex-1 min-w-0 w-full min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60"
                      />
                    </div>


                    {/* Durum – Öncelik */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-4 items-center min-w-0">
                        <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-bold text-slate-100">
                          Durum
                        </label>
                        {(user?.id === selectedTask.creator?.id || user?.id === selectedTask.responsible?.id || user?.role === 'admin') ? (
                          <select
                            value={selectedTask.status || 'waiting'}
                            onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                            className="flex-1 min-w-0 w-full min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60"
                          >
                            <option value="waiting">Bekliyor</option>
                            <option value="in_progress">Devam Ediyor</option>
                            <option value="investigating">Araştırılıyor</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="cancelled">İptal</option>
                          </select>
                        ) : (
                          <div className="flex-1 min-w-0 flex items-center min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100">
                            {getStatusText(selectedTask.status)}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4 items-center min-w-0">
                        <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-semibold text-slate-200">
                          Öncelik
                        </label>
                        {user?.role === 'admin' ? (
                          <select
                            value={selectedTask.priority || 'medium'}
                            onChange={async (e) => {
                              const val = e.target.value;
                              try { await handleUpdateTask(selectedTask.id, { priority: val }); } catch {}
                            }}
                            className="flex-1 min-w-0 w-full min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[24px] text-slate-100"
                          >
                            <option value="low">Düşük</option>
                            <option value="medium">Orta</option>
                            <option value="high">Yüksek</option>
                            <option value="critical">Kritik</option>
                          </select>
                        ) : (
                          <div className="flex-1 min-w-0 flex items-center min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100">
                            {getPriorityText(selectedTask.priority)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sorumlu – Oluşturan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-4 items-center min-w-0">
                        <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-semibold text-slate-200">
                          Sorumlu
                        </label>
                        {(user?.role === 'admin') ? (
                          <select
                            value={selectedTask.responsible?.id || ''}
                            onChange={async (e) => {
                              const rid = e.target.value ? parseInt(e.target.value) : null;
                              try { await handleUpdateTask(selectedTask.id, { responsible_id: rid }); } catch {}
                            }}
                            className="flex-1 min-w-0 w-full min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[24px] text-slate-100"
                          >
                            <option value="">Seçin</option>
                            {Array.isArray(users) && users.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex-1 min-w-0 flex items-center min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100">
                            {selectedTask.responsible?.name || 'Atanmamış'}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4 items-center min-w-0">
                        <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-semibold text-slate-200">
                          Oluşturan
                        </label>
                        <div className="flex-1 min-w-0 flex items-center min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100">
                          {selectedTask.creator?.name || 'Bilinmiyor'}
                        </div>
                      </div>
                    </div>

                    {/* Atananlar (İzleyiciler) */}
                    <div className="flex gap-4 items-start min-w-0">
                      <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-semibold text-slate-200 pt-3">
                        Atananlar
                      </label>
                      <div className="w-full max-w-[470px]">
                        {user?.role === 'admin' ? (
                          <div className="space-y-2">
                            <div className="flex flex-nowrap gap-2 items-center h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-3 py-2 overflow-x-auto overflow-y-hidden whitespace-nowrap">
                              {(selectedTask.assigned_users || []).length > 0 ? (
                                selectedTask.assigned_users.map(u => (
                                  <span key={u.id} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm shrink-0">
                                    {u.name}
                                    <button className="text-rose-300 hover:text-rose-100" onClick={async()=>{ try{ const ids=(selectedTask.assigned_users||[]).map(x=>x.id).filter(id=>id!==u.id); await Tasks.assignUsers(selectedTask.id, ids); const t=await Tasks.get(selectedTask.id); setSelectedTask(t.task||t); } catch{ addNotification('Güncellenemedi','error'); } }}>✕</button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-neutral-400">-</span>
                              )}
                              <button className="ml-auto rounded px-2 py-1 text-xs bg-white/10 hover:bg-white/20" onClick={()=> setShowAssigneePicker(v=>!v)}>
                                {showAssigneePicker ? 'Kapat' : 'Düzenle'}
                              </button>
                            </div>
                            {showAssigneePicker && (
                              <select
                                multiple
                                value={(selectedTask.assigned_users || []).map(u=>u.id)}
                                onChange={async (e)=>{
                                  const ids = Array.from(e.target.selectedOptions).map(o=>parseInt(o.value));
                                  try { await Tasks.assignUsers(selectedTask.id, ids); const t=await Tasks.get(selectedTask.id); setSelectedTask(t.task||t); addNotification('Atananlar güncellendi','success'); } catch { addNotification('Güncellenemedi','error'); }
                                }}
                                className="w-full min-h-[160px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-3 py-2 text-slate-100"
                              >
                                {Array.isArray(users) && users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-nowrap gap-2 items-center h-[56px] overflow-x-auto overflow-y-hidden whitespace-nowrap">
                            {(selectedTask.assigned_users || []).length > 0 ? (
                              selectedTask.assigned_users.map(u => (
                                <span key={u.id} className="rounded-full bg-white/10 px-3 py-1 text-sm shrink-0">{u.name}</span>
                              ))
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ekler */}
                    <div className="flex gap-4 items-start min-w-0">
                      <label className="flex-1 min-w-0 !text-[32px] !leading-[1.1] !font-semibold text-slate-200 pt-3">
                        Dosyalar
                      </label>
                      <div className="w-full max-w-[470px]">
                        {user?.role === 'admin' ? (
                          <div className="space-y-3">
                            <input type="file" multiple onChange={async (e)=>{ const files = Array.from(e.target.files||[]); if(files.length===0) return; try{ await Tasks.uploadAttachments(selectedTask.id, files); const t = await Tasks.get(selectedTask.id); setSelectedTask(t.task || t); addNotification('Dosyalar yüklendi','success'); } catch { addNotification('Yükleme başarısız','error'); } finally { e.target.value=''; } }} />
                            <div className="space-y-2">
                              {(selectedTask.attachments || []).map(a => (
                                <div key={a.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2">
                                  <a href={a.url || a.path} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">{a.original_name || 'Dosya'}</a>
                                  <button onClick={async()=>{ try{ await Tasks.deleteAttachment(a.id); const t = await Tasks.get(selectedTask.id); setSelectedTask(t.task || t); } catch { addNotification('Silinemedi','error'); } }} className="text-rose-400 hover:text-rose-200 text-sm">Sil</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(selectedTask.attachments || []).map(a => (
                              <a key={a.id} href={a.url || a.path} target="_blank" rel="noreferrer" className="block text-sky-300 hover:underline">{a.original_name || 'Dosya'}</a>
                            ))}
                            {(selectedTask.attachments || []).length === 0 && <span className="text-neutral-400">-</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tarihler – her zaman yan yana */}
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <label className="block !text-[32px] !leading-[1.1] !font-semibold text-slate-200 mb-1">
                          Başlangıç Tarihi
                        </label>
                        {(user?.id === selectedTask.creator?.id || user?.role === 'admin') ? (
                          <input
                            type="date"
                            value={selectedTask.start_date ? selectedTask.start_date.slice(0, 10) : ''}
                            onChange={(e) => handleDateChange(selectedTask.id, 'start_date', e.target.value)}
                            className="w-full min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60"
                          />
                        ) : (
                          <div className="min-h-[56px] flex items-center rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100">
                            {selectedTask.start_date ? formatDateOnly(selectedTask.start_date) : '-'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <label className="block !text-[32px] !leading-[1.1] !font-semibold text-slate-200 mb-1">
                          Bitiş Tarihi
                        </label>
                        {(user?.id === selectedTask.creator?.id || user?.role === 'admin') ? (
                          <input
                            type="date"
                            value={selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : ''}
                            onChange={(e) => handleDateChange(selectedTask.id, 'due_date', e.target.value)}
                            className="w-full min-h-[56px] rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60"
                          />
                        ) : (
                          <div className="min-h-[56px] flex items-center rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 !text-[32px] !leading-[1.1] text-slate-100">
                            {selectedTask.due_date ? formatDateOnly(selectedTask.due_date) : '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Açıklama */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <label className="block !text-[32px] !leading-[1.1] !font-semibold text-slate-200 mb-1">
                        Açıklama
                      </label>
                      <textarea
                        readOnly
                        value={selectedTask.description ?? ""}
                        rows={4}
                        className="flex-1 h-full min-h-0 w-full rounded-lg border border-white/10 bg-[#0d1b2a]/60 px-4 py-3 !text-[32px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/60 resize-y"
                      />
                    </div>

                    {/* Alt butonlar */}
                    <div className="sticky bottom-0 w-full border-t border-white/10 bg-[#0b1625]/90 backdrop-blur px-6 py-4">
                      <div className="max-w-3xl mx-auto flex justify-center gap-3">
                        <button
                          onClick={async () => {
                            try { await Tasks.toggleStatus(selectedTask.id); await loadTasks(); addNotification('Görev durumu değiştirildi', 'success'); }
                            catch { addNotification('Durum değiştirilemedi', 'error'); }
                          }}
                          className="h-11 px-5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[15px] font-medium transition-colors"
                        >
                          Durumu Değiştir
                        </button>
                        <button
                          onClick={async () => {
                            try { await Tasks.remind(selectedTask.id); addNotification('Hatırlatma gönderildi', 'success'); }
                            catch { addNotification('Hatırlatma gönderilemedi', 'error'); }
                          }}
                          className="h-11 px-5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[15px] font-medium transition-colors"
                        >
                          Hatırlat
                        </button>
                        <button
                          onClick={() => handleDeleteTask(selectedTask.id)}
                          className="h-11 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[15px] font-medium transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sağ panel – Açıklamalar (seninkiyle aynı, küçük revizyon yok) */}
                <div className="w-[360px] md:w-[420px] lg:w-[480px] max-w-[48%] shrink-0 bg-[#0f172a] flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-white/10 flex-none">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg md:text-xl font-semibold text-white">📢 Açıklamalar</h3>
                      <button
                        onClick={() => { if (user?.role === 'admin') setHistoryDeleteMode(v => !v); }}
                        className={`rounded px-2 py-1 ${user?.role === 'admin' ? 'text-neutral-300 hover:bg-white/10' : 'text-neutral-500 cursor-not-allowed'}`}
                        title={user?.role === 'admin' ? (historyDeleteMode ? 'Silme modunu kapat' : 'Silme modunu aç') : 'Sadece admin'}
                      >⚙️</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {Array.isArray(taskHistory) && taskHistory.length > 0 ? (
                      taskHistory.map((h) => (
                        <div key={h.id} className="bg-white/5 border border-white/10 p-3 rounded">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-blue-300 mb-1">{formatRelativeTime(h.created_at)}</div>
                              {h.field === 'comment' ? (
                                <div className="text-sm">
                                  <span className="font-medium text-white">{h.user?.name || 'Kullanıcı'}:</span>{' '}
                                  <span className="text-neutral-200">{renderHistoryValue(h.field, h.new_value)}</span>
                                </div>
                              ) : h.field === 'assigned_users' ? (
                                <div className="text-sm text-neutral-200 truncate">{h.user?.name || 'Kullanıcı'} kullanıcıları güncelledi.</div>
                              ) : h.field === 'attachments' ? (
                                <div className="text-sm text-neutral-200 truncate">{h.user?.name || 'Kullanıcı'} dosya ekledi/sildi.</div>
                              ) : (
                                <div className="text-sm">
                                  <span className="font-medium text-white">{h.user?.name || 'Kullanıcı'}</span>{' '}
                                  {renderFieldLabel(h.field)} değiştirdi: <span className="text-neutral-300">{renderHistoryValue(h.field, h.old_value)}</span> →{' '}
                                  <span className="text-neutral-300">{renderHistoryValue(h.field, h.new_value)}</span>
                                </div>
                              )}
                            </div>
                            {(user?.role === 'admin' && historyDeleteMode && h.field === 'comment') && (
                              <button
                                onClick={async () => { try { await Tasks.deleteHistory(selectedTask.id, h.id); const h2 = await Tasks.getHistory(selectedTask.id); setTaskHistory(Array.isArray(h2) ? h2 : []); addNotification('Yorum silindi', 'success'); } catch { addNotification('Silinemedi', 'error'); } }}
                                className="shrink-0 rounded px-2 py-1 text-rose-300 hover:text-white hover:bg-rose-600/30 text-xs"
                                title="Yorumu sil"
                              >🗑️</button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-neutral-400 py-4">Henüz görev geçmişi bulunmuyor</div>
                    )}

                    {Array.isArray(comments) && comments.map((c) => (
                      <div key={c.id} className="bg-white/5 border border-white/10 p-3 rounded">
                        <div className="text-[11px] text-neutral-400 mb-1">{formatRelativeTime(c.timestamp)}</div>
                        <div className="text-sm">
                          <span className="font-medium text-white">{c.author}</span> {c.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-white/10 flex-none">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="@bahset veya yorum yap"
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-2 text-neutral-300" />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="rounded-md px-3 py-2 text-sm text-white disabled:opacity-60"
                        style={{ backgroundColor: '#2563eb' }}
                      >
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* /Gövde */}
            </div>
          </div>
        </div>,
        document.body
      )
      }

      {/* Kullanıcı Paneli - basit placeholder, admin/üye ayrımı daha sonra */}
      {showUserPanel && createPortal(
        <div className="fixed inset-0 z-[100200]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowUserPanel(false)} />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[min(1200px,calc(100vw-48px))] max-h-[65vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,.6)] bg-[#111827] text-slate-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-center px-5 py-3 border-b border-white/10 bg-[#0f172a] relative">
                <h3 className="!text-[32px] font-semibold text-center">Kullanıcı Ayarları</h3>
                <button onClick={() => setShowUserPanel(false)} className="absolute" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                  <span className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10">✕</span>
                </button>
              </div>
              {/* Body */}
              <div className="flex min-w-0 divide-x divide-white/10 overflow-y-auto" style={{ height: 'calc(65vh - 56px)' }}>
                {/* Left - profile / admin create */}
                <div className="flex-1 min-w-0 p-6 space-y-4">
                  <div className="grid items-center gap-x-10 gap-y-4" style={{ gridTemplateColumns: '220px 1fr' }}>
                    <div className="text-neutral-300 !text-[32px]">İsim</div>
                    <div className="font-semibold !text-[32px] truncate">{user?.name}</div>

                    <div className="text-neutral-300 !text-[32px]">E-posta</div>
                    <div className="!text-[32px] truncate">{user?.email}</div>

                    <div className="text-neutral-300 !text-[32px]">Rol</div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 !text-[32px]">{getRoleText(user?.role)}</div>
                  </div>
                  {/* Şifre değiştirme kısayolu */}
                  <div className="border-t border-white/10 pt-4 mt-2">
                    <div className="!text-[32px] font-medium mb-2">Şifre Değiştir</div>
                    <PasswordChangeInline onDone={() => addNotification('Şifre güncellendi', 'success')} />
                  </div>
                  {user?.role === 'admin' && (
                    <div className="border-t border-white/10 pt-4">
                      <div className="!text-[32px] font-medium mb-2">Yeni Kullanıcı Ekle</div>
                      <AdminCreateUser />
                    </div>
                  )}
                </div>
                {/* Right - users list for admin */}
                <div className="w-[360px] shrink-0 p-6 bg-[#0f172a] overflow-y-auto">
                  <div className="text-sm font-semibold mb-3">Kullanıcılar</div>
                  {user?.role === 'admin' ? (
                    <div className="space-y-2">
                      {Array.isArray(users) && users.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2 gap-3">
                          <div className="text-sm truncate"><span className="font-medium">{u.name}</span></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              className="text-xs rounded px-2 py-1 bg-white/10 hover:bg-white/20"
                              value={u.role}
                              onChange={async (e) => { try { await updateUserAdmin(u.id, { role: e.target.value }); addNotification('Rol güncellendi', 'success'); await loadUsers(); } catch { addNotification('Güncellenemedi', 'error'); } }}
                            >
                              <option value="admin">Yönetici</option>
                              <option value="team_leader">Takım Lideri</option>
                              <option value="team_member">Takım Üyesi</option>
                              <option value="observer">Gözlemci</option>
                            </select>
                            <button className="text-xs rounded px-2 py-1 bg-rose-600 hover:bg-rose-700" onClick={async () => { if (!confirm('Silinsin mi?')) return; try { await deleteUserAdmin(u.id); addNotification('Kullanıcı silindi', 'success'); await loadUsers(); } catch { addNotification('Silinemedi', 'error'); } }}>Sil</button>
                          </div>
                        </div>
                      ))}
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