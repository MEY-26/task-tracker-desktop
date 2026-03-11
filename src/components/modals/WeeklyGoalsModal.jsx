import React from 'react';
import { createPortal } from 'react-dom';
import { getMonday, fmtYMD, isoWeekNumber } from '../../utils/date';
import { getPerformanceGrade } from '../../utils/performance';
import { getMaxActualLimitForToday, getDailyActualLimits, getDailyOvertimeLimits } from '../../utils/weeklyLimits';

const WEEKLY_BASE_MINUTES = 2700;

export function WeeklyGoalsModal({
  open,
  onClose,
  currentTheme,
  weeklyUserId,
  users,
  user,
  combinedLocks,
  weeklyWeekStart,
  loadWeeklyGoals,
  weeklyLeaveMinutesInput,
  handleWeeklyLeaveMinutesChange: _handleWeeklyLeaveMinutesChange,
  handleWeeklyLeaveMinutesBlur: _handleWeeklyLeaveMinutesBlur,
  weeklyOvertimeMinutesInput,
  handleWeeklyOvertimeMinutesChange,
  handleWeeklyOvertimeMinutesBlur,
  weeklyGoals,
  weeklyLive,
  weeklyValidationErrors,
  saveWeeklyGoals,
  approveWeeklyGoals,
  weeklySaveState,
  transferButtonText,
  transferIncompleteTasksFromPreviousWeek,
  setShowGoalDescription,
  setSelectedGoalIndex,
  goalDescriptionRef,
  textInputRefs,
  setWeeklyGoals,
  updateNumberInput,
  saveTextInputToState,
  getTextInputKey,
  addNotification: _addNotification,
}) {
  const canShowFullScore = user?.role === 'admin';

  if (!open) return null;
  const canShowGradeOnly = user?.role === 'team_leader';
  const canShowScoreSection = canShowFullScore || canShowGradeOnly;

  const jsx = (
    <div className="fixed inset-0 z-[999998]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} style={{ pointerEvents: 'auto' }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div className="fixed z-[100260] weekly-goals-modal left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1440px] max-h-[90vh] rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
          style={{
            paddingBottom: '10px',
            pointerEvents: 'auto',
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            borderColor: currentTheme.border,
            color: currentTheme.text
          }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3 border-b relative"
            style={{
              backgroundColor: currentTheme.tableHeader || currentTheme.border,
              borderColor: currentTheme.border
            }}>
            <div className="flex-1">
              {weeklyUserId && Array.isArray(users) ? (
                <div className="text-sm" style={{ paddingLeft: '10px', color: currentTheme.text }}>
                  {(() => {
                    const targetUser = users.find(u => u.id === weeklyUserId);
                    return targetUser ? (
                      <>
                        {targetUser.name} <br /> {targetUser.email}
                      </>
                    ) : (
                      'Bilinmeyen Kullanıcı'
                    )
                  })()}
                </div>
              ) : (
                <div className="text-sm" style={{ paddingLeft: '10px', color: currentTheme.text }}>
                  {user?.name} <br /> {user?.email}
                </div>
              )}
            </div>
            <div className="flex-1 text-center">
              <h3 className="!text-[24px] font-semibold" style={{ color: currentTheme.text }}>Haftalık Hedefler</h3>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="ml-auto flex items-center gap-4 text-sm text-[24px]" style={{ paddingRight: '20px', color: currentTheme.text }}>
                {weeklyGoals?.goal?.approval_status && (
                  <span
                    className="px-2 py-0.5 rounded text-sm font-medium"
                    style={{
                      backgroundColor: weeklyGoals.goal.approval_status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : weeklyGoals.goal.approval_status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                      color: weeklyGoals.goal.approval_status === 'approved' ? '#059669' : weeklyGoals.goal.approval_status === 'rejected' ? '#dc2626' : '#b45309'
                    }}
                  >
                    {weeklyGoals.goal.approval_status === 'approved' ? 'Onaylandı' : weeklyGoals.goal.approval_status === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor'}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="rounded px-2 py-1 transition-colors"
                style={{
                  color: currentTheme.text,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = `${currentTheme.border}30`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}>
                ✕
              </button>
            </div>
          </div>
          <div className="p-6 space-y-5 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(90vh - 80px)', paddingTop: '10px' }}>
            <div className="flex items-center gap-3 flex-wrap" style={{ paddingBottom: '10px' }}>
              <span className="w-[10px]"></span>
              <button className="rounded px-3 py-1 transition-colors"
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
                onClick={() => {
                  const base = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); base.setDate(base.getDate() - 7);
                  loadWeeklyGoals(fmtYMD(getMonday(base)));
                }}>◀ Önceki</button><span className="w-[10px]"></span>
              <div>
                <input type="date" className="ml-2 rounded px-2 py-1 text-[24px]"
                  style={{
                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.border,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                  value={weeklyWeekStart} onChange={(e) => loadWeeklyGoals(e.target.value)} />
              </div>
              <span className="w-[10px]"></span>
              <button className="rounded px-3 py-1 transition-colors"
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
                onClick={() => { const base = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); base.setDate(base.getDate() + 7); loadWeeklyGoals(fmtYMD(getMonday(base))); }}>Sonraki ▶</button>
              <div className="text-sm text-[24px]" style={{ paddingLeft: '30px', color: currentTheme.text }}>
                {(() => { const cur = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); const next = new Date(cur); next.setDate(next.getDate() + 7); return `Bu hafta: ${isoWeekNumber(cur)} • Gelecek hafta: ${isoWeekNumber(next)}`; })()}
              </div>
              <div className="ml-auto flex items-center gap-4 text-sm text-[24px]" style={{ color: currentTheme.text }}>
                <label className="whitespace-nowrap text-[24px]" style={{ color: currentTheme.text }}>İzin (dk)</label>
                <div
                  className="w-28 text-center rounded px-3 py-1 text-[22px] flex items-center justify-center"
                  title="İzin süresi İzin Bildirimi panelinden girilir"
                  style={{
                    width: '70px',
                    height: '40px',
                    marginLeft: '10px',
                    backgroundColor: (currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background) + '99',
                    color: currentTheme.textSecondary || currentTheme.text,
                    borderColor: currentTheme.border,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  {weeklyLeaveMinutesInput}
                </div>
                <label className="whitespace-nowrap text-[24px]" style={{ marginLeft: '20px', color: currentTheme.text }}>Mesai (dk)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  step="5"
                  min="0"
                  value={weeklyOvertimeMinutesInput}
                  onChange={handleWeeklyOvertimeMinutesChange}
                  disabled={user?.role === 'observer'}
                  onWheel={(e) => {
                    e.target.blur();
                  }}
                  className="w-28 text-center rounded px-3 py-1 text-[22px]"
                  placeholder="0"
                  title="Mesaiye kalma durumunda 2700 dakikayı aşmak için mesai süresi"
                  style={{
                    width: '70px',
                    height: '40px',
                    textAlign: 'center',
                    marginLeft: '10px',
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
                    handleWeeklyOvertimeMinutesBlur(e);
                  }}
                />
              </div>
            </div>
            <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
            <div className="font-medium mb-2 text-[32px] text-center" style={{ color: currentTheme.text }}>Planlı İşler</div>
            <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
            <div className="rounded p-3" style={{ marginLeft: '2px', marginRight: '2px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '8px 8px' }}>
                  <thead>
                    <tr style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                      <th className="px-2 py-2 text-left text-[14px]" style={{ width: '20%', color: currentTheme.text }}>Başlık</th>
                      <th className="px-2 py-2 text-left text-[14px]" style={{ width: '30%', color: currentTheme.text }}>Aksiyon Planları</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Hedef</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Gerçekleşme</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Tamamlandı</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '10%', color: currentTheme.text }}>Açıklama</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Sil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(weeklyGoals.items || []).filter(x => !x.is_unplanned).map((row, idx) => {
                      const lockedTargets = combinedLocks.targets_locked && user?.role !== 'admin';
                      const lockedActuals = combinedLocks.actuals_locked && user?.role !== 'admin';
                      const _t = Math.max(0, Number(row.target_minutes || 0));
                      const _a = Math.max(0, Number(row.actual_minutes || 0));
                      const _isCompleted = row.is_completed === true;
                      const actualIndex = weeklyGoals.items.indexOf(row);
                      const hasValidationError = weeklyValidationErrors.invalidItems.includes(actualIndex);
                      const isOverCapacity = weeklyValidationErrors.overCapacity;

                      return (
                        <tr key={row.id || `p-${idx}`} style={{
                          backgroundColor: currentTheme.tableBackground || currentTheme.background
                        }}>
                          <td className="px-3 py-2 align-middle" style={{ verticalAlign: 'top' }}>
                            <textarea
                              disabled={lockedTargets || user?.role === 'observer'}
                              defaultValue={row.title || ''}
                              key={`title-${row.id || weeklyGoals.items.indexOf(row)}`}
                              ref={(el) => {
                                if (el) {
                                  const key = getTextInputKey(row, 'title');
                                  textInputRefs.current[key] = el;
                                  if (hasValidationError) {
                                    el.style.borderColor = '#ef4444';
                                    el.style.borderWidth = '2px';
                                    el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                                  }
                                }
                              }}
                              onChange={() => {}}
                              onBlur={e => {
                                saveTextInputToState(row, 'title', e.target.value);
                                e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.border;
                                e.target.style.boxShadow = hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none';
                                e.target.style.borderWidth = hasValidationError ? '2px' : '1px';
                              }}
                              className="w-full rounded px-3 py-2 h-[60px] text-[16px] resize-none"
                              placeholder="Başlık girin..."
                              style={{
                                overflow: 'auto',
                                wordWrap: 'break-word',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: hasValidationError ? '#ef4444' : currentTheme.border,
                                borderWidth: hasValidationError ? '2px' : '1px',
                                borderStyle: 'solid',
                                boxShadow: hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.accent;
                                e.target.style.boxShadow = hasValidationError
                                  ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                                  : `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                            />
                            {hasValidationError && !row.title?.trim() && (
                              <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                Bu alan boş bırakılamaz
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle" style={{ verticalAlign: 'top' }}>
                            <textarea
                              disabled={lockedTargets || user?.role === 'observer'}
                              defaultValue={row.action_plan || ''}
                              key={`action_plan-${row.id || weeklyGoals.items.indexOf(row)}`}
                              ref={(el) => {
                                if (el) {
                                  const key = getTextInputKey(row, 'action_plan');
                                  textInputRefs.current[key] = el;
                                  if (hasValidationError) {
                                    el.style.borderColor = '#ef4444';
                                    el.style.borderWidth = '2px';
                                    el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                                  }
                                }
                              }}
                              onChange={() => {}}
                              onBlur={e => {
                                saveTextInputToState(row, 'action_plan', e.target.value);
                                e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.border;
                                e.target.style.boxShadow = hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none';
                                e.target.style.borderWidth = hasValidationError ? '2px' : '1px';
                              }}
                              className="w-full rounded px-3 py-2 min-h-[60px] min-w-[250px] text-[16px] resize-y"
                              placeholder="Aksiyon planı girin..."
                              style={{
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: hasValidationError ? '#ef4444' : currentTheme.border,
                                borderWidth: hasValidationError ? '2px' : '1px',
                                borderStyle: 'solid',
                                boxShadow: hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.accent;
                                e.target.style.boxShadow = hasValidationError
                                  ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                                  : `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                            />
                            {hasValidationError && !row.action_plan?.trim() && (
                              <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                Bu alan boş bırakılamaz
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top', width: '10px' }}>
                            <input type="number" inputMode="numeric" step="1" min="0" disabled={lockedTargets || user?.role === 'observer'} value={row.target_minutes || 0}
                              onChange={e => {
                                updateNumberInput(row, 'target_minutes', e.target.value);
                              }}
                              onWheel={(e) => {
                                e.target.blur();
                              }}
                              className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                              style={{
                                width: '60px',
                                height: '60px',
                                textAlign: 'center',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: (hasValidationError || isOverCapacity) ? '#ef4444' : currentTheme.border,
                                borderWidth: (hasValidationError || isOverCapacity) ? '2px' : '1px',
                                borderStyle: 'solid',
                                boxShadow: (hasValidationError || isOverCapacity) ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
                              }}
                              onFocus={(e) => {
                                if (!lockedTargets && user?.role !== 'observer') {
                                  e.target.style.borderColor = (hasValidationError || isOverCapacity) ? '#ef4444' : currentTheme.accent;
                                  e.target.style.boxShadow = (hasValidationError || isOverCapacity)
                                    ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                                    : `0 0 0 2px ${currentTheme.accent}40`;
                                }
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = (hasValidationError || isOverCapacity) ? '#ef4444' : currentTheme.border;
                                e.target.style.boxShadow = (hasValidationError || isOverCapacity) ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none';
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top', width: '10px' }}>
                            <input type="number" inputMode="numeric" step="1" min="0" disabled={lockedActuals || user?.role === 'observer'} value={row.actual_minutes || 0}
                              onChange={e => {
                                updateNumberInput(row, 'actual_minutes', e.target.value);
                              }}
                              onWheel={(e) => {
                                e.target.blur();
                              }}
                              className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                              style={{
                                width: '60px',
                                height: '60px',
                                textAlign: 'center',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: isOverCapacity ? '#ef4444' : currentTheme.border,
                                borderWidth: isOverCapacity ? '2px' : '1px',
                                borderStyle: 'solid',
                                boxShadow: isOverCapacity ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
                              }}
                              onFocus={(e) => {
                                if (!lockedActuals && user?.role !== 'observer') {
                                  e.target.style.borderColor = isOverCapacity ? '#ef4444' : currentTheme.accent;
                                  e.target.style.boxShadow = isOverCapacity
                                    ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                                    : `0 0 0 2px ${currentTheme.accent}40`;
                                }
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = isOverCapacity ? '#ef4444' : currentTheme.border;
                                e.target.style.boxShadow = isOverCapacity ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none';
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top' }}>
                            {(() => {
                              const hasActualMinutes = Number(row.actual_minutes || 0) > 0;
                              const canMarkCompleted = !lockedActuals && user?.role !== 'observer' && hasActualMinutes;
                              return (
                                <input
                                  type="checkbox"
                                  checked={!!row.is_completed}
                                  disabled={!canMarkCompleted}
                                  onChange={e => {
                                    if (!canMarkCompleted) return;
                                    const items = [...weeklyGoals.items];
                                    items.find((r, i) => i === weeklyGoals.items.indexOf(row)).is_completed = e.target.checked;
                                    setWeeklyGoals({ ...weeklyGoals, items });
                                  }}
                                  className="w-6 h-6 cursor-pointer"
                                  style={{ width: '60px', height: '60px', cursor: canMarkCompleted ? 'pointer' : 'not-allowed' }}
                                  title={hasActualMinutes ? 'İş tamamlandı mı?' : 'Tamamlandı seçmek için gerçekleşme süresi girin'}
                                />
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2 align-middle text-center align-middle">
                            <button
                              className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[24px] transition-colors buttonHoverEffect"
                              style={{
                                backgroundColor: row.description?.trim() ? 'rgba(237, 241, 21, 0.62)' : 'rgba(8, 87, 234, 0.4)',
                                width: '60px',
                                height: '60px',
                                borderRadius: '9999px'
                              }}
                              onClick={() => {
                                const index = weeklyGoals.items.indexOf(row);
                                setSelectedGoalIndex(index);
                                setShowGoalDescription(true);
                                setTimeout(() => {
                                  if (goalDescriptionRef.current) {
                                    goalDescriptionRef.current.value = row.description || '';
                                  }
                                }, 0);
                              }}
                              title="Açıklama Ekle/Düzenle"
                            >
                              🔍
                            </button>
                          </td>
                          <td className="px-3 py-2 align-middle text-center align-middle">
                            {(() => {
                              const canDelete = (user?.role !== 'observer') && (!lockedTargets || user?.role === 'admin');
                              return (
                                <button
                                  disabled={!canDelete}
                                  className={`inline-flex items-center justify-center text-[24px] buttonHoverEffect ${canDelete ? 'text-blue-300 hover:text-blue-200' : 'text-gray-400'}`}
                                  style={{ width: '60px', height: '60px', borderRadius: '9999px', backgroundColor: canDelete ? 'rgba(241, 91, 21, 0.62)' : 'rgba(148,163,184,0.35)', cursor: canDelete ? 'pointer' : 'default', pointerEvents: canDelete ? 'auto' : 'none' }}
                                  onClick={() => {
                                    if (!canDelete) return;
                                    const items = weeklyGoals.items.filter(x => x !== row);
                                    setWeeklyGoals({ ...weeklyGoals, items });
                                  }}
                                >
                                  🗑️
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {user?.role !== 'observer' && (
                <div className="mt-2 flex gap-2" style={{ paddingBottom: '10px' }}>
                  <button className="flex-1 rounded px-4 py-2 text-[24px] transition-colors"
                    disabled={combinedLocks.targets_locked && user?.role !== 'admin'}
                    style={{
                      backgroundColor: (combinedLocks.targets_locked && user?.role !== 'admin') ? `${currentTheme.border}80` : currentTheme.accent,
                      color: (combinedLocks.targets_locked && user?.role !== 'admin') ? currentTheme.textSecondary || currentTheme.text : '#ffffff',
                      cursor: (combinedLocks.targets_locked && user?.role !== 'admin') ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!(combinedLocks.targets_locked && user?.role !== 'admin')) {
                        const hex = currentTheme.accent.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(combinedLocks.targets_locked && user?.role !== 'admin')) {
                        e.target.style.backgroundColor = currentTheme.accent;
                      } else {
                        e.target.style.backgroundColor = `${currentTheme.border}80`;
                      }
                    }}
                    onClick={() => { setWeeklyGoals({ ...weeklyGoals, items: [...weeklyGoals.items, { title: '', action_plan: '', target_minutes: 0, weight_percent: 0, actual_minutes: 0, is_unplanned: false, is_completed: false }] }); }}
                  >
                    Ekle</button>
                  <button
                    className="flex-1 rounded px-4 py-2 text-[24px] transition-colors"
                    disabled={(combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...'}
                    style={{
                      backgroundColor: ((combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...') ? `${currentTheme.border}80` : currentTheme.accent,
                      color: ((combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...') ? currentTheme.textSecondary || currentTheme.text : '#ffffff',
                      cursor: ((combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...') ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!(combinedLocks.targets_locked && user?.role !== 'admin') && transferButtonText !== 'Aktarılıyor...') {
                        const hex = currentTheme.accent.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(combinedLocks.targets_locked && user?.role !== 'admin') && transferButtonText !== 'Aktarılıyor...') {
                        e.target.style.backgroundColor = currentTheme.accent;
                      } else {
                        e.target.style.backgroundColor = `${currentTheme.border}80`;
                      }
                    }}
                    onClick={transferIncompleteTasksFromPreviousWeek}
                    title="Önceki haftadan tamamlanmamış (Tamamlandı olarak işaretlenmemiş) planlı işleri mevcut haftaya aktarır. Aktarılan işlerin gerçekleşme süreleri sıfırlanır ve tamamlanmamış olarak işaretlenir."
                  >
                    {transferButtonText}</button>
                </div>
              )}
            </div>
            <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
            <div className="font-medium mb-2 text-[32px] text-center" style={{ color: currentTheme.text }}>Plana Dahil Olmayan İşler</div>
            <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
            <div className="rounded p-3" style={{ marginLeft: '2px', marginRight: '2px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '8px 6px' }}>
                  <thead>
                    <tr style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                      <th className="px-2 py-2 text-left text-[14px]" colSpan="2" style={{ width: '30%', color: currentTheme.text }}>Başlık</th>
                      <th className="px-2 py-2 text-left text-[14px]" colSpan="3" style={{ width: '40%', color: currentTheme.text }}>İş Ayrıntısı</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '10%', color: currentTheme.text }}>Süre(dk)</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Ağırlık(%)</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '10%', color: currentTheme.text }}>Açıklama</th>
                      <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Sil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(weeklyGoals.items || []).filter(x => x.is_unplanned).map((row, idx) => {
                      const actualIndex = weeklyGoals.items.indexOf(row);
                      const hasValidationError = weeklyValidationErrors.invalidItems.includes(actualIndex);
                      return (
                        <tr key={row.id || `u-${idx}`} style={{
                          backgroundColor: currentTheme.tableBackground || currentTheme.background
                        }}>
                          <td className="px-3 py-2 align-top" colSpan="2" style={{ verticalAlign: 'top' }}>
                            <textarea
                              disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'}
                              defaultValue={row.title || ''}
                              key={`title-unplanned-${row.id || weeklyGoals.items.indexOf(row)}`}
                              ref={(el) => {
                                if (el) {
                                  const key = getTextInputKey(row, 'title');
                                  textInputRefs.current[key] = el;
                                  if (hasValidationError) {
                                    el.style.borderColor = '#ef4444';
                                    el.style.borderWidth = '2px';
                                    el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                                  }
                                }
                              }}
                              onChange={() => {}}
                              onBlur={e => {
                                saveTextInputToState(row, 'title', e.target.value);
                                e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.border;
                                e.target.style.boxShadow = hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none';
                                e.target.style.borderWidth = hasValidationError ? '2px' : '1px';
                              }}
                              className="w-full rounded px-3 py-2 h-[60px] text-[16px] resize-none"
                              style={{
                                overflow: 'auto',
                                wordWrap: 'break-word',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: hasValidationError ? '#ef4444' : currentTheme.border,
                                borderWidth: hasValidationError ? '2px' : '1px',
                                borderStyle: 'solid',
                                boxShadow: hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
                              }}
                              placeholder="Başlık girin..."
                              onFocus={(e) => {
                                if (!(combinedLocks.actuals_locked && user?.role !== 'admin') && user?.role !== 'observer') {
                                  e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.accent;
                                  e.target.style.boxShadow = hasValidationError
                                    ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                                    : `0 0 0 2px ${currentTheme.accent}40`;
                                }
                              }}
                            />
                            {hasValidationError && !row.title?.trim() && (
                              <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                Bu alan boş bırakılamaz
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top" colSpan="3" style={{ verticalAlign: 'top' }}>
                            <textarea
                              disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'}
                              defaultValue={row.action_plan || ''}
                              key={`action_plan-unplanned-${row.id || weeklyGoals.items.indexOf(row)}`}
                              ref={(el) => {
                                if (el) {
                                  const key = getTextInputKey(row, 'action_plan');
                                  textInputRefs.current[key] = el;
                                  if (hasValidationError) {
                                    el.style.borderColor = '#ef4444';
                                    el.style.borderWidth = '2px';
                                    el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                                  }
                                }
                              }}
                              onChange={() => {}}
                              onBlur={e => {
                                saveTextInputToState(row, 'action_plan', e.target.value);
                                e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.border;
                                e.target.style.boxShadow = hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none';
                                e.target.style.borderWidth = hasValidationError ? '2px' : '1px';
                              }}
                              className="w-full rounded px-3 py-2 h-[60px] text-[16px] resize-none"
                              style={{
                                overflow: 'auto',
                                wordWrap: 'break-word',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: hasValidationError ? '#ef4444' : currentTheme.border,
                                borderWidth: hasValidationError ? '2px' : '1px',
                                borderStyle: 'solid',
                                boxShadow: hasValidationError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
                              }}
                              placeholder="İş ayrıntısı girin..."
                              onFocus={(e) => {
                                if (!(combinedLocks.actuals_locked && user?.role !== 'admin') && user?.role !== 'observer') {
                                  e.target.style.borderColor = hasValidationError ? '#ef4444' : currentTheme.accent;
                                  e.target.style.boxShadow = hasValidationError
                                    ? '0 0 0 2px rgba(239, 68, 68, 0.3)'
                                    : `0 0 0 2px ${currentTheme.accent}40`;
                                }
                              }}
                            />
                            {hasValidationError && !row.action_plan?.trim() && (
                              <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                Bu alan boş bırakılamaz
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            <input type="number" disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'} value={row.actual_minutes || 0}
                              onChange={e => {
                                updateNumberInput(row, 'actual_minutes', e.target.value);
                              }}
                              onWheel={(e) => {
                                e.target.blur();
                              }}
                              className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                              style={{
                                width: '60px',
                                height: '60px',
                                textAlign: 'center',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: currentTheme.border,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                              onFocus={(e) => {
                                if (!(combinedLocks.actuals_locked && user?.role !== 'admin') && user?.role !== 'observer') {
                                  e.target.style.borderColor = currentTheme.accent;
                                  e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                }
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = currentTheme.border;
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            <button
                              className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[18px] transition-colors buttonHoverEffect"
                              style={{
                                backgroundColor: row.description?.trim() ? 'rgba(237, 241, 21, 0.62)' : 'rgba(8, 87, 234, 0.4)',
                                width: '60px',
                                height: '60px',
                                borderRadius: '9999px'
                              }}
                              onClick={() => {
                                const index = weeklyGoals.items.indexOf(row);
                                setSelectedGoalIndex(index);
                                setShowGoalDescription(true);
                                setTimeout(() => {
                                  if (goalDescriptionRef.current) {
                                    goalDescriptionRef.current.value = row.description || '';
                                  }
                                }, 0);
                              }}
                              title="Açıklama Ekle/Düzenle"
                            >
                              🔍
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center align-top">
                            {(() => {
                              const canDelete = (!combinedLocks.actuals_locked || user?.role === 'admin') && user?.role !== 'observer';
                              return (
                                <button
                                  disabled={!canDelete}
                                  className={`inline-flex items-center justify-center text-[24px] buttonHoverEffect ${canDelete ? 'text-blue-300 hover:text-blue-200' : 'text-gray-400'}`}
                                  style={{ width: '60px', height: '60px', borderRadius: '9999px', backgroundColor: canDelete ? 'rgba(241, 91, 21, 0.62)' : 'rgba(148,163,184,0.35)', cursor: canDelete ? 'pointer' : 'default', pointerEvents: canDelete ? 'auto' : 'none' }}
                                  onClick={() => { if (!canDelete) return; const items = weeklyGoals.items.filter(x => x !== row); setWeeklyGoals({ ...weeklyGoals, items }); }}>
                                  🗑️
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {user?.role !== 'observer' && (
                <div className="mt-2" style={{ paddingBottom: '10px' }}>
                  <button className="w-full rounded px-4 py-2 text-[24px] transition-colors"
                    disabled={combinedLocks.actuals_locked && user?.role !== 'admin'}
                    style={{
                      backgroundColor: (combinedLocks.actuals_locked && user?.role !== 'admin') ? `${currentTheme.border}80` : currentTheme.accent,
                      color: (combinedLocks.actuals_locked && user?.role !== 'admin') ? currentTheme.textSecondary || currentTheme.text : '#ffffff',
                      cursor: (combinedLocks.actuals_locked && user?.role !== 'admin') ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!(combinedLocks.actuals_locked && user?.role !== 'admin')) {
                        const hex = currentTheme.accent.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(combinedLocks.actuals_locked && user?.role !== 'admin')) {
                        e.target.style.backgroundColor = currentTheme.accent;
                      } else {
                        e.target.style.backgroundColor = `${currentTheme.border}80`;
                      }
                    }}
                    onClick={() => { setWeeklyGoals({ ...weeklyGoals, items: [...weeklyGoals.items, { title: '', action_plan: '', actual_minutes: 0, is_unplanned: true, is_completed: false }] }); }}
                  >
                    Ekle</button>
                </div>
              )}
            </div>
            <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
            <div className="font-semibold text-[32px] text-center" style={{ color: currentTheme.text }}>Hedef Ayrıntısı</div>
            <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
            <div className="mt-6 rounded p-8" style={{ paddingLeft: '10px', paddingRight: '10px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
              {(() => {
                const items = Array.isArray(weeklyGoals.items) ? weeklyGoals.items : [];
                const plannedItems = items.filter(x => !x.is_unplanned);
                const unplannedItems = items.filter(x => x.is_unplanned);
                const plannedCount = plannedItems.length;
                const unplannedCount = unplannedItems.length;
                const totalCount = items.length;

                const overtimeMinutes = Number(weeklyLive?.overtimeMinutes || 0);
                const maxActualLimit = getMaxActualLimitForToday(weeklyWeekStart || fmtYMD(getMonday()), overtimeMinutes);

                const dailyAvailableMinutes = maxActualLimit;
                const remainingTime = Math.max(0, dailyAvailableMinutes - weeklyLive.totalActual);

                const dailyLimits = getDailyActualLimits();
                const overtimeLimits = getDailyOvertimeLimits();

                const dailyLimitTooltip = [
                  `Günlük Kullanılabilir Süreler (Gerçekleşme Kotası + Mesai):`,
                  ``,
                  `Pazartesi: ${dailyLimits[1] ?? 540} dk + ${overtimeLimits[1] ?? 150} dk mesai = ${(dailyLimits[1] ?? 540) + (overtimeLimits[1] ?? 150)} dk`,
                  `Salı: ${dailyLimits[2] ?? 1080} dk + ${overtimeLimits[2] ?? 300} dk mesai = ${(dailyLimits[2] ?? 1080) + (overtimeLimits[2] ?? 300)} dk`,
                  `Çarşamba: ${dailyLimits[3] ?? 1620} dk + ${overtimeLimits[3] ?? 450} dk mesai = ${(dailyLimits[3] ?? 1620) + (overtimeLimits[3] ?? 450)} dk`,
                  `Perşembe: ${dailyLimits[4] ?? 2160} dk + ${overtimeLimits[4] ?? 600} dk mesai = ${(dailyLimits[4] ?? 2160) + (overtimeLimits[4] ?? 600)} dk`,
                  `Cuma: ${dailyLimits[5] ?? 2700} dk + ${overtimeLimits[5] ?? 750} dk mesai = ${(dailyLimits[5] ?? 2700) + (overtimeLimits[5] ?? 750)} dk`,
                ].join('\n');

                const bd = weeklyLive.breakdown || {};
                const p1 = Number(((bd.PenaltyP1 || 0) * 100).toFixed(2));
                const peasa = Number(((bd.PenaltyEASA || 0) * 100).toFixed(2));
                const speedBonus = Number(((bd.SpeedBonusRaw || 0) * 100).toFixed(2));
                const overtimeBonus = Number(((bd.OvertimeBonus || 0) * 100).toFixed(2));
                const overtimeUsed = Number(weeklyLive.overtimeUsed || 0);

                const baseScore = bd.T_allow > 0 ? (bd.sumPlannedMinutes / bd.T_allow) * 100 : 0;
                const planlyEffect = Number(((bd.PlanlyScore || 0) * 100 - baseScore).toFixed(2));
                const incompleteEffect = Number((planlyEffect - speedBonus).toFixed(2));

                const net = Number((weeklyLive.finalScore - baseScore).toFixed(2));

                const tip = `Kesinti/Bonus Detayı\n\n🔴 CEZALAR:\nGecikme + Tamamlanmama Cezası: ${incompleteEffect < 0 ? '' : '+'}${incompleteEffect.toFixed(2)}%\nAçık Cezası (P1): -${p1.toFixed(2)}%\nKullanılmayan Süre Cezası (EASA): -${peasa.toFixed(2)}%\n\n🟢 BONUSLAR:\nHız/Tasarruf Bonusu: ${speedBonus > 0 ? '+' : ''}${speedBonus.toFixed(2)}%\nMesai Bonusu: ${overtimeBonus > 0 ? '+' : ''}${overtimeBonus.toFixed(2)}% (${overtimeUsed} dk mesai, 1.5x çarpan)\n\n📊 TOPLAM:\nNet: ${net >= 0 ? '+' : ''}${net.toFixed(2)}%\n\nPerformans Sonucu: ${weeklyLive.finalScore}%`;

                return (
                  <div className={`grid gap-x-8 gap-y-3 text-[20px] items-center ${canShowScoreSection ? 'grid-cols-[5%_13%_20%_13%_20%_13%_15%_5%]' : 'grid-cols-[5%_13%_20%_13%_20%_5%]'}`}>
                    <div className="flex flex-col gap-3"></div>
                    <div className="flex flex-col gap-3">
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>İzin Süresi:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Mesai Süresi:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Toplam Süre:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Planlı Süre:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Plandışı Süre:</div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.leaveMinutes} dk</div>
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.overtimeMinutes} dk</div>
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>
                        {WEEKLY_BASE_MINUTES + weeklyLive.overtimeMinutes - weeklyLive.leaveMinutes} dk
                      </div>
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>
                        {weeklyLive.totalTarget > 0 ? `${weeklyLive.totalTarget} dk` : '0 dk'}
                      </div>
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.unplannedMinutes} dk</div>
                    </div>

                    <div className="flex flex-col gap-3 ml-4">
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Kullanılan Süre:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Kullanılabilir Süre:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Planlı İş:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Plandışı İş:</div>
                      <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Toplam İş:</div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>
                        {(Number(weeklyLive.plannedActual || 0) + Number(weeklyLive.unplannedMinutes || 0))} dk
                      </div>
                      <div
                        className="font-semibold whitespace-nowrap text-left cursor-help"
                        style={{ color: currentTheme.text }}
                        title={dailyLimitTooltip}
                      >
                        {remainingTime} dk
                      </div>
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{plannedCount} Adet</div>
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{unplannedCount} Adet</div>
                      <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{totalCount} Adet</div>
                    </div>

                    {canShowScoreSection && (
                      <>
                        <div className="flex flex-col gap-3 ml-4">
                          {canShowFullScore && (
                            <>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Planlı Skor:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Plandışı Skor:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }} title={tip}>Kesinti/Bonus:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Performans Skoru:</div>
                            </>
                          )}
                          <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Değerlendirme:</div>
                        </div>

                        <div className="flex flex-col gap-3">
                          {canShowFullScore && (
                            <>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.plannedScore}%</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{Number(weeklyLive.unplannedPercent || 0)}%</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: net >= 0 ? '#10b981' : '#ef4444' }} title={tip}>
                                {net >= 0 ? '+' : ''}{net.toFixed(2)}%
                              </div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.finalScore}%</div>
                            </>
                          )}
                          <div className="font-bold whitespace-nowrap text-left" style={{ color: getPerformanceGrade(weeklyLive.finalScore).color }}>
                            {canShowFullScore ? getPerformanceGrade(weeklyLive.finalScore).description : getPerformanceGrade(weeklyLive.finalScore).grade}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex flex-col gap-3"></div>
                  </div>
                );
              })()}
            </div>
            {weeklyValidationErrors.overCapacity && (() => {
              const plannedActual = weeklyLive?.plannedActual || 0;
              const unplannedMinutes = weeklyLive?.unplannedMinutes || 0;
              const totalUsedMinutes = plannedActual + unplannedMinutes;
              if (totalUsedMinutes > weeklyLive.availableMinutes) {
                return (
                  <div className="mt-4 mx-4 p-4 rounded-lg border-2" style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: '#ef4444',
                    color: '#ef4444'
                  }}>
                    <div className="font-semibold text-lg mb-2">⚠️ Süre Aşımı Uyarısı</div>
                    <div className="text-base">
                      Kullanılan süre ({plannedActual} dk) + Plandışı süre ({unplannedMinutes} dk) = {totalUsedMinutes} dk, toplam süreyi ({weeklyLive.availableMinutes} dk) aşıyor.
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            {weeklyValidationErrors.overDailyLimit && weeklyValidationErrors.overDailyLimitAmount > 0 && (
              <div className="mt-4 mx-4 p-4 rounded-lg border-2" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#ef4444',
                color: '#ef4444'
              }}>
                <div className="font-semibold text-lg mb-2">⚠️ Günlük Kota Aşımı Uyarısı</div>
                <div className="text-base">
                  Toplam gerçekleşme süresi ({weeklyValidationErrors.overDailyLimitAmount} dk) günlük kotayı ({weeklyValidationErrors.overDailyLimitMax} dk) aşıyor. Lütfen gerçekleşme sürelerini günlük kotaya uygun şekilde düzenleyin.
                </div>
              </div>
            )}
            <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
            <div className="flex items-center gap-3 w-[98%]" style={{ marginTop: '10px', marginLeft: '16px', marginRight: '16px', marginBottom: '12px' }}>
              <button className="flex-1 rounded px-4 py-2 transition-colors"
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
                onClick={() => loadWeeklyGoals(weeklyWeekStart)}>Son Kaydedileni Yükle</button>
              <span className="w-[10px]"></span>
              {user?.role !== 'observer' && (!combinedLocks.targets_locked || user?.role === 'admin' || user?.role === 'team_member' || user?.role === 'team_leader') && (
                <button
                  className="flex-1 rounded px-4 py-2 transition-colors disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: weeklySaveState === 'saving'
                      ? currentTheme.accent
                      : weeklySaveState === 'saved'
                        ? '#10b981'
                        : '#10b981',
                    color: '#ffffff',
                    opacity: (weeklySaveState === 'saving' ||
                      (user?.role !== 'admin' && weeklyLive.overActualCapacity) ||
                      weeklyValidationErrors.overCapacity ||
                      weeklyValidationErrors.overDailyLimit ||
                      weeklyValidationErrors.invalidItems.length > 0) ? 0.6 : 1
                  }}
                  disabled={
                    weeklySaveState === 'saving' ||
                    (user?.role !== 'admin' && weeklyLive.overActualCapacity) ||
                    weeklyValidationErrors.overCapacity ||
                    weeklyValidationErrors.overDailyLimit ||
                    weeklyValidationErrors.invalidItems.length > 0
                  }
                  onMouseEnter={(e) => {
                    const isDisabled = weeklySaveState === 'saving' ||
                      (user?.role !== 'admin' && weeklyLive.overActualCapacity) ||
                      weeklyValidationErrors.overCapacity ||
                      weeklyValidationErrors.overDailyLimit ||
                      weeklyValidationErrors.invalidItems.length > 0;
                    if (!isDisabled) {
                      e.target.style.backgroundColor = weeklySaveState === 'saved' ? '#059669' : '#059669';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isDisabled = weeklySaveState === 'saving' ||
                      (user?.role !== 'admin' && weeklyLive.overActualCapacity) ||
                      weeklyValidationErrors.overCapacity ||
                      weeklyValidationErrors.overDailyLimit ||
                      weeklyValidationErrors.invalidItems.length > 0;
                    if (!isDisabled) {
                      e.target.style.backgroundColor = weeklySaveState === 'saved' ? '#10b981' : '#10b981';
                    }
                  }}
                  onClick={saveWeeklyGoals}
                >
                  {weeklySaveState === 'saving' ? 'Kaydediliyor...' : weeklySaveState === 'saved' ? 'Kaydedildi ✓' : 'Kaydet'}
                </button>
              )}
            </div>
            {weeklyUserId && (user?.role === 'admin' || (user?.role === 'team_leader' && !combinedLocks.targets_locked)) && (
              <div className="flex items-center gap-3 w-[98%]" style={{ marginLeft: '16px', marginRight: '16px', marginBottom: '12px' }}>
                <button
                  onClick={() => approveWeeklyGoals?.('approved')}
                  className="flex-1 rounded px-4 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#10b981', color: 'white' }}
                >
                  Onayla
                </button>
                <span className="w-[10px]"></span>
                <button
                  onClick={() => {
                    const note = window.prompt('Reddetme notu (opsiyonel):');
                    approveWeeklyGoals?.('rejected', note || undefined);
                  }}
                  className="flex-1 rounded px-4 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >
                  Reddet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(jsx, document.body);
}
