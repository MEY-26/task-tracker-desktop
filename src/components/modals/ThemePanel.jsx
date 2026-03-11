import React from 'react';
import { createPortal } from 'react-dom';
import darkLogo from '../../assets/Dark_VadenLogo.svg';
import lightLogo from '../../assets/Light_VadenLogo.svg';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';

export function ThemePanel() {
  const {
    currentTheme,
    currentThemeName,
    setCurrentThemeName,
    customTheme,
    setCustomTheme,
    predefinedThemes,
    setShowThemePanel,
    themeSaveState,
    setThemeSaveState,
    saveThemeNow
  } = useTheme();
  const { addNotification } = useNotification();

  const handleClose = () => {
    setShowThemePanel(false);
    setTimeout(() => window.location.reload(), 300);
  };

  const colorInputStyle = {
    width: '48px',
    height: '48px',
    minWidth: '48px',
    minHeight: '48px',
    border: 'none',
    padding: '0',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none'
  };

  const textInputBaseStyle = {
    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
    color: currentTheme.text,
    borderColor: currentTheme.border,
    borderWidth: '1px',
    borderStyle: 'solid',
    minWidth: '100px'
  };

  const ColorField = ({ label, value, themeKey, placeholder }) => {
    const updateTheme = (val) => {
      const newTheme = { ...customTheme, [themeKey]: val };
      setCustomTheme(newTheme);
      setCurrentThemeName('custom');
      setThemeSaveState('idle');
    };
    return (
      <div className="flex items-center gap-6">
        <input
          type="color"
          value={value}
          onChange={(e) => updateTheme(e.target.value)}
          className="rounded-full cursor-pointer transition-all hover:scale-110"
          style={{ ...colorInputStyle, backgroundColor: value }}
          title={label}
        />
        <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>{label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => updateTheme(e.target.value)}
          className="px-3 py-2 rounded-xl text-base focus:outline-none"
          style={textInputBaseStyle}
          onFocus={(e) => {
            e.target.style.borderColor = currentTheme.accent;
            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = currentTheme.border;
            e.target.style.boxShadow = 'none';
          }}
          placeholder={placeholder}
        />
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[999980]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0" onClick={handleClose} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
        <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[900px] max-h-[85vh] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
          pointerEvents: 'auto',
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
            <h2 className="font-semibold text-center" style={{ color: currentTheme.text }}>Tema Ayarları</h2>
            <div className="justify-self-end">
              <button onClick={handleClose}
                className="rounded-lg px-2 py-1 transition-colors"
                style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.target.style.color = currentTheme.text;
                  e.target.style.backgroundColor = `${currentTheme.border}30`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = currentTheme.textSecondary;
                  e.target.style.backgroundColor = 'transparent';
                }}>✕</button>
            </div>
          </div>

          <div className="p-4 xs:p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(85vh - 80px)', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
            {/* Hazır Temalar */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: `${currentTheme.border}20`, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: currentTheme.text }}>Hazır Temalar</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(predefinedThemes).map(([key, theme]) => {
                  let buttonBg = theme.background;
                  if (key === 'blue') buttonBg = '#1e3a8a';
                  else if (key === 'purple') buttonBg = '#6b21a8';
                  else if (key === 'green') buttonBg = '#166534';
                  else if (key === 'orange') buttonBg = '#7c2d12';
                  else if (key === 'dark') buttonBg = '#0f172a';
                  else if (key === 'light') buttonBg = '#f8fafc';

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setCustomTheme({
                          ...theme,
                          logoType: key === 'light' ? 'dark' : 'light',
                          socialIconColor: theme.socialIconColor || theme.textSecondary,
                          tableHeader: theme.tableHeader || theme.border
                        });
                        setCurrentThemeName(key);
                        setThemeSaveState('idle');
                      }}
                      className="p-4 rounded-xl border-2 transition-all hover:opacity-90"
                      style={{
                        backgroundColor: buttonBg,
                        color: theme.text,
                        borderColor: currentTheme.border
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{theme.name}</span>
                        {currentThemeName === key && <span style={{ color: currentTheme.accent }}>✓</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: theme.background }}></div>
                        <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: theme.tableBackground || theme.background }}></div>
                        <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: theme.accent }}></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tema Özelleştirme */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: `${currentTheme.border}20`, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: currentTheme.text }}>Tema Özelleştirme</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <ColorField label="Arkaplan" value={customTheme.background} themeKey="background" placeholder="#000000" />
                  <ColorField label="Tablo Arkaplan" value={customTheme.tableBackground || customTheme.background} themeKey="tableBackground" placeholder="#000000" />
                  <ColorField label="Tablo Satır Alt" value={customTheme.tableRowAlt || customTheme.background} themeKey="tableRowAlt" placeholder="#000000" />
                  <ColorField label="Tablo Başlığı" value={customTheme.tableHeader || customTheme.border} themeKey="tableHeader" placeholder="#000000" />
                  <ColorField label="Yazı" value={customTheme.text} themeKey="text" placeholder="#ffffff" />
                  <ColorField label="İkincil Yazı" value={customTheme.textSecondary} themeKey="textSecondary" placeholder="#cccccc" />
                  <ColorField label="Vurgu" value={customTheme.accent} themeKey="accent" placeholder="#3b82f6" />
                  <ColorField label="Kenarlık" value={customTheme.border} themeKey="border" placeholder="#334155" />
                  <ColorField label="Sosyal Medya İkon" value={customTheme.socialIconColor || customTheme.textSecondary} themeKey="socialIconColor" placeholder="#94a3b8" />
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => {
                        if (currentThemeName === 'custom') {
                          setCustomTheme({ ...customTheme, logoType: customTheme.logoType === 'dark' ? 'light' : 'dark' });
                        } else {
                          const baseTheme = predefinedThemes[currentThemeName] || predefinedThemes.dark;
                          const currentLogoType = customTheme.logoType || 'dark';
                          setCustomTheme({
                            ...baseTheme,
                            logoType: currentLogoType === 'dark' ? 'light' : 'dark'
                          });
                          setCurrentThemeName('custom');
                        }
                        setThemeSaveState('idle');
                      }}
                      className="rounded-full transition-all cursor-pointer flex items-center justify-center"
                      style={{
                        width: '48px',
                        height: '48px',
                        minWidth: '48px',
                        minHeight: '48px',
                        backgroundColor: (currentTheme.logoType || customTheme.logoType || 'dark') === 'dark' ? '#000000' : '#ffffff',
                        border: 'none',
                        padding: '4px',
                        position: 'relative',
                        outline: 'none',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                      title="Logo Tipi"
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = currentTheme.accent;
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = currentTheme.border;
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                    <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Logo Tipi</span>
                    <div
                      className="flex items-center justify-center rounded-xl"
                      style={{
                        minWidth: '100px',
                        height: '48px',
                        backgroundColor: (currentTheme.logoType || customTheme.logoType || 'dark') === 'dark' ? '#ffffff' : '#000000',
                        border: `1px solid ${currentTheme.border}`,
                        padding: '8px'
                      }}
                    >
                      <img
                        src={(currentTheme.logoType || customTheme.logoType || 'dark') === 'dark' ? darkLogo : lightLogo}
                        alt="Logo Preview"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 xs:px-6 sm:px-8 py-4 border-t" style={{
            borderTop: `1px solid ${currentTheme.border}`,
            backgroundColor: currentTheme.tableBackground || currentTheme.background
          }}>
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (themeSaveState === 'saving') return;
                try {
                  await saveThemeNow();
                } catch (error) {
                  console.error('Failed to save theme:', error);
                  setThemeSaveState('idle');
                  addNotification('Tema kaydedilemedi', 'error');
                }
              }}
              disabled={themeSaveState === 'saving'}
              className="w-full rounded-xl px-4 py-3 text-lg font-semibold transition-colors"
              style={{
                backgroundColor: themeSaveState === 'saving' ? `${currentTheme.border}60` : currentTheme.accent,
                color: '#ffffff',
                cursor: themeSaveState === 'saving' ? 'not-allowed' : 'pointer',
                opacity: themeSaveState === 'saving' ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (themeSaveState !== 'saving') {
                  const hex = currentTheme.accent.replace('#', '');
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                }
              }}
              onMouseLeave={(e) => {
                if (themeSaveState !== 'saving') e.target.style.backgroundColor = currentTheme.accent;
              }}
            >
              {themeSaveState === 'saving' ? 'Kaydediliyor...' : themeSaveState === 'saved' ? 'Kaydedildi' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
