import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getTheme, saveTheme } from '../api';
import { predefinedThemes } from '../utils/themes.js';
import darkLogo from '../assets/Dark_VadenLogo.svg';
import lightLogo from '../assets/Light_VadenLogo.svg';
import { useNotification } from './NotificationContext';

const ThemeContext = createContext(null);

const defaultCustomTheme = {
  background: '#f8fafc',
  text: '#1e293b',
  textSecondary: '#64748b',
  accent: '#3b82f6',
  border: '#e2e8f0',
  tableBackground: '#ffffff',
  tableRowAlt: '#f1f5f9',
  tableHeader: '#e2e8f0',
  logoType: 'dark',
  socialIconColor: '#475569'
};

export function ThemeProvider({ children, user }) {
  const { addNotification } = useNotification();
  const [customTheme, setCustomTheme] = useState(defaultCustomTheme);
  const [currentThemeName, setCurrentThemeName] = useState('light');
  const [isThemeLoading, setIsThemeLoading] = useState(true);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [themeSaveState, setThemeSaveState] = useState('idle');
  const isInitialThemeLoadRef = useRef(true);

  const currentTheme = useMemo(() => {
    if (currentThemeName === 'custom') {
      return customTheme;
    }
    return predefinedThemes[currentThemeName] || predefinedThemes.dark;
  }, [currentThemeName, customTheme]);

  const currentLogo = useMemo(() => {
    if (currentThemeName === 'custom') {
      return customTheme.logoType === 'light' ? lightLogo : darkLogo;
    }
    const isLightTheme = currentThemeName === 'light';
    return isLightTheme ? darkLogo : lightLogo;
  }, [currentThemeName, customTheme.logoType]);

  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) {
        setIsThemeLoading(false);
        isInitialThemeLoadRef.current = false;
        return;
      }

      isInitialThemeLoadRef.current = true;
      setIsThemeLoading(true);
      try {
        const themePrefs = await getTheme();
        if (themePrefs && themePrefs.theme_name) {
          setCurrentThemeName(themePrefs.theme_name);
          if (themePrefs.theme_name === 'custom' && themePrefs.custom_theme) {
            const customThemeData = { ...themePrefs.custom_theme };
            if (customThemeData.window && !customThemeData.tableBackground) {
              customThemeData.tableBackground = customThemeData.window;
              delete customThemeData.window;
            }
            if (!customThemeData.logoType) customThemeData.logoType = 'dark';
            if (!customThemeData.tableHeader) customThemeData.tableHeader = customThemeData.border || '#334155';
            if (!customThemeData.socialIconColor) customThemeData.socialIconColor = customThemeData.textSecondary || '#94a3b8';
            setCustomTheme(customThemeData);
          }
        } else {
          setCurrentThemeName('dark');
        }
      } catch (error) {
        console.error('Failed to load theme from backend:', error);
        const saved = localStorage.getItem('appTheme');
        if (saved) setCurrentThemeName(saved);
      } finally {
        setIsThemeLoading(false);
        setTimeout(() => {
          isInitialThemeLoadRef.current = false;
        }, 1000);
      }
    };

    loadUserTheme();
  }, [user]);

  const prevShowThemePanelRef = useRef(false);
  useEffect(() => {
    if (showThemePanel && !prevShowThemePanelRef.current) {
      const themeToSync = {
        ...currentTheme,
        logoType: currentTheme.logoType || (currentThemeName === 'light' ? 'dark' : 'light'),
        socialIconColor: currentTheme.socialIconColor || currentTheme.textSecondary,
        tableHeader: currentTheme.tableHeader || currentTheme.border
      };
      setCustomTheme(themeToSync);
      setThemeSaveState('idle');
    }
    prevShowThemePanelRef.current = showThemePanel;
  }, [showThemePanel, currentTheme, currentThemeName]);

  useEffect(() => {
    if (!user || isThemeLoading || isInitialThemeLoadRef.current || showThemePanel) return;

    const saveUserTheme = async () => {
      try {
        await saveTheme(currentThemeName, currentThemeName === 'custom' ? customTheme : null);
      } catch (error) {
        console.error('Failed to save theme to backend:', error);
        localStorage.setItem('appTheme', currentThemeName);
        if (currentThemeName === 'custom') {
          localStorage.setItem('customTheme', JSON.stringify(customTheme));
        }
      }
    };

    saveUserTheme();
  }, [currentThemeName, customTheme, user, isThemeLoading, showThemePanel]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.style.setProperty('--theme-bg', currentTheme.background);
    root.style.setProperty('--theme-window', currentTheme.background);
    root.style.setProperty('--theme-text', currentTheme.text);
    root.style.setProperty('--theme-text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--theme-accent', currentTheme.accent);
    root.style.setProperty('--theme-border', currentTheme.border);
    root.style.setProperty('--theme-table-bg', currentTheme.tableBackground || currentTheme.background);
    root.style.setProperty('--theme-table-header', currentTheme.tableHeader || currentTheme.tableBackground || currentTheme.background);
    root.style.setProperty('--theme-table-row-alt', currentTheme.tableRowAlt || currentTheme.background);
    root.style.setProperty('--theme-social-icon', currentTheme.socialIconColor || currentTheme.textSecondary);
    root.style.setProperty('--theme-placeholder', currentTheme.textSecondary || currentTheme.text);
    root.style.backgroundColor = currentTheme.background;
    body.style.backgroundColor = currentTheme.background;
  }, [currentTheme]);

  const saveThemeNow = useCallback(async () => {
    setThemeSaveState('saving');
    try {
      await saveTheme(currentThemeName, currentThemeName === 'custom' ? customTheme : null);
      setThemeSaveState('saved');
    } catch (error) {
      console.error('Failed to save theme:', error);
      localStorage.setItem('appTheme', currentThemeName);
      if (currentThemeName === 'custom') {
        localStorage.setItem('customTheme', JSON.stringify(customTheme));
      }
      setThemeSaveState('idle');
      addNotification('Tema kaydedilemedi', 'error');
    }
  }, [currentThemeName, customTheme, addNotification]);

  const value = {
    currentThemeName,
    setCurrentThemeName,
    customTheme,
    setCustomTheme,
    currentTheme,
    currentLogo,
    predefinedThemes,
    showThemePanel,
    setShowThemePanel,
    themeSaveState,
    setThemeSaveState,
    isThemeLoading,
    isInitialThemeLoadRef,
    saveThemeNow
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
