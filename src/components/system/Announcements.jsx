import { useState, useEffect } from 'react';
import { Announcements as AnnouncementsAPI } from '../../api';

export default function Announcements({ user, addNotification }) {
  const [announcements, setAnnouncements] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', priority: 'normal' });
  const [editingId, setEditingId] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      setLoading(true);
      const data = await AnnouncementsAPI.list();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      addNotification?.('Duyurular yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.title.trim() || !formData.message.trim()) {
      addNotification?.('Başlık ve mesaj alanları zorunludur.', 'error');
      return;
    }

    try {
      setLoading(true);
      await AnnouncementsAPI.create(formData);
      addNotification?.('Duyuru başarıyla oluşturuldu.', 'success');
      setFormData({ title: '', message: '', priority: 'normal' });
      await loadAnnouncements();
    } catch (error) {
      addNotification?.('Duyuru oluşturulamadı.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!formData.title.trim() || !formData.message.trim()) {
      addNotification?.('Başlık ve mesaj alanları zorunludur.', 'error');
      return;
    }

    try {
      setLoading(true);
      await AnnouncementsAPI.update(editingId, formData);
      addNotification?.('Duyuru başarıyla güncellendi.', 'success');
      setFormData({ title: '', message: '', priority: 'normal' });
      setEditingId(null);
      await loadAnnouncements();
    } catch (error) {
      addNotification?.('Duyuru güncellenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      setLoading(true);
      await AnnouncementsAPI.delete(id);
      addNotification?.('Duyuru başarıyla silindi.', 'success');
      await loadAnnouncements();
    } catch (error) {
      addNotification?.('Duyuru silinemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id) {
    try {
      await AnnouncementsAPI.markAsRead(id);
      await loadAnnouncements();
    } catch (error) {
      console.error('Failed to mark announcement as read:', error);
    }
  }

  function startEdit(announcement) {
    setFormData({
      title: announcement.title || '',
      message: announcement.message || '',
      priority: announcement.priority || 'normal'
    });
    setEditingId(announcement.id);
    setShowAdminPanel(true);
  }

  function cancelEdit() {
    setFormData({ title: '', message: '', priority: 'normal' });
    setEditingId(null);
  }

  const unreadCount = announcements.filter(a => !a.is_read).length;
  const priorityColors = {
    low: 'bg-blue-500/20 border-blue-500/50',
    normal: 'bg-yellow-500/20 border-yellow-500/50',
    high: 'bg-orange-500/20 border-orange-500/50',
    urgent: 'bg-red-500/20 border-red-500/50'
  };

  return (
    <>
      {/* Duyurular Butonu - Tüm kullanıcılar için */}
      <button
        onClick={() => setShowAnnouncements(true)}
        className="relative px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm font-medium"
        title="Duyurular"
      >
        📢 Duyurular
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Admin Panel Butonu - Sadece admin için */}
      {isAdmin && (
        <button
          onClick={() => {
            setShowAdminPanel(true);
            setShowAnnouncements(false);
          }}
          className="px-4 py-2 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 transition-colors text-sm font-medium"
          title="Duyuru Yönetimi"
        >
          ⚙️ Duyuru Yönetimi
        </button>
      )}

      {/* Duyurular Modal */}
      {showAnnouncements && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAnnouncements(false)} />
          <div className="relative bg-gray-900 rounded-lg shadow-xl border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-white">Duyurular</h2>
              <button
                onClick={() => setShowAnnouncements(false)}
                className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
              ) : announcements.length === 0 ? (
                <div className="text-center text-gray-400 py-8">Henüz duyuru bulunmamaktadır.</div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`p-4 rounded-lg border ${priorityColors[announcement.priority] || priorityColors.normal} ${!announcement.is_read ? 'ring-2 ring-blue-500/50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
                        <span className="text-xs text-gray-400">
                          {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{announcement.message}</p>
                      {!announcement.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(announcement.id)}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Okundu olarak işaretle
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            setShowAdminPanel(false);
            cancelEdit();
          }} />
          <div className="relative bg-gray-900 rounded-lg shadow-xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-white">Duyuru Yönetimi</h2>
              <button
                onClick={() => {
                  setShowAdminPanel(false);
                  cancelEdit();
                }}
                className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Form */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editingId ? 'Duyuru Düzenle' : 'Yeni Duyuru Oluştur'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Başlık</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-gray-400"
                      placeholder="Duyuru başlığı"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Mesaj</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-gray-400 resize-none"
                      rows="5"
                      placeholder="Duyuru mesajı"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Öncelik</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-white"
                    >
                      <option value="low">Düşük</option>
                      <option value="normal">Normal</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={editingId ? handleUpdate : handleCreate}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Oluştur')}
                    </button>
                    {editingId && (
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                      >
                        İptal
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mevcut Duyurular Listesi */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Mevcut Duyurular</h3>
                {loading ? (
                  <div className="text-center text-gray-400 py-4">Yükleniyor...</div>
                ) : announcements.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">Henüz duyuru bulunmamaktadır.</div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`p-4 rounded-lg border ${priorityColors[announcement.priority] || priorityColors.normal}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-white">{announcement.title}</h4>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{announcement.message}</p>
                            <span className="text-xs text-gray-500 mt-1 block">
                              {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => startEdit(announcement)}
                              className="px-3 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDelete(announcement.id)}
                              className="px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm"
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

