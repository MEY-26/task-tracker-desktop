import React from 'react';

/**
 * Tüm modal/panel başlıklarında aynı görünüm (İzin Bildirimi ile aynı):
 * grid, px-5 py-3, border-b, tableHeader arka plan, text-lg ortada, ✕ sağda.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title
 * @param {() => void} [props.onClose]
 * @param {object} props.theme - { tableHeader, border, text }
 * @param {React.ReactNode} [props.left]
 * @param {React.ReactNode} [props.right] - Kapat düğmesinin solunda (örn. Excel, rozet)
 */
export function ModalHeader({ title, onClose, theme, left, right }) {
  const t = theme || {};
  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3 border-b shrink-0"
      style={{ backgroundColor: t.tableHeader || t.border, borderColor: t.border }}
    >
      <div className="justify-self-start min-w-0">{left}</div>
      <h3 className="text-lg font-semibold text-center" style={{ color: t.text }}>
        {title}
      </h3>
      <div className="justify-self-end flex items-center gap-2">
        {right}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded px-2 py-1 transition-colors"
            style={{ color: t.text, backgroundColor: 'transparent' }}
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
