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

  // Inicialização lazy para evitar setState síncrono em useEffect
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('smartnfe_darkMode') === 'true';
    } catch {
      return false;
    }
  });

  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem('smartnfe_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('smartnfe_darkMode', darkMode.toString());
      document.documentElement.classList.toggle('dark', darkMode);
    } catch (e) {}
  }, [darkMode]);

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
  }), [loading, toasts, addToast, removeToast, toast, darkMode, toggleDarkMode, settings, updateSettings]);

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
