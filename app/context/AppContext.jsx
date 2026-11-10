'use client';

import { createContext, useState, useCallback, useContext, useEffect, useMemo } from 'react';

export const DEFAULT_SETTINGS = {
  tableDensity: 'compact',      // 'compact' | 'normal' | 'relaxed'
  rowsPerPage: 20,
  demoValueLimit: 50000,        // limite demonstrativo de valor por nota
  showOriginalValues: true,
  autoSave: true,
};

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Hidratação segura no cliente após o primeiro render
  useEffect(() => {
    setMounted(true);
    try {
      const savedDark = localStorage.getItem('smartnfe_darkMode');
      if (savedDark !== null) {
        const isDark = savedDark === 'true';
        setDarkMode(isDark);
        document.documentElement.classList.toggle('dark', isDark);
      }
    } catch (e) {}

    try {
      const savedSettings = localStorage.getItem('smartnfe_settings');
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('smartnfe_darkMode', darkMode.toString());
      document.documentElement.classList.toggle('dark', darkMode);
    } catch (e) {}
  }, [darkMode, mounted]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('smartnfe_settings', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  // Interface toast estável com suporte a duração customizada
  const toast = useMemo(() => ({
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  }), [addToast]);

  const value = useMemo(() => ({
    loading,
    setLoading,
    toasts,
    addToast,
    removeToast,
    toast,
    darkMode,
    toggleDarkMode,
    settings,
    updateSettings,
    DEFAULT_SETTINGS,
    mounted,
  }), [loading, toasts, addToast, removeToast, toast, darkMode, toggleDarkMode, settings, updateSettings, mounted]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
