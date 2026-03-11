import React, { useState, useRef } from 'react';
import { formatDateOnly } from '../../utils/date';

export function TooltipStatus({
  task,
  onLoadHistory,
  getStatusColor,
  getStatusText,
  formatDateOnly: formatDateOnlyProp,
  getLastAddedDescription,
  currentTheme
}) {
  const fmtDateOnly = formatDateOnlyProp || formatDateOnly;
  const [tooltipPosition, setTooltipPosition] = useState({ visible: false, top: 0, left: 0, arrowPosition: 'bottom', arrowLeft: 0 });
  const statusRef = useRef(null);

  const handleMouseEnter = () => {
    onLoadHistory();

    if (statusRef.current) {
      const rect = statusRef.current.getBoundingClientRect();
      const tooltipHeight = 150;
      const tooltipWidth = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      const clampedLeft = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

      let top, arrowPosition;

      if (spaceBelow < tooltipHeight + 20 && spaceAbove > tooltipHeight + 20) {
        top = rect.top - tooltipHeight - 10;
        arrowPosition = 'bottom';
      } else {
        top = rect.bottom + 10;
        arrowPosition = 'top';
      }

      if (top < 10) {
        top = 10;
      } else if (top + tooltipHeight > window.innerHeight - 10) {
        top = window.innerHeight - tooltipHeight - 10;
      }

      setTooltipPosition({
        visible: true,
        top,
        left: clampedLeft,
        arrowPosition,
        arrowLeft: rect.left + (rect.width / 2) - clampedLeft
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltipPosition({ visible: false, top: 0, left: 0, arrowPosition: 'bottom' });
  };

  return (
    <div
      ref={statusRef}
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="w-8 h-8 rounded-full cursor-help shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: getStatusColor(task.status, task),
          border: `3px solid ${currentTheme?.border || 'rgba(255, 255, 255, 0.3)'}`,
          boxShadow: `0 4px 12px ${currentTheme?.background || 'rgba(0, 0, 0, 0.3)'}80, 0 0 0 1px ${currentTheme?.border || 'rgba(255, 255, 255, 0.1)'}`,
          width: '24px',
          height: '24px'
        }}
      ></div>
      {tooltipPosition.visible && (
        <div
          className="fixed px-4 py-3 text-xs rounded-xl shadow-xl transition-opacity duration-200 pointer-events-none z-[9999]"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            opacity: 1,
            backgroundColor: currentTheme?.tableBackground || currentTheme?.background || 'rgba(17, 24, 39, 0.98)',
            color: currentTheme?.text || '#ffffff',
            border: `1px solid ${currentTheme?.border || 'rgba(156, 163, 175, 1)'}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            minWidth: '300px',
            maxWidth: '400px',
            padding: '20px 16px'
          }}
          onMouseEnter={(e) => e.stopPropagation()}
        >
          <div className="text-justify" style={{ color: currentTheme?.text || '#ffffff' }}>Bitiş Tarihi: {task.due_date ? fmtDateOnly(task.due_date) : 'Belirtilmemiş'}</div>
          <div className="text-justify" style={{ color: currentTheme?.text || '#ffffff' }}>Durum: {getStatusText(task.status, task)}</div>
          <div className="max-w-full break-words whitespace-normal text-justify" style={{ color: currentTheme?.text || '#ffffff' }}>{getLastAddedDescription()}</div>
          <div
            className="absolute w-0 h-0 border-l-4 border-r-4"
            style={{
              [tooltipPosition.arrowPosition === 'top' ? 'bottom' : 'top']: '-4px',
              left: `${tooltipPosition.arrowLeft}px`,
              transform: 'translateX(-50%)',
              [tooltipPosition.arrowPosition === 'top'
                ? 'borderTopColor'
                : 'borderBottomColor']: currentTheme?.tableBackground || currentTheme?.background || 'rgba(17, 24, 39, 0.98)',
              [tooltipPosition.arrowPosition === 'top'
                ? 'borderBottomColor'
                : 'borderTopColor']: 'transparent',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent'
            }}
          ></div>
        </div>
      )}
    </div>
  );
}
