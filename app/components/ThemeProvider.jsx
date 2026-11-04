'use client';

import { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function ThemeProvider() {
  const { darkMode } = useAppContext();

  useEffect(() => {
    console.log('🎨 ThemeProvider - darkMode changed:', darkMode);
    console.log('🎨 HTML classes BEFORE:', document.documentElement.className);
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
      console.log('✅ Added dark class');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('❌ Removed dark class');
    }
    
    console.log('🎨 HTML classes AFTER:', document.documentElement.className);
    console.log('🎨 Computed background:', window.getComputedStyle(document.body).backgroundColor);
  }, [darkMode]);

  return null;
}
