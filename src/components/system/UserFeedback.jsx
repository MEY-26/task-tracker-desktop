import { useState, useEffect } from 'react';
import { UserFeedback as UserFeedbackAPI } from '../../api';

export default function UserFeedback({ user, addNotification }) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ type: 'request', subject: '', message: '' });
  const [feedbackList, setFeedbackList] = useState([]);
  const [filterType, setFilterType] = useState('all');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (showAdminPanel && isAdmin) {
      loadFeedback();
    }
  }, [showAdminPanel, isAdmin]);

  async function loadFeedback() {
    try {
      setLoading(true);
      const data = await UserFeedbackAPI.list({ type: filterType === 'all' ? null : filterType });
      setFeedbackList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load feedback:', error);
      addNotification?.('Geri bildirimler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!formData.subject.trim() || !formData.message.trim()) {
      addNotification?.('Konu ve mesaj alanları zorunludur.', 'error');
      return;
    }

    try {
      setLoading(true);
      await UserFeedbackAPI.create({
        ...formData,
        user_id: user?.id
      });
      addNotification?.('Geri bildiriminiz başarıyla gönderildi. Teşekkürler!', 'success');
      setFormData({ type: 'request', subject: '', message: '' });
      setShowFeedbackModal(false);
    } catch (error) {
      addNotification?.('Geri bildirim gönderilemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu geri bildirimi silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      setLoading(true);
      await UserFeedbackAPI.delete(id);
      addNotification?.('Geri bildirim başarıyla silindi.', 'success');
      await loadFeedback();
    } catch (error) {
      addNotification?.('Geri bildirim silinemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id, status) {
    try {
      setLoading(true);
      await UserFeedbackAPI.update(id, { status });
      addNotification?.('Durum güncellendi.', 'success');
      await loadFeedback();
    } catch (error) {
      addNotification?.('Durum güncellenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    in_progress: 'bg-blue-500/20 text-blue-300',
    resolved: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300'
  };

  const statusLabels = {
    pending: 'Beklemede',
    in_progress: 'İşleniyor',
    resolved: 'Çözüldü',
    rejected: 'Reddedildi'
  };

  const typeLabels = {
    request: 'İstek',
    bug: 'Hata',
    suggestion: 'Öneri',
    other: 'Diğer'
  };

  return (
    <>
      {/* Geri Bildirim Butonu - Tüm kullanıcılar için */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm font-medium"
        title="Geri Bildirim Gönder"
      >
        💬 Geri Bildirim
      </button>

      {/* Admin Panel Butonu - Sadece admin için */}
      {isAdmin && (
        <button
          onClick={() => {
            setShowAdminPanel(true);
            setShowFeedbackModal(false);
            loadFeedback();
          }}
          className="px-4 py-2 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition-colors text-sm font-medium"
          title="Geri Bildirim Yönetimi"
        >
          📋 Geri Bildirim Yönetimi
        </button>
      )}

      {/* Geri Bildirim Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFeedbackModal(false)} />
          <div className="relative bg-gray-900 rounded-lg shadow-xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-white">Geri Bildirim Gönder</h2>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tür</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-white"
                  >
                    <option value="request">İstek</option>
                    <option value="bug">Hata Bildirimi</option>
                    <option value="suggestion">Öneri</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Konu</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-gray-400"
                    placeholder="Kısa bir konu başlığı"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mesaj</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full rounded bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-gray-400 resize-none"
                    rows="8"
                    placeholder="Detaylı açıklama yazın..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdminPanel(false)} />
          <div className="relative bg-gray-900 rounded-lg shadow-xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-white">Geri Bildirim Yönetimi</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-neutral-300 rounded px-2 py-1 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-6 border-b border-white/10">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFilterType('all');
                    loadFeedback();
                  }}
                  className={`px-4 py-2 rounded transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => {
                    setFilterType('request');
                    loadFeedback();
                  }}
                  className={`px-4 py-2 rounded transition-colors ${filterType === 'request' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                >
                  İstekler
                </button>
                <button
                  onClick={() => {
                    setFilterType('bug');
                    loadFeedback();
                  }}
                  className={`px-4 py-2 rounded transition-colors ${filterType === 'bug' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                >
                  Hatalar
                </button>
                <button
                  onClick={() => {
                    setFilterType('suggestion');
                    loadFeedback();
                  }}
                  className={`px-4 py-2 rounded transition-colors ${filterType === 'suggestion' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                >
                  Öneriler
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
              ) : feedbackList.length === 0 ? (
                <div className="text-center text-gray-400 py-8">Henüz geri bildirim bulunmamaktadır.</div>
              ) : (
                <div className="space-y-4">
                  {feedbackList.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="p-4 rounded-lg border border-white/10 bg-white/5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[feedback.status] || statusColors.pending}`}>
                              {statusLabels[feedback.status] || 'Bilinmiyor'}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-gray-600/20 text-gray-300">
                              {typeLabels[feedback.type] || feedback.type}
                            </span>
                          </div>
                          <h4 className="text-base font-semibold text-white mb-1">{feedback.subject}</h4>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap mb-2">{feedback.message}</p>
                          <div className="text-xs text-gray-500">
                            <span>{feedback.user?.name || 'Bilinmeyen Kullanıcı'}</span>
                            <span className="mx-2">•</span>
                            <span>
                              {new Date(feedback.created_at).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {feedback.status !== 'resolved' && (
                          <button
                            onClick={() => handleUpdateStatus(feedback.id, 'resolved')}
                            className="px-3 py-1 rounded bg-green-600/20 hover:bg-green-600/30 text-green-300 text-sm"
                          >
                            Çözüldü
                          </button>
                        )}
                        {feedback.status !== 'in_progress' && (
                          <button
                            onClick={() => handleUpdateStatus(feedback.id, 'in_progress')}
                            className="px-3 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm"
                          >
                            İşleniyor
                          </button>
                        )}
                        {feedback.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(feedback.id, 'rejected')}
                            className="px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm"
                          >
                            Reddet
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(feedback.id)}
                          className="px-3 py-1 rounded bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 text-sm ml-auto"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

