import React, { useState } from 'react';

const PRIORITY_LEVELS = [
  { label: 'Düşük', description: 'Süreci aksatmayan, geliştirme/iyileştirme amaçlı görevler.', color: '#10b981' },
  { label: 'Orta', description: 'Stoklu ürün; sipariş stok altına inse bile acil üretim/sevkiyat gerekmiyor.', color: '#eab308' },
  { label: 'Yüksek', description: 'Belirli bir ürünün üretim/sevkiyatını tamamen ya da kısmen aksatabilir.', color: '#f97316' },
  { label: 'Kritik', description: 'Tüm üretimi/sevkiyatı tamamen/kısmen durdurma riski var.', color: '#ef4444' }
];

export function PriorityLabelWithTooltip({ htmlFor, currentTheme }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative flex items-center gap-2 cursor-help"
      style={{ justifySelf: 'start' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <label
        htmlFor={htmlFor}
        className="!text-[24px] sm:!text-[16px] font-medium text-left"
        style={{ color: currentTheme?.text || '#e5e7eb' }}
      >
        Öncelik
      </label>
      {visible && (
        <div
          className="absolute top-full left-0 z-[9999] mt-3 w-[700px] translate-x-[80px] transform rounded-2xl p-4 text-sm shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-md text-left"
          style={{
            backgroundColor: currentTheme?.tableBackground || currentTheme?.background || '#111827',
            border: `1px solid ${currentTheme?.border || 'rgba(255,255,255,0.1)'}`,
            color: currentTheme?.text || '#e5e7eb'
          }}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
        >
          <div className="text-sm font-semibold" style={{ color: currentTheme?.text || '#ffffff' }}>
            Öncelik seçimi (gereksiz yere "Yüksek" / "Kritik" seçmeyin)
          </div>
          <ul className="mt-3 space-y-2">
            {PRIORITY_LEVELS.map((level) => (
              <li key={level.label} className="flex items-center gap-[10px]">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0 rounded-full shadow"
                  style={{
                    backgroundColor: level.color,
                    minWidth: '12px',
                    minHeight: '12px',
                    border: `1px solid ${currentTheme?.border || 'rgba(255,255,255,0.15)'}`
                  }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium leading-5" style={{ color: currentTheme?.text || '#ffffff' }}>
                  {level.label} : {level.description}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold" style={{ color: currentTheme?.text || '#ffffff' }}>
            Not: Önceliği işin gerçek etkisine göre belirleyin; gereksiz yükseltmeler ekip planını olumsuz etkiler.
          </p>
        </div>
      )}
    </div>
  );
}
