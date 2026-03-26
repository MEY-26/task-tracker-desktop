import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PasswordReset, getDepartments } from '../../api';
import { PermissionManagementModal } from '../modals/PermissionManagementModal';

function UserPanel({
  open,
  onClose,
  currentTheme,
  user,
  AdminCreateUserComponent,
  adminCreateUserProps,
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
  passwordResetRequests = [],
  loadWeeklyGoals
}) {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [bulkRole, setBulkRole] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const selectAllCheckboxRef = useRef(null);
  /** Tek seçimde toplu alanları yalnızca o kullanıcı ilk seçildiğinde DB'den doldur; users yenilenince düzenlemeyi ezme. */
  const lastBulkSyncedSingleUserIdRef = useRef(null);
  const CreateUserForm = AdminCreateUserComponent;

  const selectableUsers = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => u.role !== 'observer') : []),
    [users]
  );
  const selectedTargetUsers = selectedUsers.filter((id) => {
    const matched = users?.find((x) => x.id === id);
    return matched && matched.role !== 'observer';
  });
  const canApplyBulk = selectedTargetUsers.length > 0 && !!(bulkLeaderId || bulkDepartment || bulkRole);

  useEffect(() => {
    if (open) {
      getDepartments().then(setDepartments);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      lastBulkSyncedSingleUserIdRef.current = null;
      return;
    }
    if (selectedTargetUsers.length === 0) {
      lastBulkSyncedSingleUserIdRef.current = null;
      setBulkLeaderId('');
      setBulkDepartment('');
      setBulkRole('');
      return;
    }
    if (selectedTargetUsers.length > 1) {
      lastBulkSyncedSingleUserIdRef.current = null;
      return;
    }
    const singleId = selectedTargetUsers[0];
    if (lastBulkSyncedSingleUserIdRef.current === singleId) {
      return;
    }
    const single = users?.find((u) => u.id === singleId);
    if (!single) return;
    lastBulkSyncedSingleUserIdRef.current = singleId;
    setBulkRole(single.role || '');
    setBulkDepartment(single.department ? single.department : 'remove');
    if (single.role === 'team_member') {
      setBulkLeaderId(single.leader_id ? String(single.leader_id) : 'remove');
    } else {
      setBulkLeaderId('');
    }
  }, [open, selectedTargetUsers, users, setBulkLeaderId, setBulkDepartment, setBulkRole]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    const hasSome = selectableUsers.length > 0 && selectedUsers.length > 0;
    const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedUsers.includes(u.id));
    el.indeterminate = hasSome && !allSelected;
  }, [selectableUsers, selectedUsers]);

  const handleApplyBulk = async () => {
    if (!canApplyBulk) return;

    const toUpdate = selectedTargetUsers;
    if (toUpdate.length === 0) return;

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const userId of toUpdate) {
        const currentUser = users?.find((x) => x.id === userId);
        if (!currentUser) continue;

        const payload = {};
        const targetRole = bulkRole || currentUser.role;

        if (bulkRole) payload.role = bulkRole;
        if (bulkDepartment === 'remove') {
          payload.department = null;
        } else if (bulkDepartment) {
          payload.department = bulkDepartment;
        }

        if (bulkLeaderId) {
          if (targetRole === 'team_member') {
            payload.leader_id = bulkLeaderId === 'remove' ? null : parseInt(bulkLeaderId, 10);
          }
        }

        if (Object.keys(payload).length === 0) continue;

        try {
          await updateUserAdmin(userId, payload);
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
      setBulkDepartment('');
      setBulkRole('');
    } catch (err) {
      console.error('Bulk update error:', err);
      addNotification('Toplu güncelleme başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

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
            {user?.role === 'admin' && (
              <div className="flex gap-0" style={{ padding: '0 16px' }}>
                <button
                  onClick={() => setActiveTab('users')}
                  className="transition-colors"
                  style={{
                    padding: '8px 20px',
                    borderBottom: activeTab === 'users' ? `4px solid ${currentTheme.accent}` : '2px solid transparent',
                    color: activeTab === 'users' ? currentTheme.accent : currentTheme.textSecondary,
                    fontWeight: activeTab === 'users' ? 600 : 400,
                    backgroundColor: 'transparent',
                  }}
                >
                  Kullanıcı Listesi
                </button>
                <button
                  onClick={() => setActiveTab('addUser')}
                  className="transition-colors"
                  style={{
                    padding: '8px 20px',
                    borderBottom: activeTab === 'addUser' ? `4px solid ${currentTheme.accent}` : '2px solid transparent',
                    color: activeTab === 'addUser' ? currentTheme.accent : currentTheme.textSecondary,
                    fontWeight: activeTab === 'addUser' ? 600 : 400,
                    backgroundColor: 'transparent',
                  }}
                >
                  Yeni Kullanıcı Ekle
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden flex-col" style={{ borderLeft: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
            {(activeTab === 'users' || user?.role !== 'admin') && (
              <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden w-full">
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
                <div className="border rounded-[20px] w-full max-w-full" style={{ marginBottom: '10px', padding: '12px 16px', backgroundColor: currentTheme.accent + '20', borderColor: currentTheme.border, boxSizing: 'border-box' }}>
                  <div className="flex items-center gap-3 flex-wrap">
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
                      title={bulkLeaderId && bulkLeaderId !== 'remove' ? users.find(u => u.id == bulkLeaderId)?.name + ' (' + getRoleText(users.find(u => u.id == bulkLeaderId)?.role) + ')' : bulkLeaderId === 'remove' ? 'Lideri Kaldır' : 'Lider Seçimi'}
                    >
                      <option value="">Lider Seçimi</option>
                      <option value="remove">Lideri Kaldır</option>
                      {Array.isArray(users) && users
                        .filter(u => u.role === 'team_leader' || u.role === 'admin')
                        .map(leader => (
                          <option key={`bulk-${leader.id}`} value={leader.id} title={`${leader.name} (${getRoleText(leader.role)})`}>
                            {leader.name} ({getRoleText(leader.role)})
                          </option>
                        ))}
                    </select>
                    <select
                      value={bulkDepartment}
                      onChange={(e) => setBulkDepartment(e.target.value)}
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
                    >
                      <option value="">Departman Seçimi</option>
                      <option value="remove">Departman Yok</option>
                      {departments.map((dep) => (
                        <option key={`bulk-dep-${dep}`} value={dep}>{dep}</option>
                      ))}
                    </select>
                    <select
                      value={bulkRole}
                      onChange={(e) => setBulkRole(e.target.value)}
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
                      className="rounded !py-2 !text-[16px] focus:outline-none !h-[35px] !max-w-[180px] !w-[180px] truncate"
                    >
                      <option value="">Rol Seçimi</option>
                      <option value="admin">Yönetici</option>
                      <option value="team_leader">Takım Lideri</option>
                      <option value="team_member">Takım Üyesi</option>
                      <option value="observer">Gözlemci</option>
                    </select>
                    <button
                      onClick={handleApplyBulk}
                      disabled={!canApplyBulk}
                      className="px-3 py-2 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: canApplyBulk ? currentTheme.accent : currentTheme.border,
                        color: '#ffffff',
                        cursor: canApplyBulk ? 'pointer' : 'not-allowed',
                        opacity: canApplyBulk ? '1' : '0.6'
                      }}
                    >
                      Uygula
                    </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={async () => {
                        const toDelete = selectedUsers.filter(id => users?.find(x => x.id === id));
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
                      disabled={selectedUsers.length === 0}
                      className="px-3 py-2 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: selectedUsers.length > 0 ? '#ef4444' : currentTheme.border,
                        color: '#ffffff',
                        cursor: selectedUsers.length > 0 ? 'pointer' : 'not-allowed',
                        opacity: selectedUsers.length > 0 ? 1 : 0.6
                      }}
                      onMouseEnter={(e) => {
                        if (selectedUsers.length > 0) e.target.style.backgroundColor = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = selectedUsers.length > 0 ? '#ef4444' : currentTheme.border;
                      }}
                      title="Seçili kullanıcıları sil"
                    >
                      Seçili Kullanıcıları Sil
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => selectedUsers.length > 0 && setShowPermissionModal(true)}
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
                      title={selectedUsers.length > 0 ? 'Seçili kullanıcılara izin ver (tatil veya özel düzenleme)' : 'Önce kullanıcı seçin'}
                    >
                      İzin Yönetimi
                    </button>
                  )}
                  </div>
                </div>
              </div>
              </div>
              {user?.role === 'admin' && (
              <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 items-center px-4 py-3 border-b shrink-0" style={{ borderColor: currentTheme.border, color: currentTheme.textSecondary, fontSize: '14px', fontWeight: 600, margin: '0px 20px 0px 21px' }}>
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    ref={selectAllCheckboxRef}
                    checked={selectableUsers.length > 0 && selectableUsers.every((u) => selectedUsers.includes(u.id))}
                    onChange={() => {
                      const allSelectableIds = selectableUsers.map((u) => u.id);
                      const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedUsers.includes(id));
                      if (isAllSelected) {
                        setSelectedUsers([]);
                        setBulkLeaderId('');
                        setBulkDepartment('');
                        setBulkRole('');
                        setUserSearchTerm?.('');
                      } else {
                        setSelectedUsers(allSelectableIds);
                      }
                    }}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: currentTheme.accent }}
                  />
                </div>
                <div>Ad Soyad</div>
                <div style={{ marginLeft: '10px' }}>Mail Adresi</div>
                <div className="text-center">Şifre Sıfırla</div>
              </div>
              )}
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
                          u.email?.toLowerCase().includes(searchTerm)
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
                          className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 items-center rounded-lg px-4 py-3 transition-colors"
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
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(u.id)}
                              disabled={u.role === 'observer'}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers(prev => [...prev, u.id]);
                                } else {
                                  setSelectedUsers(prev => prev.filter(id => id !== u.id));
                                }
                              }}
                              className={`w-4 h-4 rounded focus:ring-blue-500 ${u.role === 'observer'
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                                }`}
                              style={{
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                borderColor: currentTheme.border,
                                accentColor: currentTheme.accent
                              }}
                            />
                          </div>
                          <div className="text-base font-medium truncate min-w-0" style={{ color: currentTheme.text }} title={u.name}>{u.name}</div>
                          <div className="text-sm truncate min-w-0" style={{ color: currentTheme.textSecondary || currentTheme.text }} title={u.email}>{u.email}</div>
                          <div className="flex items-center justify-center">
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
                        u.email?.toLowerCase().includes(searchTerm)
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
            )}
            {activeTab === 'addUser' && user?.role === 'admin' && (
              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden w-full" style={{ padding: '20px 30px' }}>
                {CreateUserForm ? (
                  <CreateUserForm
                    {...adminCreateUserProps}
                    departments={departments}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
      {showPermissionModal && (
        <PermissionManagementModal
          open={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          selectedUserIds={selectedUsers}
          users={users}
          addNotification={addNotification}
          loadWeeklyGoals={loadWeeklyGoals}
          onSuccess={() => {
            setSelectedUsers([]);
          }}
        />
      )}
    </div>,
    document.body
  );
}

export default UserPanel;
