import React from 'react';
import { createPortal } from 'react-dom';
import { Tasks, apiOrigin } from '../../api';
import { formatDate, formatDateOnly } from '../../utils/date';
import { renderHistoryValue, renderFieldLabel } from '../../utils/performance';
import { PriorityLabelWithTooltip } from '../shared/PriorityLabelWithTooltip';
import ReactMarkdown from 'react-markdown';

export function TaskDetailModal({
  open,
  task,
  onClose,
  currentTheme,
  user,
  detailDraft,
  setDetailDraft,
  descDraft,
  setDescDraft,
  editingDates,
  setEditingDates,
  handleDateChange,
  handleUpdateTask: _handleUpdateTask,
  newComment,
  setNewComment,
  handleAddComment,
  taskHistory,
  setTaskHistory,
  taskHistories: _taskHistories,
  setTaskHistories,
  getEligibleAssignedUsers,
  getEligibleResponsibleUsers,
  users,
  addNotification,
  getStatusColor: _getStatusColor,
  getStatusText,
  formatDateOnly: formatDateOnlyProp,
  getTaskTypeText,
  getPriorityText,
  getAllTaskTypes,
  getAllTaskStatuses,
  getSystemTaskStatuses,
  renderHistoryValue: renderHistoryValueProp,
  renderFieldLabel: renderFieldLabelProp,
  historyDeleteMode,
  setHistoryDeleteMode,
  error,
  attachmentsExpanded,
  setAttachmentsExpanded,
  taskLastViews,
  formatDate: formatDateProp,
  showAssigneeDropdownDetail,
  setShowAssigneeDropdownDetail,
  assigneeSearchDetail,
  setAssigneeSearchDetail,
  assigneeDetailInputRef,
  previousResponsibleIdDetailRef,
  resolveUserName,
  uploadProgress,
  setUploadProgress,
  setSelectedTask,
  comments,
  apiOrigin: apiOriginProp
}) {
  const fmtDateOnly = formatDateOnlyProp || formatDateOnly;
  const fmtDate = formatDateProp || formatDate;
  const renderHistoryVal = renderHistoryValueProp || renderHistoryValue;
  const renderFieldLbl = renderFieldLabelProp || renderFieldLabel;
  const apiOriginVal = apiOriginProp || apiOrigin;

  if (!open || !task) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999996]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-2 sm:p-4" style={{ pointerEvents: 'auto' }}>
        <div className="fixed z-[100100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1445px]
          h-[80vh] rounded-2xl box-border
        shadow-[0_25px_80px_rgba(0,0,0,.6)] flex flex-col overflow-hidden
      "
          style={{
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            color: currentTheme.text,
            pointerEvents: 'auto',
            borderColor: currentTheme.border,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="border-b flex-none"
            style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, padding: '0px 10px' }}
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="justify-self-start">

              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-center" style={{ color: currentTheme.text }}>Görev Detayı</h2>
              <div className="justify-self-end">
                <button
                  onClick={onClose}
                  className="rounded-lg px-2 py-1 transition-colors border border-red-500"
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
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex min-w-0 overflow-hidden overflow-x-hidden" style={{ borderLeft: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}` }}>
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar" style={{ padding: '0px 24px' }}>
              <div className="py-6 flex flex-col gap-4 sm:gap-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-2xl mb-4">
                    {error}
                  </div>
                )}
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    NO
                  </label>
                  {(user?.role === 'admin' || user?.id === task.responsible?.id) ? (
                    <input
                      type="text"
                      value={detailDraft?.no || task.no || ''}
                      onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), no: e.target.value }))}
                      className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                      style={{
                        minHeight: '35px',
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
                      placeholder="NO girin..."
                    />
                  ) : (
                    <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                      {task.no || '-'}
                    </div>
                  )}
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Başlık
                  </label>
                  {(user?.role === 'admin' || user?.id === task.responsible?.id || user?.id === task.creator?.id) ? (
                    <input
                      type="text"
                      value={detailDraft?.title ?? task.title ?? ''}
                      onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), title: e.target.value }))}
                      className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                      style={{
                        minHeight: '35px',
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
                      placeholder="Başlık girin..."
                    />
                  ) : (
                    <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                      {task.title ?? ""}
                    </div>
                  )}
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Görev Türü
                  </label>
                  {user?.role === 'admin' ? (
                    <select
                      value={detailDraft?.task_type || 'development'}
                      onChange={(e) => {
                        const newTaskType = e.target.value;
                        setDetailDraft(prev => ({
                          ...(prev || {}),
                          task_type: newTaskType,
                          status: 'waiting'
                        }));
                      }}
                      className="w-full rounded-lg px-3 py-2 !text-[24px] sm:!text-[16px] focus:outline-none"
                      style={{
                        height: '40px',
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
                  ) : (
                    <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                      {getTaskTypeText(task.task_type)}
                    </div>
                  )}
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Durum
                  </label>
                  {(user?.role !== 'observer' && (user?.id === task.creator?.id || user?.id === task.responsible?.id || user?.role === 'admin' || (Array.isArray(task.assigned_users) && task.assigned_users.some(u => (typeof u === 'object' ? u.id : u) === user?.id)))) ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const currentStatus = detailDraft?.status || '';
                            const taskType = detailDraft?.task_type || task.task_type || task.type || 'development';
                            const customStatuses = getAllTaskStatuses(taskType);
                            const currentIndex = customStatuses.findIndex(s => s.value === currentStatus);
                            if (currentIndex > 0) {
                              const prevStatus = customStatuses[currentIndex - 1];
                              setDetailDraft(prev => ({ ...(prev || {}), status: prevStatus.value }));
                            }
                          }}
                          className="px-3 py-2 rounded-lg transition-colors"
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
                          title="Önceki özel durum"
                          disabled={getAllTaskStatuses(detailDraft?.task_type || task.task_type || task.type || 'development').length === 0}
                        >
                          ←
                        </button>
                        {getAllTaskStatuses(detailDraft?.task_type || task.task_type || task.type || 'development').length > 0 ? (
                          <select
                            value={detailDraft?.status || ''}
                            onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), status: e.target.value }))}
                            className="flex-1 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                            style={{
                              height: '40px',
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
                            <option value="">Durum seçin...</option>
                            {getAllTaskStatuses(detailDraft?.task_type || task.task_type || task.type || 'development').map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex-1 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ height: '40px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.textSecondary || currentTheme.text }}>
                            Durum yok
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const currentStatus = detailDraft?.status || '';
                            const taskType = detailDraft?.task_type || task.task_type || task.type || 'development';
                            const customStatuses = getAllTaskStatuses(taskType);
                            const currentIndex = customStatuses.findIndex(s => s.value === currentStatus);
                            if (currentIndex < customStatuses.length - 1) {
                              const nextStatus = customStatuses[currentIndex + 1];
                              setDetailDraft(prev => ({ ...(prev || {}), status: nextStatus.value }));
                            }
                          }}
                          className="px-3 py-2 rounded-lg transition-colors"
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
                          title="Sonraki özel durum"
                          disabled={getAllTaskStatuses(detailDraft?.task_type || task.task_type || task.type || 'development').length === 0}
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                      {getStatusText(task.status, task)}
                    </div>
                  )}
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <PriorityLabelWithTooltip htmlFor="new-task-priority" currentTheme={currentTheme} />
                  {user?.role !== 'observer' ? (
                    <select
                      value={detailDraft?.priority || 'medium'}
                      onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), priority: e.target.value }))}
                      className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                      style={{
                        height: '40px',
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
                  ) : (
                    <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                      {getPriorityText(task.priority)}
                    </div>
                  )}
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Sorumlu
                  </label>
                  {(user?.role !== 'observer') ? (
                    <select
                      value={detailDraft?.responsible_id || ''}
                      onChange={(e) => {
                        const rid = e.target.value ? parseInt(e.target.value) : '';
                        const currentAssignedUserIds = detailDraft?.assigned_user_ids || (task.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x));
                        let cleanedAssignedUsers = currentAssignedUserIds;
                        if (previousResponsibleIdDetailRef?.current && users) {
                          const prevResponsibleUser = users.find(u => u.id === previousResponsibleIdDetailRef.current);
                          if (prevResponsibleUser && prevResponsibleUser.role === 'team_leader') {
                            const prevTeamMembers = users.filter(u => u.leader_id === previousResponsibleIdDetailRef.current);
                            const prevTeamMemberIds = prevTeamMembers.map(m => m.id);
                            cleanedAssignedUsers = cleanedAssignedUsers.filter(id => !prevTeamMemberIds.includes(id));
                          }
                        }
                        if (rid && users) {
                          const newResponsibleUser = users.find(u => u.id === rid);
                          if (newResponsibleUser && newResponsibleUser.role === 'team_leader') {
                            const teamMembers = users.filter(u => u.leader_id === rid);
                            const teamMemberIds = teamMembers.map(m => m.id);
                            const combinedIds = [...new Set([...cleanedAssignedUsers, ...teamMemberIds])];
                            setDetailDraft(prev => ({ ...(prev || {}), responsible_id: rid, assigned_user_ids: combinedIds }));
                          } else {
                            setDetailDraft(prev => ({ ...(prev || {}), responsible_id: rid, assigned_user_ids: cleanedAssignedUsers }));
                          }
                        } else {
                          setDetailDraft(prev => ({ ...(prev || {}), responsible_id: rid, assigned_user_ids: cleanedAssignedUsers }));
                        }
                        if (previousResponsibleIdDetailRef) previousResponsibleIdDetailRef.current = rid;
                      }}
                      className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none"
                      style={{
                        height: '40px',
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
                      <option value="">Seçin</option>
                      {getEligibleResponsibleUsers?.()?.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ height: '40px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                      {task.responsible?.name || 'Atanmamış'}
                    </div>
                  )}
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Oluşturan
                  </label>
                  <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] flex items-center" style={{ height: '40px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                    {task.creator?.name || 'Bilinmiyor'}
                  </div>
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Atananlar
                  </label>
                  <div className="w-full rounded-lg p-3 sm:p-4" style={{ minHeight: '24px', height: 'fit-content', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background }}>
                    {user?.role !== 'observer' ? (
                      <div className="assignee-dropdown-detail-container relative">
                        {Array.isArray(detailDraft?.assigned_user_ids) && detailDraft.assigned_user_ids.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mb-3 overflow-hidden">
                            {(detailDraft.assigned_user_ids || []).map((id) => {
                              const u = (users || []).find(x => x.id === id) || (task.assigned_users || []).find(x => (typeof x === 'object' ? x.id : x) === id);
                              const name = u ? (typeof u === 'object' ? (u.name || u.email || `#${id}`) : String(u)) : `#${id}`;
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1.5 rounded-full text-sm max-w-full px-3 py-1 transition-colors"
                                  style={{
                                    backgroundColor: currentTheme.accent + '20',
                                    color: currentTheme.text
                                  }}
                                >
                                  <span className="truncate max-w-[200px]">{name}</span>
                                  <button
                                    type="button"
                                    aria-label="Atananı kaldır"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextIds = (detailDraft?.assigned_user_ids || []).filter(v => v !== id);
                                      setDetailDraft(prev => ({ ...(prev || {}), assigned_user_ids: nextIds }));
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
                        <input
                          ref={assigneeDetailInputRef}
                          type="text"
                          placeholder="Kullanıcı atayın..."
                          value={assigneeSearchDetail}
                          className="w-[99%] rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                          style={{
                            minHeight: '32px',
                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                            color: currentTheme.text,
                            borderColor: currentTheme.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = currentTheme.accent;
                            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                            setShowAssigneeDropdownDetail(true);
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = currentTheme.border;
                            e.target.style.boxShadow = 'none';
                            setTimeout(() => setShowAssigneeDropdownDetail(false), 200);
                          }}
                          onChange={(e) => {
                            setAssigneeSearchDetail(e.target.value);
                            setShowAssigneeDropdownDetail(true);
                          }}
                        />
                        {showAssigneeDropdownDetail && users && users.length > 0 && getEligibleAssignedUsers && (
                          <div
                            className="absolute w-full mt-1 border-2 border-gray-400 rounded-lg shadow-xl max-h-60 overflow-y-auto bg-white"
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
                              borderColor: currentTheme.border,
                              borderWidth: '2px',
                              borderStyle: 'solid',
                              color: currentTheme.text
                            }}
                          >
                            {getEligibleAssignedUsers(task.responsible?.id)
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
                                  className="px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-[24px] sm:text-[24px] text-left border-b last:border-b-0"
                                  style={{
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = currentTheme.accent + '20';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={async () => {
                                    let usersToAdd = [u.id];
                                    if (u.role === 'team_leader') {
                                      const responsibleId = detailDraft?.responsible_id || task.responsible?.id;
                                      const teamMembers = users.filter(tm =>
                                        Number(tm.leader_id) === Number(u.id) &&
                                        tm.id !== responsibleId
                                      );
                                      const teamMemberIds = teamMembers.map(tm => tm.id);
                                      usersToAdd = [...usersToAdd, ...teamMemberIds];
                                    }
                                    const combinedUsers = [...new Set([...(detailDraft?.assigned_user_ids || []), ...usersToAdd])];
                                    setDetailDraft(prev => ({ ...(prev || {}), assigned_user_ids: combinedUsers }));
                                    setAssigneeSearchDetail('');
                                    setShowAssigneeDropdownDetail(true);
                                    setTimeout(() => assigneeDetailInputRef?.current?.focus(), 0);
                                  }}
                                >
                                  {u.name}
                                </div>
                              ))}
                            {getEligibleAssignedUsers(task.responsible?.id).filter(u => {
                              const q = assigneeSearchDetail.toLowerCase();
                              const name = (u.name || '').toLowerCase();
                              const email = (u.email || '').toLowerCase();
                              const matches = !q || name.includes(q) || email.includes(q);
                              const already = (detailDraft?.assigned_user_ids || []).some(id => id === u.id);
                              return matches && !already;
                            }).length === 0 && (
                                <div className="px-3 sm:px-4 py-2 sm:py-3 text-[16px] sm:text-[24px] border-b" style={{ color: currentTheme.textSecondary || currentTheme.text, borderColor: currentTheme.border }}>
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
                              const u = (users || []).find(x => x.id === id) || (task.assigned_users || []).find(x => (typeof x === 'object' ? x.id : x) === id);
                              const name = u ? (typeof u === 'object' ? (u.name || u.email || `#${id}`) : String(u)) : `#${id}`;
                              return (
                                <span key={id} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm max-w-[240px]" style={{ paddingRight: '10px' }}>
                                  <span className="truncate">{name} | </span>
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
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-top ">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Dosyalar
                  </label>
                  <div className="w-full !text-[18px] p-3 sm:p-4" style={{ minHeight: '24px', height: 'fit-content', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background }}>
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
                    {(user?.role === 'admin' || user?.role === 'team_leader' || user?.id === task.creator?.id || user?.id === task.responsible?.id || (Array.isArray(task.assigned_users) && task.assigned_users.some(u => (typeof u === 'object' ? u.id : u) === user?.id))) ? (
                      <div className="!text-[18px]">
                        <div className="flex items-center gap-6">
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
                                await Tasks.uploadAttachments(task.id, files, (p) => {
                                  setUploadProgress({ percent: p, label: 'Dosyalar yükleniyor' });
                                });
                                const t = await Tasks.get(task.id);
                                setSelectedTask?.(t.task || t);
                                addNotification('Dosyalar yüklendi', 'success');
                              } catch {
                                addNotification('Yükleme başarısız', 'error');
                              } finally {
                                setUploadProgress(null);
                                e.target.value = '';
                              }
                            }}
                            className="w-[150px] !text-[18px] sm:!text-[16px] text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-[18px] file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-colors"
                          />
                          <div className="flex items-center justify-between rounded px-3 py-2 flex-1" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                            <div style={{ paddingLeft: '12px', color: currentTheme.text }}>Yüklenen dosya: <span className="font-semibold">{(task.attachments || []).length}</span> adet</div>
                            {(task.attachments || []).length > 0 && (
                              <button
                                type="button"
                                onClick={() => setAttachmentsExpanded(v => !v)}
                                className="rounded px-3 py-1 transition-colors"
                                style={{
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
                              >
                                {attachmentsExpanded ? '⮝' : '⮟'}
                              </button>
                            )}
                          </div>
                        </div>
                        {attachmentsExpanded && (task.attachments || []).length > 0 && (
                          <div className="space-y-1">
                            {(task.attachments || []).map(a => (
                              <div key={a.id} className="flex items-center justify-between rounded px-2 py-1" style={{ paddingTop: '10px', paddingLeft: '10px', backgroundColor: currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={(() => {
                                      if (a.download_url) {
                                        const url = a.download_url;
                                        return url.startsWith('http') ? url : `${apiOriginVal}${url.startsWith('/') ? '' : '/'}${url}`;
                                      }
                                      if (a.url) return a.url;
                                      if (a.path) return `${apiOriginVal}/storage/${a.path}`;
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
                                {(user?.role === 'admin' || user?.role === 'team_leader' || user?.id === task.responsible?.id) && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await Tasks.deleteAttachment(a.id);
                                        const t = await Tasks.get(task.id);
                                        setSelectedTask?.(t.task || t);
                                        addNotification('Dosya silindi', 'success');
                                      } catch (err) {
                                        console.error('Delete attachment error:', err);
                                        addNotification('Silinemedi', 'error');
                                      }
                                    }}
                                    className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[18px] buttonHoverEffect"
                                    style={{ width: '45px', height: '45px', borderRadius: '9999px', backgroundColor: 'rgba(241, 91, 21, 0.62)' }}
                                    title="Dosyayı sil"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded px-3 py-2" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                          <div style={{ paddingLeft: '12px', color: currentTheme.text }}>Yüklenen dosya: <span className="font-semibold">{(task.attachments || []).length}</span> adet</div>
                          {(task.attachments || []).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setAttachmentsExpanded(v => !v)}
                              className="rounded px-3 py-1 transition-colors"
                              style={{
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
                            >
                              {attachmentsExpanded ? '⮝' : '⮟'}
                            </button>
                          )}
                        </div>
                        {attachmentsExpanded && (task.attachments || []).length > 0 ? (
                          <div className="space-y-1">
                            {(task.attachments || []).map(a => (
                              <div key={a.id} className="rounded px-2 py-1" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                                <a
                                  href={(() => {
                                    if (a.download_url) {
                                      const url = a.download_url;
                                      return url.startsWith('http') ? url : `${apiOriginVal}${url.startsWith('/') ? '' : '/'}${url}`;
                                    }
                                    if (a.url) return a.url;
                                    if (a.path) return `${apiOriginVal}/storage/${a.path}`;
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
                          (task.attachments || []).length === 0 && <span className="text-gray-500 text-sm">-</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                    Tarihler
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 min-w-0">
                    <div className="min-w-0">
                      <label className="block !text-[24px] sm:!text-[16px] !leading-[1.2] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Başlangıç</label>
                      {(user?.role !== 'observer' && (user?.id === task.creator?.id || user?.role === 'admin')) ? (
                        <input
                          type="date"
                          value={editingDates.start_date}
                          onChange={(e) => {
                            setEditingDates(prev => ({
                              ...prev,
                              start_date: e.target.value
                            }));
                          }}
                          className="w-[98%] min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                          style={{
                            minHeight: '32px',
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
                            handleDateChange(task.id, 'start_date', e.target.value);
                          }}
                        />
                      ) : (
                        <div className="w-full min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center truncate" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                          {task.start_date ? fmtDateOnly(task.start_date) : '-'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className="block !text-[24px] sm:!text-[16px] !leading-[1.2] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Bitiş</label>
                      {(user?.role !== 'observer' && (user?.id === task.creator?.id || user?.role === 'admin' || user?.role === 'team_leader')) ? (
                        <input
                          type="date"
                          value={editingDates.due_date}
                          onChange={(e) => {
                            setEditingDates(prev => ({
                              ...prev,
                              due_date: e.target.value
                            }));
                          }}
                          className="w-[98%] min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                          style={{
                            minHeight: '32px',
                            paddingLeft: '6px',
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
                            handleDateChange(task.id, 'due_date', e.target.value);
                          }}
                        />
                      ) : (
                        <div className="w-full min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center truncate" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                          {task.due_date ? fmtDateOnly(task.due_date) : '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <br />
                <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                  <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
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
                        className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] focus:outline-none min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh] resize-none no-scrollbar"
                        style={{
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
                    ) : (
                      <textarea
                        readOnly
                        value={task.description ?? ''}
                        placeholder="Görev açıklamasını girin..."
                        className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] focus:outline-none min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh] resize-none no-scrollbar"
                        style={{
                          backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      />
                    )}
                  </div>
                </div>
                {(user?.role === 'admin' || user?.role === 'team_leader' || user?.id === task.responsible?.id) && (
                  <div className="bottom-0 left-0 right-0 p-4 z-[100200]" style={{ alignItems: 'center', paddingTop: '3%', paddingBottom: '1%', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                    <div className="flex gap-2 justify-center max-w-[1400px] mx-auto">
                      {getSystemTaskStatuses().map(status => (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => setDetailDraft(prev => ({ ...(prev || {}), status: status.value }))}
                          className="px-6 py-3 rounded-lg text-sm font-medium transition-colors flex-1"
                          style={{
                            backgroundColor: (detailDraft?.status || task.status) === status.value ? status.color : currentTheme.border,
                            color: (detailDraft?.status || task.status) === status.value ? '#ffffff' : currentTheme.text
                          }}
                          onMouseEnter={(e) => {
                            if ((detailDraft?.status || task.status) !== status.value) {
                              e.target.style.backgroundColor = currentTheme.accent;
                              e.target.style.color = '#ffffff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if ((detailDraft?.status || task.status) !== status.value) {
                              e.target.style.backgroundColor = currentTheme.border;
                              e.target.style.color = currentTheme.text;
                            }
                          }}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="w-[480px] md:w-[420px] lg:w-[480px] max-w-[48%] shrink-0 flex flex-col overflow-hidden" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
              <div className="border-b flex-none" style={{ padding: '10px', borderColor: currentTheme.border }}>
                <h3 className="text-lg md:text-xl font-semibold" style={{ color: currentTheme.text }}>👁️ Son Görüntüleme</h3>
                <div className="mt-3 space-y-2">
                  {Array.isArray(taskLastViews) && taskLastViews.length > 0 ? (
                    taskLastViews.map(v => (
                      <div key={v.user_id} className="flex items-center justify-between text-sm">
                        <div className="truncate mr-3" style={{ color: currentTheme.text }}>
                          {v.name}
                          {v.is_responsible ? <span className="ml-2 text-xs" style={{ color: currentTheme.accent }}></span> : null}
                        </div>
                        <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary || currentTheme.text }}>{v.last_viewed_at ? fmtDate(v.last_viewed_at) : '-'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Kayıt bulunamadı</div>
                  )}
                </div>
              </div>
              <div className="border-b flex-none" style={{ padding: '1px', borderColor: currentTheme.border }}>
                <div className="flex items-center justify-between" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
                  <h3 className="text-lg md:text-xl font-semibold" style={{ color: currentTheme.text }}>📢 Görev Geçmişi</h3>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => { if (user?.role === 'admin') setHistoryDeleteMode(v => !v); }}
                      className="rounded px-2 py-1 inline-flex items-center justify-center text-[18px] transition-colors"
                      style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '9999px',
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
                      title={user?.role === 'admin' ? (historyDeleteMode ? 'Silme modunu kapat' : 'Silme modunu aç') : 'Sadece admin'}
                    >🗑️</button>)}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4" style={{ padding: '10px' }}>
                {Array.isArray(taskHistory) && taskHistory.length > 0 ? (
                  taskHistory.filter(h => !h.field.includes('_color')).map((h) => (
                    <div key={h.id} className="relative p-3 rounded max-w-full overflow-hidden" style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 max-w-full overflow-hidden pr-8">
                          <div className="text-[11px] mb-1" style={{ color: currentTheme.accent }}>{fmtDateOnly(h.created_at)}</div>
                          {h.field === 'comment' ? (
                            <div className="text-sm max-w-full overflow-hidden">
                              <span className="font-medium" style={{ color: currentTheme.text }}>{h.user?.name || 'Kullanıcı'}:<br></br></span>{' '}
                              <span className="break-words whitespace-normal block max-w-full" style={{ color: currentTheme.text }}>{renderHistoryVal(h.field, h.new_value)}</span>
                            </div>
                          ) : (h.new_value && typeof h.new_value === 'string' && h.new_value.trim().length > 0 &&
                            !h.field.includes('title') &&
                            !h.field.includes('status') && !h.field.includes('priority') &&
                            !h.field.includes('task_type') && !h.field.includes('date') &&
                            !h.field.includes('attachments') && !h.field.includes('assigned') &&
                            !h.field.includes('responsible') && !h.field.includes('assigned_users') &&
                            !h.field.includes('_color') &&
                            !h.new_value.toLowerCase().includes('dosya') &&
                            !h.new_value.toLowerCase().includes('eklendi') &&
                            !h.new_value.toLowerCase().includes('silindi') &&
                            !h.new_value.toLowerCase().includes('değiştirildi') &&
                            !h.new_value.toLowerCase().includes('→')) ? (
                            <div className="text-sm max-w-full overflow-hidden">
                              <span className="font-medium" style={{ color: currentTheme.text }}>{h.user?.name || 'Kullanıcı'}:<br></br></span>{' '}
                              <span className="break-words whitespace-normal block max-w-full" style={{ color: currentTheme.text }}>{h.new_value}</span>
                            </div>
                          ) : h.field === 'attachments' ? (
                            <div className="text-sm" style={{ color: currentTheme.text }}>
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
                                      <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> dosya ekledi.
                                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                                        {added.map((name, idx) => (
                                          <li key={`a-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                        ))}
                                      </ul>
                                    </>
                                  );
                                }
                                if (removed.length > 0 && added.length === 0) {
                                  return (
                                    <>
                                      <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> dosya sildi.
                                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                                        {removed.map((name, idx) => (
                                          <li key={`r-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                        ))}
                                      </ul>
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> dosya ekledi/sildi.
                                    {added.length > 0 && (
                                      <>
                                        <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Eklendi:</div>
                                        <ul className="list-disc list-inside space-y-0.5">
                                          {added.map((name, idx) => (
                                            <li key={`a2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                          ))}
                                        </ul>
                                      </>
                                    )}
                                    {removed.length > 0 && (
                                      <>
                                        <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Silindi:</div>
                                        <ul className="list-disc list-inside space-y-0.5">
                                          {removed.map((name, idx) => (
                                            <li key={`r2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
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
                                const added = newUsers.filter(usr => !oldUsers.includes(usr));
                                const removed = oldUsers.filter(usr => !newUsers.includes(usr));
                                const actor = h.user?.name || 'Kullanıcı';
                                if (added.length > 0 && removed.length === 0) {
                                  return (
                                    <>
                                      <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> atanan kullanıcıları güncelledi.
                                      <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Atanan Kullanıcı:</div>
                                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                                        {added.map((name, idx) => (
                                          <li key={`a-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                        ))}
                                      </ul>
                                    </>
                                  );
                                }
                                if (removed.length > 0 && added.length === 0) {
                                  return (
                                    <>
                                      <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> atanan kullanıcıları güncelledi.
                                      <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Kaldırılan Kullanıcı:</div>
                                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                                        {removed.map((name, idx) => (
                                          <li key={`r-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                        ))}
                                      </ul>
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> atanan kullanıcıları güncelledi.
                                    {added.length > 0 && (
                                      <>
                                        <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Atanan Kullanıcı:</div>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                                          {added.map((name, idx) => (
                                            <li key={`a2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                          ))}
                                        </ul>
                                      </>
                                    )}
                                    {removed.length > 0 && (
                                      <>
                                        <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Kaldırılan Kullanıcı:</div>
                                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                                          {removed.map((name, idx) => (
                                            <li key={`r2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                          ))}
                                        </ul>
                                      </>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : renderFieldLbl(h.field) ? (
                            <div className="text-sm">
                              <span className="font-medium" style={{ color: currentTheme.text }}>{h.user?.name || 'Kullanıcı'}</span>{' '}
                              {renderFieldLbl(h.field)} değiştirdi <br></br> "<span style={{ color: currentTheme.text }}>{renderHistoryVal(h.field, h.old_value)}</span> →{' '}
                              <span style={{ color: currentTheme.text }}>{renderHistoryVal(h.field, h.new_value)}</span>"
                            </div>
                          ) : null}
                        </div>
                        {(user?.role === 'admin' && historyDeleteMode && h.field === 'comment') && (
                          <button
                            onClick={async () => { try { await Tasks.deleteHistory(task.id, h.id); const h2 = await Tasks.getHistory(task.id); setTaskHistory(Array.isArray(h2) ? h2 : []); setTaskHistories(prev => ({ ...prev, [task.id]: Array.isArray(h2) ? h2 : [] })); addNotification('Yorum silindi', 'success'); } catch (err) { console.error('Delete history error:', err); addNotification('Silinemedi', 'error'); } }}
                            className="inline-flex items-center justify-center text-[18px] transition-colors"
                            style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '9999px',
                              backgroundColor: currentTheme.border,
                              color: currentTheme.text,
                              marginRight: '3px',
                              marginTop: '3px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = currentTheme.accent;
                              e.target.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = currentTheme.border;
                              e.target.style.color = currentTheme.text;
                            }}
                            title="Yorumu sil"
                          >🗑️</button>
                        )}
                      </div>
                      <div className="sticky bottom-0 w-full border-t px-8 py-5" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.tableBackground || currentTheme.background }}></div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Henüz görev geçmişi bulunmuyor</div>
                )}

                {Array.isArray(comments) && comments.map((c) => (
                  <div key={c.id} className="p-3 rounded" style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                    <div className="text-[11px] mb-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>{fmtDate(c.timestamp)}</div>
                    <div className="text-sm">
                      <span className="font-medium" style={{ color: currentTheme.text }}>{c.author}</span> <span style={{ color: currentTheme.text }}>{c.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              {user?.role !== 'observer' && (
                <div className="border-t flex-none p-4" style={{ borderColor: currentTheme.border }}>
                  <div className="relative flex items-center rounded-2xl py-2" style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Yorum yap/Not ekle"
                      className="flex-1 bg-transparent border-none outline-none px-4 resize-none"
                      style={{
                        height: '80px',
                        overflowY: 'auto',
                        fontSize: '16px',
                        color: currentTheme.text,
                        lineHeight: '1'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <div className="pr-3 flex items-center h-[100%] border-0" style={{ height: '80px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background }}>
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          height: '80px',
                          backgroundColor: newComment.trim() ? currentTheme.accent : currentTheme.border,
                          boxShadow: newComment.trim() ? `0 4px 12px ${currentTheme.accent}66` : '0 2px 4px rgba(0, 0, 0, 0.2)',
                          transform: 'scale(0.8)',
                          cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                          border: newComment.trim() ? `2px solid ${currentTheme.border}` : `2px solid ${currentTheme.border}`,
                          opacity: newComment.trim() ? '1' : '0.6',
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          if (newComment.trim()) {
                            const hex = currentTheme.accent.replace('#', '');
                            const r = parseInt(hex.substr(0, 2), 16);
                            const g = parseInt(hex.substr(2, 2), 16);
                            const b = parseInt(hex.substr(4, 2), 16);
                            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                            e.target.style.backgroundColor = brightness > 128
                              ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                              : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                            e.target.style.transform = 'scale(0.8)';
                            e.target.style.boxShadow = `0 6px 16px ${currentTheme.accent}80`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (newComment.trim()) {
                            e.target.style.backgroundColor = currentTheme.accent;
                            e.target.style.transform = 'scale(0.8)';
                            e.target.style.boxShadow = `0 4px 12px ${currentTheme.accent}66`;
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
  );
}
