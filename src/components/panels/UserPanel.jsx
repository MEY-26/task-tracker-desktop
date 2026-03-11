import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PasswordReset } from '../../api';
import { EditGrantModal } from '../modals/EditGrantModal';

function UserPanel({
  open,
  onClose,
  currentTheme,
  user,
  AdminCreateUser,
  userSearchTerm,
  setUserSearchTerm,
  users,
  selectedUsers,
  setSelectedUsers,
  bulkLeaderId,
  setBulkLeaderId,
  getRoleText,
  updateUserAdmin,
  addNotification,
  loadUsers,
  setLoading,
  loadPasswordResetRequests,
  deleteUserAdmin,
  passwordResetRequests = []
}) {
  const [showEditGrantModal, setShowEditGrantModal] = useState(false);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999993]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
      <div className="relative flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1445px] h-[85vh] max-h-[85vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] flex flex-col overflow-hidden"
          style={{
            pointerEvents: 'auto',
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            borderColor: currentTheme.border,
            borderWidth: '1px',
            borderStyle: 'solid',
            color: currentTheme.text
          }} onClick={(e) => e.stopPropagation()}>
          <div className="border-b flex-none shrink-0" style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, padding: '0px 10px' }}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="justify-self-start"></div>
              <h2 className="text-xl md:text-2xl font-semibold text-center" style={{ color: currentTheme.text }}>Kullanıcı Yönetimi</h2>
              <div className="justify-self-end">
                <button
                  onClick={onClose}
                  className="rounded-lg px-2 py-1 transition-colors"
                  style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.target.style.color = currentTheme.text;
                    e.target.style.backgroundColor = `${currentTheme.border}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = currentTheme.textSecondary;
                    e.target.style.backgroundColor = 'transparent';
                  }}
                  aria-label="Kapat"
                >✕</button>
              </div>
            </div>
          </div>
          <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden" style={{ borderLeft: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}` }}>
            <div className="w-2/5 min-w-0 overflow-y-auto overflow-x-hidden" style={{ paddingRight: '20px', paddingLeft: '20px', borderRight: `1px solid ${currentTheme.border}` }}>
              {user?.role === 'admin' && (
                <div className="pt-4" style={{ paddingTop: '5px' }}>
                  <div className="font-medium mb-2 !text-[32px]" style={{ paddingBottom: '10px' }}>Yeni Kullanıcı Ekle</div>
                  <AdminCreateUser />
                </div>
              )}
            </div>
            <div className="w-3/5 shrink-0 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
              <div className="flex flex-col flex-none min-w-0 overflow-x-hidden" style={{ padding: '0 30px 10px 20px' }}>
              <div className="flex items-center gap-3 text-[24px] font-semibold mb-4" style={{ marginBottom: '10px', marginTop: '10px'}}>
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border px-3 py-2 !text-[18px] focus:outline-none"
                  style={{
                    color: currentTheme.text,
                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                    borderColor: currentTheme.border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    height: '40px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = currentTheme.accent;
                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                    e.target.setAttribute('autocomplete', 'off');
                    e.target.setAttribute('autocorrect', 'off');
                    e.target.setAttribute('autocapitalize', 'off');
                    e.target.setAttribute('spellcheck', 'false');
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = currentTheme.border;
                    e.target.style.boxShadow = 'none';
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  name="user-search"
                  id="user-search"
                  onInput={(e) => {
                    if (e.target.value && !e.isTrusted) {
                      e.target.value = '';
                      setUserSearchTerm('');
                    }
                  }}
                />
              </div>
              <div className="text-[16px] font-semibold mb-4">
                <div className="flex items-center justify-evenly gap-6 flex-wrap border rounded-[20px] w-full max-w-full" style={{ marginBottom: '10px', paddingTop: '10px', paddingBottom: '10px', paddingLeft: '16px', paddingRight: '16px', backgroundColor: currentTheme.accent + '20', borderColor: currentTheme.border, boxSizing: 'border-box' }}>
                  <div className="flex items-center gap-3">
                  <select
                    value={bulkLeaderId}
                    onChange={(e) => setBulkLeaderId(e.target.value)}
                    style={{
                      paddingLeft: '5px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    className="rounded !py-2 !text-[16px] focus:outline-none !h-[35px] !max-w-[220px] !w-[220px] truncate"
                    onFocus={(e) => {
                      e.target.style.borderColor = currentTheme.accent;
                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = currentTheme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                    title={bulkLeaderId && bulkLeaderId !== 'remove' ? users.find(u => u.id == bulkLeaderId)?.name + ' (' + getRoleText(users.find(u => u.id == bulkLeaderId)?.role) + ')' : bulkLeaderId === 'remove' ? 'Lideri Kaldır' : 'Lider Seçin'}
                  >
                    <option value="">Lider Seçin</option>
                    <option value="remove">Lideri Kaldır</option>
                    {Array.isArray(users) && users
                      .filter(u => u.role === 'team_leader' || u.role === 'admin')
                      .map(leader => (
                        <option key={`bulk-${leader.id}`} value={leader.id} title={`${leader.name} (${getRoleText(leader.role)})`}>
                          {leader.name} ({getRoleText(leader.role)})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!bulkLeaderId) return;
                      const toUpdate = selectedUsers.filter(id => (users?.find(x => x.id === id))?.role === 'team_member');
                      if (toUpdate.length === 0) return;
                      const leaderId = bulkLeaderId === 'remove' ? null : parseInt(bulkLeaderId);
                      const leaderName = bulkLeaderId === 'remove' ? 'Lideri Kaldır' :
                        users.find(u => u.id === leaderId)?.name || 'Bilinmeyen';
                      if (!confirm(`${toUpdate.length} takım üyesine "${leaderName}" lider olarak atanacak. Devam etmek istiyor musunuz?`)) {
                        return;
                      }
                      try {
                        setLoading(true);
                        let successCount = 0;
                        let errorCount = 0;

                        for (const userId of toUpdate) {
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
                    disabled={!bulkLeaderId || selectedUsers.filter(id => (users?.find(x => x.id === id))?.role === 'team_member').length === 0}
                    className="px-3 py-2 rounded text-sm transition-colors"
                    style={{
                      backgroundColor: (!bulkLeaderId || selectedUsers.filter(id => (users?.find(x => x.id === id))?.role === 'team_member').length === 0) ? currentTheme.border : currentTheme.accent,
                      color: '#ffffff',
                      cursor: (!bulkLeaderId || selectedUsers.filter(id => (users?.find(x => x.id === id))?.role === 'team_member').length === 0) ? 'not-allowed' : 'pointer',
                      opacity: (!bulkLeaderId || selectedUsers.filter(id => (users?.find(x => x.id === id))?.role === 'team_member').length === 0) ? '0.6' : '1'
                    }}
                    onMouseEnter={(e) => {
                      if (bulkLeaderId && selectedUsers.filter(id => (users?.find(x => x.id === id))?.role === 'team_member').length > 0) {
                        const hex = currentTheme.accent.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        e.target.style.backgroundColor = brightness > 128
                          ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                          : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = (!bulkLeaderId || selectedUsers.filter(id => (users?.find(x => x.id === id))?.role === 'team_member').length === 0) ? currentTheme.border : currentTheme.accent;
                    }}
                  >
                    Uygula
                  </button>
                  </div>
                  <div style={{ width: '1px', height: '28px', backgroundColor: currentTheme.border, flexShrink: 0 }} aria-hidden="true" />
                  <div className="flex items-center gap-6 flex-wrap">
                  {user?.role === 'admin' && (
                    <button
                      onClick={async () => {
                        const toDelete = selectedUsers.filter(id => (users?.find(x => x.id === id))?.role !== 'admin');
                        if (toDelete.length === 0) return;
                        if (!confirm(`${toDelete.length} kullanıcı silinecek. Bu işlem geri alınamaz. Emin misiniz?`)) return;
                        try {
                          setLoading(true);
                          let successCount = 0;
                          let errorCount = 0;
                          for (const userId of toDelete) {
                            try {
                              await deleteUserAdmin(userId);
                              successCount++;
                            } catch {
                              errorCount++;
                            }
                          }
                          if (successCount > 0) {
                            addNotification(`${successCount} kullanıcı silindi`, 'success');
                            await loadUsers();
                            setSelectedUsers(prev => prev.filter(id => !toDelete.includes(id)));
                          }
                          if (errorCount > 0) addNotification(`${errorCount} kullanıcı silinemedi`, 'error');
                        } catch {
                          addNotification('Silme işlemi başarısız', 'error');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={selectedUsers.filter(id => (users?.find(x => x.id === id))?.role !== 'admin').length === 0}
                      className="px-3 py-2 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: selectedUsers.filter(id => (users?.find(x => x.id === id))?.role !== 'admin').length > 0 ? '#ef4444' : currentTheme.border,
                        color: '#ffffff',
                        cursor: selectedUsers.filter(id => (users?.find(x => x.id === id))?.role !== 'admin').length > 0 ? 'pointer' : 'not-allowed',
                        opacity: selectedUsers.filter(id => (users?.find(x => x.id === id))?.role !== 'admin').length > 0 ? 1 : 0.6
                      }}
                      onMouseEnter={(e) => {
                        if (selectedUsers.filter(id => (users?.find(x => x.id === id))?.role !== 'admin').length > 0)
                          e.target.style.backgroundColor = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = selectedUsers.filter(id => (users?.find(x => x.id === id))?.role !== 'admin').length > 0 ? '#ef4444' : currentTheme.border;
                      }}
                      title="Seçili kullanıcıları sil (admin silinemez)"
                    >
                      Kullanıcıları Sil
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => selectedUsers.length > 0 && setShowEditGrantModal(true)}
                      disabled={selectedUsers.length === 0}
                      className="px-3 py-2 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: selectedUsers.length > 0 ? '#10b981' : currentTheme.border,
                        color: '#ffffff',
                        cursor: selectedUsers.length > 0 ? 'pointer' : 'not-allowed',
                        opacity: selectedUsers.length > 0 ? 1 : 0.6
                      }}
                      onMouseEnter={(e) => {
                        if (selectedUsers.length > 0) e.target.style.backgroundColor = '#059669';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = selectedUsers.length > 0 ? '#10b981' : currentTheme.border;
                      }}
                      title={selectedUsers.length > 0 ? 'Seçili kullanıcılara haftalık hedef düzenleme izni ver' : 'Önce kullanıcı seçin'}
                    >
                      Özel Düzenleme İzni Ver
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedUsers([]); setBulkLeaderId(''); }}
                    className="px-3 py-2 rounded text-sm transition-colors"
                    style={{
                      backgroundColor: currentTheme.border,
                      color: currentTheme.text
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = currentTheme.accent;
                      e.target.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = currentTheme.border;
                      e.target.style.color = currentTheme.text;
                    }}
                  >
                    İptal
                  </button>
                  </div>
                </div>
              </div>
              </div>
              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden" style={{ padding: '0 20px 20px 20px', scrollbarGutter: 'stable' }}>
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
                          className="rounded-lg px-4 py-4 gap-4 transition-colors"
                          style={{
                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                            borderColor: hasResetRequest ? '#ef4444' : currentTheme.border,
                            borderWidth: hasResetRequest ? '2px' : '1px',
                            borderStyle: 'solid'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.accent + '20';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                          }}
                        >
                          <div className="flex items-center justify-between" style={{ paddingRight: '5px' }}>
                            <div className="min-w-0 flex text-[16px] items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(u.id)}
                                disabled={u.role === 'admin' || u.role === 'observer'}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUsers(prev => [...prev, u.id]);
                                  } else {
                                    setSelectedUsers(prev => prev.filter(id => id !== u.id));
                                  }
                                }}
                                className={`w-4 h-4 rounded focus:ring-blue-500 ${u.role === 'admin' || u.role === 'observer'
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer'
                                  }`}
                                style={{
                                  scale: '3',
                                  marginLeft: '15px',
                                  marginRight: '20px',
                                  backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                  borderColor: currentTheme.border,
                                  accentColor: currentTheme.accent
                                }}
                              />
                              <div className="flex-1 min-w-0 max-w-[300px]">
                                <div className="text-base font-medium truncate" style={{ color: currentTheme.text }} title={u.name}>{u.name}</div>
                                <div className="text-xs truncate mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }} title={u.email}>{u.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {(u.role === 'team_member') && (
                                <select
                                  className="!text-[16px] rounded px-3 py-2 focus:outline-none !max-w-[200px] !w-[200px] truncate transition-colors"
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
                                  style={{
                                    padding: '5px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = currentTheme.accent + '20';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                                  }}
                                  title={u.leader_id ? users.find(x => x.id === u.leader_id)?.name + ' (' + getRoleText(users.find(x => x.id === u.leader_id)?.role) + ')' : 'Lider Yok'}
                                >
                                  <option value="">Lider Yok</option>
                                  {Array.isArray(users) && users.filter(x => x.role === 'team_leader' || x.role === 'admin').map(l => (
                                    <option key={`ldr-${l.id}`} value={l.id} title={`${l.name} (${getRoleText(l.role)})`}>{l.name} ({getRoleText(l.role)})</option>
                                  ))}
                                </select>
                              )}
                              <button
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
                                className="inline-flex items-center justify-center text-[14px] transition-colors"
                                style={{
                                  width: '35px',
                                  height: '35px',
                                  borderRadius: '9999px',
                                  backgroundColor: currentTheme.accent,
                                  color: '#ffffff'
                                }}
                                onMouseEnter={(e) => {
                                  const hex = currentTheme.accent.replace('#', '');
                                  const r = parseInt(hex.substr(0, 2), 16);
                                  const g = parseInt(hex.substr(2, 2), 16);
                                  const b = parseInt(hex.substr(4, 2), 16);
                                  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                  e.target.style.backgroundColor = brightness > 128
                                    ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                    : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = currentTheme.accent;
                                }}
                                title='Şifreyi "123456" olarak sıfırla'
                              >
                                ↺
                              </button>
                              <div className="flex items-center gap-2">
                                <select
                                  className="text-[16px] rounded px-3 py-2 focus:outline-none !max-w-[120px] !w-[120px] transition-colors"
                                  value={u.role}
                                  onChange={async (e) => { try { await updateUserAdmin(u.id, { role: e.target.value }); addNotification('Rol güncellendi', 'success'); await loadUsers(); } catch { addNotification('Güncellenemedi', 'error'); } }}
                                  style={{
                                    padding: '5px',
                                    marginLeft: '10px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = currentTheme.accent + '20';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                                  }}
                                  title={getRoleText(u.role)}
                                >
                                  <option value="admin">Yönetici</option>
                                  <option value="team_leader">Takım Lideri</option>
                                  <option value="team_member">Takım Üyesi</option>
                                  <option value="observer">Gözlemci</option>
                                </select>
                              </div>
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
                      <div className="text-center py-4" style={{ color: currentTheme.textSecondary || currentTheme.text }}>
                        {userSearchTerm ? `"${userSearchTerm}" için kullanıcı bulunamadı` : 'Seçilen filtreye uygun kullanıcı bulunamadı'}
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-xs" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Yalnızca admin kullanıcı listesi görüntüler.</div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showEditGrantModal && (
        <EditGrantModal
          open={showEditGrantModal}
          onClose={() => setShowEditGrantModal(false)}
          selectedUserIds={selectedUsers}
          users={users}
          addNotification={addNotification}
          onSuccess={() => {
            addNotification('Özel düzenleme izni verildi', 'success');
            setSelectedUsers([]);
          }}
        />
      )}
    </div>,
    document.body
  );
}

export default UserPanel;
