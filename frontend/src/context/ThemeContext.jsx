import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      // Version flag to force-reset stale dark mode from previous sessions to the new soft rose palette
      const version = localStorage.getItem('vestra_rose_palette_v1');
      if (!version) {
        localStorage.setItem('vestra_rose_palette_v1', 'true');
        localStorage.setItem('vestra_theme', 'light');
        return 'light';
      }
      const saved = localStorage.getItem('vestra_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
      }
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.remove('dark');
      }
    }

    try {
      localStorage.setItem('vestra_theme', theme);
    } catch {}

    console.log(`[VESTRA Theme] Switched to: ${theme.toUpperCase()} MODE (bg: ${theme === 'dark' ? '#181114' : '#FCF8F8'})`);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: 'light', toggleTheme: () => {}, isDark: false, setTheme: () => {} };
  }
  return context;
}

export default ThemeContext;
