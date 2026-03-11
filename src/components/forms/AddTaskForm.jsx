import React from 'react';
import { PriorityLabelWithTooltip } from '../shared/PriorityLabelWithTooltip';

export function AddTaskForm({
  open,
  onClose,
  currentTheme,
  error,
  newTask,
  setNewTask,
  getAllTaskTypes,
  getEligibleResponsibleUsers,
  getEligibleAssignedUsers,
  users,
  handleAddTask,
  manuallyRemovedUsersRef,
  addingTask,
  uploadProgress,
  assigneeSearch,
  setAssigneeSearch,
  showAssigneeDropdown,
  setShowAssigneeDropdown,
  loadUsers,
  user
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999999]" style={{ pointerEvents: 'auto' }}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `${currentTheme.background}CC`, pointerEvents: 'auto' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex items-center justify-center p-2 sm:p-4 min-h-full" style={{ pointerEvents: 'auto' }}>
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1440px] max-h-[100vh] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
          pointerEvents: 'auto',
          paddingRight: '5px',
          backgroundColor: currentTheme.tableBackground || currentTheme.background,
          borderColor: currentTheme.border,
          borderWidth: '1px',
          borderStyle: 'solid',
          color: currentTheme.text
        }} onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3"
            style={{
              borderBottom: `1px solid ${currentTheme.border}`,
              backgroundColor: currentTheme.background
            }}>
            <div></div>
            <h2 className="font-semibold text-center" style={{ color: currentTheme.text }}>Yeni Görev</h2>
            <div className="justify-self-end">
              <button onClick={onClose} className="px-2 py-1 transition-colors font-bold"
                style={{
                  borderRadius: '8px',
                  color: currentTheme.text,
                  backgroundColor: 'transparent',
                  fontSize: '20px',
                  lineHeight: '1'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#ffffff';
                  e.target.style.backgroundColor = currentTheme.accent;
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = currentTheme.text;
                  e.target.style.backgroundColor = 'transparent';
                }}>✕</button>
            </div>
          </div>
          <div className="overflow-y-auto no-scrollbar flex flex-col gap-4 sm:gap-6" style={{ height: 'auto', maxHeight: 'calc(95vh - 80px)', padding: '20px 20px 20px 20px' }}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-2xl mb-4">
                {error}
              </div>
            )}
            <br />
            <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
              <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Başlık</label>
              <input
                type="text"
                placeholder="Görev başlığını girin..."
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2 shadow-sm"
                style={{
                  minHeight: '48px',
                  borderRadius: '8px',
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
              />
            </div>
            <br />
            <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
              <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Görev Türü</label>
              <select
                value={newTask.task_type}
                onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2"
                style={{
                  minHeight: '48px',
                  borderRadius: '8px',
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
              >
                {getAllTaskTypes().map(taskType => (
                  <option key={taskType.value} value={taskType.value}>
                    {taskType.label}
                  </option>
                ))}
              </select>
            </div>
            <br />
            <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
              <PriorityLabelWithTooltip htmlFor="new-task-priority" currentTheme={currentTheme} />
              <select
                id="new-task-priority"
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2"
                style={{
                  minHeight: '48px',
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
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
            <br />
            <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
              <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Sorumlu</label>
              <select
                value={newTask.responsible_id || ''}
                onChange={(e) => setNewTask({ ...newTask, responsible_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2"
                style={{
                  minHeight: '48px',
                  borderRadius: '8px',
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
              <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Atananlar</label>
              <div className="rounded-lg p-3 sm:p-4" style={{
                minHeight: '48px',
                height: 'fit-content',
              }}>
                {newTask.assigned_users.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {newTask.assigned_users.map((userId) => {
                      const assignedUser = users.find(u => u.id === userId);
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors"
                          style={{
                            backgroundColor: currentTheme.accent + '20',
                            color: currentTheme.text
                          }}
                        >
                          <span className="truncate max-w-[200px]">{assignedUser?.name || 'Bilinmeyen Kullanıcı'}</span>
                          <button
                            type="button"
                            aria-label="Atananı kaldır"
                            onClick={() => {
                              manuallyRemovedUsersRef.current.add(userId);
                              setNewTask({
                                ...newTask,
                                assigned_users: newTask.assigned_users.filter(id => id !== userId)
                              });
                            }}
                            className="flex items-center justify-center rounded-full transition-colors focus:outline-none"
                            style={{
                              width: '16px',
                              height: '16px',
                              minWidth: '16px',
                              minHeight: '16px',
                              backgroundColor: 'transparent',
                              color: currentTheme.textSecondary || currentTheme.text,
                              fontSize: '12px',
                              lineHeight: '1',
                              padding: '0',
                              marginLeft: '2px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = currentTheme.accent;
                              e.target.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = currentTheme.textSecondary || currentTheme.text;
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="relative assignee-dropdown-container">
                  <input
                    type="text"
                    placeholder="Kullanıcı atayın..."
                    value={assigneeSearch}
                    className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none focus:ring-2"
                    style={{
                      minHeight: '48px',
                      borderRadius: '8px',
                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    onChange={(e) => {
                      setAssigneeSearch(e.target.value);
                      setShowAssigneeDropdown(true);
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = currentTheme.accent;
                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                      if ((!users || users.length === 0) && user?.role !== 'observer') {
                        loadUsers();
                      }
                      setShowAssigneeDropdown(true);
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = currentTheme.border;
                      e.target.style.boxShadow = 'none';
                      setTimeout(() => setShowAssigneeDropdown(false), 200);
                    }}
                  />

                  {showAssigneeDropdown && users && users.length > 0 && (
                    <div
                      className="absolute w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                      style={{
                        backgroundColor: currentTheme.tableBackground || currentTheme.background,
                        opacity: 1,
                        zIndex: 2147483647,
                        filter: 'none',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                        mixBlendMode: 'normal',
                        isolation: 'isolate',
                        pointerEvents: 'auto',
                        border: `1px solid ${currentTheme.border}`
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
                            className="px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-[24px] sm:text-[24px] last:border-b-0 text-left"
                            style={{
                              backgroundColor: currentTheme.tableBackground || currentTheme.background,
                              color: currentTheme.text,
                              borderBottom: `1px solid ${currentTheme.border}`
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = currentTheme.tableBackground || currentTheme.background;
                            }}
                            onClick={() => {
                              let usersToAdd = [u.id];

                              if (u.role === 'team_leader') {
                                const teamMembers = users.filter(tm =>
                                  Number(tm.leader_id) === Number(u.id) &&
                                  tm.id !== newTask.responsible_id
                                );
                                const teamMemberIds = teamMembers.map(tm => tm.id);
                                usersToAdd = [...usersToAdd, ...teamMemberIds];
                              }

                              usersToAdd.forEach(userId => {
                                manuallyRemovedUsersRef.current.delete(userId);
                              });

                              const combinedUsers = [...new Set([...newTask.assigned_users, ...usersToAdd])];

                              setNewTask({
                                ...newTask,
                                assigned_users: combinedUsers
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
                            className="px-3 sm:px-4 py-2 sm:py-3 text-[16px] sm:text-[24px] border-b"
                            style={{
                              backgroundColor: currentTheme.tableBackground || currentTheme.background,
                              color: currentTheme.textSecondary || currentTheme.text,
                              borderColor: currentTheme.border
                            }}
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
            <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
              <label className="!text-[24px] sm:!text-[24px] font-medium text-left" style={{ color: currentTheme.text }}>Tarihler</label>
              <div className="flex flex-row gap-2 sm:gap-4">
                <div className="flex-1">
                  <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Başlangıç</label>
                  <input
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none focus:ring-2"
                    style={{
                      minHeight: '48px',
                      borderRadius: '8px',
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
                  />
                </div>
                <span className="w-[20px]"></span>
                <div className="flex-1">
                  <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Bitiş</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none focus:ring-2"
                    style={{
                      minHeight: '48px',
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
                  />
                </div>
              </div>
            </div>

            <br />
            <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
              <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Dosyalar</label>
              <div className="w-full p-3 sm:p-4" style={{
                minHeight: '24px',
                paddingTop: '10px',
                paddingBottom: '10px',
                paddingLeft: '5px',
                borderRadius: '8px',
                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}>
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
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <br />
            <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
              <label className="!text-[24px] font-medium text-left" style={{ color: currentTheme.text }}>Görev Açıklaması</label>
              <textarea
                placeholder="Görev açıklamasını girin..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 !text-[24px] focus:outline-none focus:ring-2 min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh]"
                style={{
                  borderRadius: '8px',
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
              />
            </div>
            <br />
            <div className="mt-4 sm:mt-6 mb-4">
              {uploadProgress && (
                <div className="mb-4 bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div className="flex items-center justify-center h-full bg-blue-600 text-white text-sm font-medium transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, uploadProgress.percent ?? 10))}%` }}
                  >
                    {typeof uploadProgress.percent === 'number' ? `${uploadProgress.percent}%` : '...'}
                  </div>
                </div>
              )}
              <button
                onClick={handleAddTask}
                disabled={addingTask || !newTask.title}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors !text-[16px] sm:!text-[24px] font-medium"
                style={{
                  backgroundColor: (addingTask || !newTask.title) ? `${currentTheme.border}50` : currentTheme.accent,
                  color: '#ffffff',
                  cursor: (addingTask || !newTask.title) ? 'not-allowed' : 'pointer',
                  opacity: (addingTask || !newTask.title) ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!addingTask && newTask.title) {
                    const hex = currentTheme.accent.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!addingTask && newTask.title) {
                    e.target.style.backgroundColor = currentTheme.accent;
                  }
                }}
              >
                {addingTask ? (uploadProgress ? `Yükleniyor... ${uploadProgress.percent ?? 0}%` : 'Ekleniyor...') : 'Ekle'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
