import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { TooltipStatus } from '../shared/TooltipStatus';
import { getPriorityColor, getPriorityText, getTaskTypeText, getTaskTypeColor, getStatusText, getStatusColor } from '../../utils/performance.js';
import { formatDateOnly } from '../../utils/date.js';
import { lowerSafe } from '../../utils/string.js';

export function TaskListView({
  tasks,
  user,
  activeTab,
  setActiveTab,
  selectedTaskType,
  setSelectedTaskType,
  searchTerm,
  setSearchTerm,
  taskCounts,
  onOpenWeeklyOverview,
  onTaskClick,
  onPermanentDelete,
  getAllTaskTypes,
  taskHistories,
  loadTaskHistoryForTooltip,
  getLastAddedDescription
}) {
  const { currentTheme } = useTheme();
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'desc' });

  const toggleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: null, dir: 'desc' };
      return { key, dir: 'asc' };
    });
  };

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
        const order = { waiting: 1, completed: 2, cancelled: 3 };
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

  return (
    <>
      <div className="flex justify-center">
        <div className="px-2 xs:px-3 sm:px-4 lg:px-6" style={{ width: '1440px' }}>
          <div className="flex items-center space-x-3 border-b border-gray-200 pb-3 overflow-x-auto" style={{ minWidth: '1440px', paddingTop: '10px', paddingBottom: '10px' }}>
            {user?.role === 'admin' && (
              <button
                onClick={onOpenWeeklyOverview}
                className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
                style={{
                  marginRight: '5px',
                  backgroundColor: 'transparent',
                  color: currentTheme.text,
                  borderColor: currentTheme.border
                }}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span>🎯</span>
                  <span>Haftalık Hedef</span>
                </span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('active')}
              className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
              style={{
                backgroundColor: activeTab === 'active' ? currentTheme.accent : 'transparent',
                color: activeTab === 'active' ? '#ffffff' : currentTheme.text,
                borderColor: activeTab === 'active' ? currentTheme.accent : currentTheme.border
              }}
            >
              Aktif ({taskCounts.active})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
              style={{
                marginLeft: '5px',
                backgroundColor: activeTab === 'completed' ? '#10b981' : 'transparent',
                color: activeTab === 'completed' ? '#ffffff' : currentTheme.text,
                borderColor: activeTab === 'completed' ? '#10b981' : currentTheme.border
              }}
            >
              Tamamlanan ({taskCounts.completed})
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('deleted')}
                className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
                style={{
                  marginLeft: '5px',
                  backgroundColor: activeTab === 'deleted' ? '#ef4444' : 'transparent',
                  color: activeTab === 'deleted' ? '#ffffff' : currentTheme.text,
                  borderColor: activeTab === 'deleted' ? '#ef4444' : currentTheme.border
                }}
              >
                İptal ({taskCounts.deleted})
              </button>
            )}
            <div className="relative" style={{ marginLeft: '5px' }}>
              <select
                value={selectedTaskType}
                onChange={(e) => setSelectedTaskType(e.target.value)}
                className="px-3 xs:px-4 sm:px-4 py-2.5 text-[16px] xs:text-sm text-center border rounded-lg focus:outline-none focus:ring-2 appearance-none cursor-pointer shadow-sm"
                style={{
                  height: '40px',
                  minWidth: '140px',
                  backgroundColor: currentTheme.tableBackground || currentTheme.background,
                  color: currentTheme.text,
                  borderColor: currentTheme.border
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
                <option
                  value="all"
                  style={{
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text
                  }}
                >
                  Tüm Türler
                </option>
                {getAllTaskTypes().map(taskType => (
                  <option
                    key={taskType.value}
                    value={taskType.value}
                    style={{
                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                      color: currentTheme.text
                    }}
                  >
                    {taskType.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: currentTheme.textSecondary || currentTheme.text }}
                >
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
                className="!w-48 xs:!w-56 sm:!w-64 px-4 py-2.5 text-xs xs:text-sm border rounded-lg focus:outline-none focus:ring-2 shadow-sm"
                style={{
                  height: '30px',
                  fontSize: '16px',
                  backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                  color: currentTheme.text,
                  borderColor: currentTheme.border
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
                name="search"
                id="task-search"
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
        <div className="border-b" style={{ minWidth: '1440px', backgroundColor: currentTheme.tableHeader || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border }}>
          <div className="grid gap-0 px-2 xs:px-3 sm:px-4 lg:px-6 pt-2 xs:pt-3 text-xs xs:text-sm font-medium uppercase tracking-wider grid-cols-[120px_460px_160px_160px_120px_120px_120px_180px]" style={{ color: currentTheme.text, backgroundColor: currentTheme.tableHeader || currentTheme.tableBackground || currentTheme.background }}>
            <button onClick={() => toggleSort('no')} className="flex items-center justify-center px-2 transition-colors"
              style={{ color: currentTheme.text }}
              onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
              onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
              <span>NO</span>
            </button>
            <button onClick={() => toggleSort('title')} className="flex items-center justify-center px-2 transition-colors"
              style={{ color: currentTheme.text }}
              onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
              onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
              <span>Başlık</span>
            </button>
            <button onClick={() => toggleSort('priority')} className="flex items-center justify-center px-2 transition-colors"
              style={{ color: currentTheme.text }}
              onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
              onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
              <span>Öncelik</span>
            </button>
            <button onClick={() => toggleSort('task_type')} className="flex items-center justify-center px-2 transition-colors"
              style={{ color: currentTheme.text }}
              onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
              onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
              <span>Tür</span>
            </button>
            <button onClick={() => toggleSort('start_date')} className="flex items-center justify-center px-2 transition-colors"
              style={{ color: currentTheme.text }}
              onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
              onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
              <span>Başlangıç</span>
            </button>
            <button onClick={() => toggleSort('due_date')} className="flex items-center justify-center px-2 transition-colors"
              style={{ color: currentTheme.text }}
              onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
              onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
              <span>Bitiş</span>
            </button>
            <button onClick={() => toggleSort('attachments_count')} className="flex items-center justify-center px-2 transition-colors"
              style={{ color: currentTheme.text, backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.target.style.color = currentTheme.accent;
                e.target.style.backgroundColor = 'transparent';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = currentTheme.text;
                e.target.style.backgroundColor = 'transparent';
              }}>
              <span>Dosyalar</span>
            </button>
            {activeTab === 'active' || activeTab === 'completed' ? (
              <button className="flex items-center justify-center px-2 transition-colors"
                style={{ color: currentTheme.text }}
                onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                <span>Güncel Durum</span>
              </button>
            ) : (
              <div className="flex items-center justify-center px-2 select-none cursor-default" style={{ color: currentTheme.text }}>
                <span>Eylem</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div style={{ width: '1440px' }}>
          {filteredTasks.map((task, index) => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="grid gap-0 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-5 cursor-pointer transition-colors border-b grid-cols-[120px_460px_160px_160px_120px_120px_120px_180px]"
              style={{
                paddingTop: '10px',
                paddingBottom: '10px',
                backgroundColor: index % 2 === 0
                  ? (currentTheme.tableBackground || currentTheme.background)
                  : (currentTheme.tableRowAlt || currentTheme.background),
                borderColor: currentTheme.border
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.accent + '20';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = index % 2 === 0
                  ? (currentTheme.tableBackground || currentTheme.background)
                  : (currentTheme.tableRowAlt || currentTheme.background);
              }}
            >
              <div className="px-2 text-xs xs:text-sm text-center" style={{ color: currentTheme.text }}>
                {task.no || `-`}
              </div>
              <div className="px-2 text-left">
                <div className="text-xs xs:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: currentTheme.text }}>
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
                    backgroundColor: getTaskTypeColor(task.task_type, task, getAllTaskTypes()) + '20',
                    color: getTaskTypeColor(task.task_type, task, getAllTaskTypes()),
                    paddingBottom: '5px',
                    paddingTop: '5px',
                    paddingLeft: '5px',
                    paddingRight: '5px'
                  }}
                >
                  {getTaskTypeText(task.task_type, task)}
                </span>
              </div>
              <div className="px-2 text-xs xs:text-sm text-gray-900">
                {task.start_date ? formatDateOnly(task.start_date) : '-'}
              </div>
              <div className="px-2 text-xs xs:text-sm text-gray-900">
                {task.due_date ? formatDateOnly(task.due_date) : '-'}
              </div>
              <div className="px-2 text-xs xs:text-sm text-gray-900">
                {task.attachments?.length > 0 ? `${task.attachments.length} dosya` : '-'}
              </div>
              <div className="px-2 flex justify-center items-center">
                {activeTab === 'active' || activeTab === 'completed' ? (
                  <TooltipStatus
                    task={task}
                    onLoadHistory={() => loadTaskHistoryForTooltip(task.id)}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                    formatDateOnly={formatDateOnly}
                    getLastAddedDescription={() => getLastAddedDescription(taskHistories[task.id] || [])}
                    currentTheme={currentTheme}
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPermanentDelete(task.id);
                    }}
                    className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[16px] buttonHoverEffect"
                    style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: 'rgba(241, 91, 21, 0.62)' }}
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
                  (activeTab === 'active' && user?.role !== 'observer' ? 'Yeni görev ekleyin' : 'Henüz görev bulunmuyor')}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
