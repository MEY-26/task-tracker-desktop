import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';

export function GoalDescriptionModal({
  open,
  onClose,
  selectedGoalIndex,
  weeklyGoals,
  setWeeklyGoals,
  goalDescriptionRef,
  saveWeeklyGoals,
  user
}) {
  const { currentTheme } = useTheme();
  const { addNotification } = useNotification();

  if (!open) return null;

  const row = selectedGoalIndex !== null && Array.isArray(weeklyGoals?.items)
    ? weeklyGoals.items[selectedGoalIndex]
    : null;

  const handleSave = async () => {
    if (selectedGoalIndex !== null) {
      const items = [...weeklyGoals.items];
      const descriptionValue = goalDescriptionRef?.current?.value || '';
      items[selectedGoalIndex].description = descriptionValue;
      setWeeklyGoals({ ...weeklyGoals, items });
      onClose();

      try {
        await saveWeeklyGoals();
        addNotification('Açıklama başarıyla kaydedildi.', 'success');
      } catch (error) {
        console.warn('Goal description save failed:', error);
        addNotification('Açıklama kaydedilemedi ama yerel olarak saklandı.', 'warning');
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999998]" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'auto'
    }}>
      <div className="absolute inset-0" onClick={onClose} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
      <div className="relative z-10 w-[30vw] max-w-4xl rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
        style={{
          maxHeight: '80vh',
          transform: 'translate(0, 0)',
          margin: 'auto',
          paddingRight: '5px',
          pointerEvents: 'auto',
          backgroundColor: currentTheme.tableBackground || currentTheme.background,
          borderColor: currentTheme.border,
          borderWidth: '1px',
          borderStyle: 'solid',
          color: currentTheme.text
        }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-6 py-4 border-b" style={{ paddingRight: '10px', paddingLeft: '10px', backgroundColor: currentTheme.background, borderColor: currentTheme.border }}>
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h3 className="text-xl font-semibold" style={{ color: currentTheme.text }}>Ek Açıklama</h3>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={onClose}
              className="rounded px-2 py-1 transition-colors"
              style={{
                color: currentTheme.textSecondary || currentTheme.text,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = currentTheme.text;
                e.target.style.backgroundColor = `${currentTheme.border}30`;
              }}
              onMouseLeave={(e) => {
                e.target.style.color = currentTheme.textSecondary || currentTheme.text;
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-8" style={{ maxHeight: 'calc(80vh - 80px)', paddingLeft: '10px', paddingRight: '10px', paddingBottom: '10px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
          {row && (
            <>
              <div className="flex-1 gap-3 mb-6 p-6 rounded-lg" style={{ backgroundColor: currentTheme.tableBackground }}>
                {row.title && (
                  <h3 className="text-xl font-medium mb-3" style={{ color: currentTheme.text }}>Hedef: {row.title || 'Başlık belirtilmemiş'}</h3>
                )}
                {row.action_plan && (
                  <h3 className="text-xl font-medium mb-3" style={{ color: currentTheme.text }}>Aksiyon Planı: {row.action_plan}</h3>
                )}
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-medium mb-3" style={{ color: currentTheme.text }}>Açıklama:</h3>
                <textarea
                  defaultValue={row.description || ''}
                  key={`goal-description-${selectedGoalIndex}`}
                  ref={(el) => {
                    if (goalDescriptionRef) goalDescriptionRef.current = el;
                    if (el && selectedGoalIndex !== null) {
                      const r = weeklyGoals.items[selectedGoalIndex];
                      if (r && el.value !== (r.description || '')) {
                        el.value = r.description || '';
                      }
                    }
                  }}
                  onChange={() => {}}
                  className="w-full !h-[200px] rounded px-4 py-3 text-[24px] resize-none text-base focus:outline-none"
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
                  placeholder="Ek açıklamalarınızı buraya yazabilirsiniz..."
                  disabled={user?.role === 'observer'}
                />
                <style>{`
                  textarea::placeholder {
                    color: var(--theme-placeholder) !important;
                    opacity: 0.7 !important;
                  }
                `}</style>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 rounded transition-colors text-lg font-medium"
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
                <span className="w-[20px]"></span>
                {user?.role !== 'observer' && (
                  <button
                    onClick={handleSave}
                    className="w-full px-6 py-3 rounded transition-colors text-lg font-medium"
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
                    Kaydet
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
