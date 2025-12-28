// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    console.log('🎨 Tema inicial guardado:', saved);
    // Por defecto light si no hay nada guardado
    return saved === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    console.log('🎨 Aplicando tema:', isDark ? 'dark' : 'light');
    
    // Remover ambas clases primero
    root.classList.remove('dark', 'light');
    
    // Agregar la clase correcta
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
    
    console.log('🎨 Clases del root:', root.className);
  }, [isDark]);

  const toggleTheme = () => {
    console.log('🎨 Toggling theme, actual:', isDark);
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
}