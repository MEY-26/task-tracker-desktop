import React from 'react';

/** Pazartesi → Pazar (ISO hafta, grid ile aynı sıra) */
const WORKING_CALENDAR_WEEKDAY_LABELS_TR = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];

const gridClassHeader =
  'grid grid-cols-7 gap-2 min-w-0 max-w-full w-full [grid-template-columns:repeat(7,minmax(0,1fr))]';

/** Tüm satırlar aynı yükseklikte; hücre içi metin sarma ile taşanı gizler */
const gridClassBody =
  'grid grid-cols-7 gap-2 min-w-0 max-w-full w-full auto-rows-[128px] [grid-template-columns:repeat(7,minmax(0,1fr))]';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children — 42 adet hücre (veya fragment)
 * @param {string} [props.headerColor]
 * @param {string[]} [props.weekdayLabels]
 */
export function WorkingCalendarMonthGrid({ headerColor, weekdayLabels = WORKING_CALENDAR_WEEKDAY_LABELS_TR, children }) {
  return (
    <div className="min-w-0 w-full">
      <div className={`${gridClassHeader} text-center mb-2`} style={{ color: headerColor }}>
        {weekdayLabels.map((w) => (
          <div
            key={w}
            className="min-w-0 px-0.5 font-semibold leading-snug break-words hyphens-auto"
            style={{ fontSize: '18px' }}
          >
            {w}
          </div>
        ))}
      </div>
      <div className={gridClassBody}>{children}</div>
    </div>
  );
}
