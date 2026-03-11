import React from 'react';
import { createPortal } from 'react-dom';

export function TaskSettingsModal({
  open,
  onClose,
  currentTheme,
  newTaskTypeName,
  setNewTaskTypeName,
  newTaskTypeColor,
  setNewTaskTypeColor,
  customTaskStatuses,
  allTaskTypesFromAPI,
  selectedTaskTypeForStatuses,
  setSelectedTaskTypeForStatuses,
  newStatusName,
  setNewStatusName,
  newStatusColor,
  setNewStatusColor,
  editingTaskTypeId,
  editingTaskTypeName,
  setEditingTaskTypeName,
  editingTaskTypeColor,
  setEditingTaskTypeColor,
  editingTaskStatusId,
  editingTaskStatusName,
  setEditingTaskStatusName,
  editingTaskStatusColor,
  setEditingTaskStatusColor,
  getAllTaskTypes,
  handleAddTaskType,
  handleAddTaskStatus,
  handleDeleteTaskType,
  handleDeleteTaskStatus,
  handleEditTaskType,
  handleEditTaskStatus,
  handleSaveTaskType,
  handleSaveTaskStatus,
  handleCancelEditTaskType,
  handleCancelEditTaskStatus,
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999993]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
      <div className="relative flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1445px] max-h-[85vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
          style={{
            pointerEvents: 'auto',
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            borderColor: currentTheme.border,
            borderWidth: '1px',
            borderStyle: 'solid',
            color: currentTheme.text
          }} onClick={(e) => e.stopPropagation()}>
          <div className="border-b flex-none" style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, padding: '0px 10px' }}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="justify-self-start">
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-center" style={{ color: currentTheme.text }}>Görev Ayarları</h2>
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
          <div className="flex min-w-0 overflow-y-auto no-scrollbar" style={{ height: 'calc(80vh - 72px)', borderLeft: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}` }}>
            <div className="w-1/2 min-w-0 space-y-6" style={{ padding: '20px' }}>
              <div className="pt-4" style={{ paddingTop: '5px' }}>
                <div className="font-medium mb-4 !text-[24px]" style={{ paddingBottom: '10px' }}>Görev Türleri</div>

                {/* Yeni Görev Türü Ekleme */}
                <div className="rounded-lg p-4 mb-4">
                  <label className="text-[18px] font-medium mb-3">Yeni Görev Türü Ekle</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        placeholder="Görev türü adı (örn: Fikstür, Yeni Ürün)"
                        value={newTaskTypeName}
                        onChange={(e) => setNewTaskTypeName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-[16px] focus:outline-none"
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
                      />
                      <input
                        type="color"
                        value={newTaskTypeColor}
                        onChange={(e) => setNewTaskTypeColor(e.target.value)}
                        className="w-10 h-full rounded-full cursor-pointer"
                        title="Renk seç"
                        style={{
                          height: '40px',
                          width: '40px',
                          backgroundColor: newTaskTypeColor,
                          marginLeft: '5px',
                          borderColor: currentTheme.border,
                          borderWidth: '2px',
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
                    <button
                      onClick={handleAddTaskType}
                      className="w-full px-4 py-2 rounded-lg text-[16px] font-medium transition-colors"
                      style={{
                        backgroundColor: currentTheme.accent,
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        const hex = currentTheme.accent.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = currentTheme.accent;
                      }}
                    >
                      Tür Ekle
                    </button>
                  </div>
                </div>

                {/* Mevcut Görev Türleri */}
                <div className="space-y-3" style={{ marginTop: '30px' }}>
                  <label className="text-[18px]">Mevcut Görev Türleri</label>
                  <div className="space-y-2" style={{ marginTop: '10px' }}>
                    {getAllTaskTypes().map(taskType => (
                      <div key={taskType.id || taskType.value} className="rounded-lg p-3 flex items-center justify-between">
                        <div className="w-full flex items-center space-x-4" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                          {editingTaskTypeId === (taskType.id || taskType.value) ? (
                            <>
                              <input
                                type="color"
                                value={editingTaskTypeColor}
                                onChange={(e) => setEditingTaskTypeColor(e.target.value)}
                                className="rounded-full cursor-pointer"
                                style={{
                                  backgroundColor: taskType.color,
                                  width: '24px',
                                  height: '24px',
                                  borderColor: currentTheme.border,
                                  borderWidth: '2px',
                                  borderStyle: 'solid'
                                }}
                                title="Renk seç"
                                onFocus={(e) => {
                                  e.target.style.borderColor = currentTheme.accent;
                                  e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = currentTheme.border;
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <input
                                type="text"
                                value={editingTaskTypeName}
                                onChange={(e) => setEditingTaskTypeName(e.target.value)}
                                className="flex-1 px-2 py-1 rounded text-[18px] focus:outline-none"
                                placeholder="Tür adı"
                                style={{
                                  paddingLeft: '5px',
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
                              <div className="flex items-center space-x-2" style={{ marginRight: '5px' }}>
                                <button
                                  onClick={handleSaveTaskType}
                                  className="inline-flex items-center justify-center text-[16px] transition-colors"
                                  style={{
                                    width: '90px',
                                    height: '45px',
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
                                >
                                  Kaydet
                                </button>
                                <button
                                  onClick={handleCancelEditTaskType}
                                  className="inline-flex items-center justify-center text-[18px] transition-colors"
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
                                >
                                  X
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: taskType.color, minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                              <span className="text-[18px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>{taskType.label}</span>
                              <div className="flex items-center justify-end space-x-2 ml-auto" style={{ marginRight: '5px' }}>
                                {taskType.isCustom && !taskType.isPermanent ? (
                                  <>
                                    <button
                                      onClick={() => handleEditTaskType(taskType)}
                                      className="inline-flex items-center justify-center text-[16px] transition-colors"
                                      style={{
                                        width: '90px',
                                        height: '45px',
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
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTaskType(taskType.id || taskType.value)}
                                      className="inline-flex items-center justify-center text-[18px] transition-colors"
                                      style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '9999px',
                                        backgroundColor: currentTheme.border,
                                        color: currentTheme.text,
                                        marginLeft: '5px'
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
                                      🗑️
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-500 text-[16px]">
                                    {taskType.isPermanent ? 'Sistem Türü' : 'Silinmez'}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-1/2 min-w-0 space-y-6" style={{ padding: '20px' }}>
              <div className="pt-4" style={{ paddingTop: '5px' }}>
                <div className="font-medium mb-4 !text-[24px]" style={{ paddingBottom: '10px' }}>Görev Durumları</div>

                {/* Görev Türü Seçimi */}
                <div className="mb-4">
                  <label className="block text-[18px] mb-3">Görev Türü Seçin</label>
                  <select
                    value={selectedTaskTypeForStatuses}
                    onChange={(e) => setSelectedTaskTypeForStatuses(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-[18px] focus:outline-none"
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
                </div>

                {/* Yeni Durum Ekleme */}
                <div className="rounded-lg p-4 mb-4">
                  <label className="text-[18px] mb-3">Yeni Durum Ekle</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        placeholder="Durum adı (örn: Tasarlanacak, Test Edilecek)"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-[16px] focus:outline-none"
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
                      />
                      <input
                        type="color"
                        value={newStatusColor}
                        onChange={(e) => setNewStatusColor(e.target.value)}
                        className="w-10 h-full rounded-full cursor-pointer"
                        title="Renk seç"
                        style={{
                          height: '40px',
                          width: '40px',
                          backgroundColor: newStatusColor,
                          marginLeft: '5px',
                          borderColor: currentTheme.border,
                          borderWidth: '2px',
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
                    <button
                      onClick={handleAddTaskStatus}
                      className="w-full px-4 py-2 rounded-lg text-[16px] font-medium transition-colors"
                      style={{
                        backgroundColor: currentTheme.accent,
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        const hex = currentTheme.accent.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = currentTheme.accent;
                      }}
                    >
                      Durum Ekle
                    </button>
                  </div>
                </div>

                {/* Seçilen Tür için Mevcut Durumlar */}
                <div className="space-y-3">
                  <div className="font-medium mb-4 !text-[24px]" style={{ paddingTop: '10px' }}>
                    {(() => {
                      const allTypes = getAllTaskTypes();
                      const foundType = allTypes.find(type =>
                        type.value == selectedTaskTypeForStatuses ||
                        type.id == selectedTaskTypeForStatuses
                      );
                      return foundType ? foundType.label : 'Geliştirme';
                    })()} Durumları
                  </div>

                  {/* Sistem Durumları (Sabit) */}
                  <div className="mb-4">
                    <div className="space-y-2">
                      {/* Waiting - Default */}
                      <div className="rounded-lg p-3" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                        <div className="flex items-center justify-between h-full">
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: '#6b7280', minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                            <span className="text-[18px] min-w-[120px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>Bekliyor</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-[16px] min-w-[80px] text-right" style={{ marginRight: '5px', color: currentTheme.textSecondary || currentTheme.text }}>Varsayılan</span>
                          </div>
                        </div>
                      </div>

                      {/* Completed */}
                      <div className="rounded-lg p-3" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                        <div className="flex items-center justify-between h-full">
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: '#10b981', minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                            <span className="text-[18px] min-w-[120px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>Tamamlandı</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-[16px] min-w-[80px] text-right" style={{ marginRight: '5px', color: currentTheme.textSecondary || currentTheme.text }}>Sistem</span>
                          </div>
                        </div>
                      </div>

                      {/* Cancelled */}
                      <div className="rounded-lg p-3" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                        <div className="flex items-center justify-between h-full">
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: '#ef4444', minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                            <span className="text-[18px] min-w-[120px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>İptal</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-[16px] min-w-[80px] text-right" style={{ marginRight: '5px', color: currentTheme.textSecondary || currentTheme.text }}>Sistem</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Özel Durumlar (Dinamik) */}
                  <div>
                    <div className="space-y-2">
                      {(() => {
                        // Sistem türü için ID'yi bul (hem string hem integer kontrol et)
                        let statuses = customTaskStatuses[selectedTaskTypeForStatuses] || [];

                        // Eğer string ise ve statuses boşsa, integer ID'yi de kontrol et
                        if (selectedTaskTypeForStatuses === 'development' && statuses.length === 0) {
                          const systemType = allTaskTypesFromAPI.find(type =>
                            type.is_system && (type.name === 'Geliştirme' || type.name === 'development')
                          );
                          if (systemType && systemType.id) {
                            statuses = customTaskStatuses[systemType.id] || [];
                          }
                        }

                        return statuses.length > 0;
                      })() ? (
                        (() => {
                          // Sistem türü için ID'yi bul (hem string hem integer kontrol et)
                          let statuses = customTaskStatuses[selectedTaskTypeForStatuses] || [];

                          // Eğer string ise ve statuses boşsa, integer ID'yi de kontrol et
                          if (selectedTaskTypeForStatuses === 'development' && statuses.length === 0) {
                            const systemType = allTaskTypesFromAPI.find(type =>
                              type.is_system && (type.name === 'Geliştirme' || type.name === 'development')
                            );
                            if (systemType && systemType.id) {
                              statuses = customTaskStatuses[systemType.id] || [];
                            }
                          }

                          return statuses;
                        })().map(status => (
                          <div key={status.id || status.key} className="rounded-lg p-3 flex items-center justify-between" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                            {editingTaskStatusId === (status.id || status.key) ? (
                              <>
                                <div className="flex items-center space-x-3 flex-1">
                                  <input
                                    type="color"
                                    value={editingTaskStatusColor}
                                    onChange={(e) => setEditingTaskStatusColor(e.target.value)}
                                    className="rounded-full cursor-pointer"
                                    style={{
                                      backgroundColor: status.color,
                                      width: '24px',
                                      height: '24px',
                                      borderColor: currentTheme.border,
                                      borderWidth: '2px',
                                      borderStyle: 'solid'
                                    }}
                                    title="Renk seç"
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={editingTaskStatusName}
                                    onChange={(e) => setEditingTaskStatusName(e.target.value)}
                                    className="flex-1 px-2 py-1 rounded !text-[18px] focus:outline-none"
                                    placeholder="Durum adı"
                                    style={{
                                      paddingLeft: '5px',
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
                                <div className="flex items-center space-x-2" style={{ marginRight: '5px' }}>
                                  <button
                                    onClick={handleSaveTaskStatus}
                                    className="inline-flex items-center justify-center text-[16px] transition-colors"
                                    style={{
                                      width: '90px',
                                      height: '45px',
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
                                  >
                                    Kaydet
                                  </button>
                                  <button
                                    onClick={handleCancelEditTaskStatus}
                                    className="inline-flex items-center justify-center text-[18px] transition-colors"
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
                                  >
                                    X
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center space-x-3">
                                  <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: status.color, minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                                  <span className="!text-[18px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>{status.name || status.label}</span>
                                </div>
                                <div className="flex items-center justify-end space-x-2 ml-auto" style={{ marginRight: '5px' }}>
                                  <button
                                    onClick={() => handleEditTaskStatus(status)}
                                    className="inline-flex items-center justify-center text-[16px] transition-colors"
                                    style={{
                                      width: '90px',
                                      height: '45px',
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
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTaskStatus(status.id || status.key)}
                                    className="inline-flex items-center justify-center text-[18px] transition-colors"
                                    style={{
                                      width: '45px',
                                      height: '45px',
                                      borderRadius: '9999px',
                                      backgroundColor: currentTheme.border,
                                      color: currentTheme.text,
                                      marginLeft: '5px'
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
                                    🗑️
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 text-center text-[18px] py-4 border-2 border-dashed border-gray-600 rounded-lg">
                          Bu görev türü için henüz özel durum tanımlanmamış.
                          <br />
                          Yukarıdan yeni durum ekleyebilirsiniz.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
