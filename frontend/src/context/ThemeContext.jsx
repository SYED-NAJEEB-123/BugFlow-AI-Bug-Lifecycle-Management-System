import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  DEFAULT: 'default',
  DARK: 'dark',
  LIGHT: 'light',
  BLUE: 'blue',
  PURPLE: 'purple',
  EMERALD: 'emerald'
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Strictly retrieve saved theme preference if explicitly chosen by user
    return localStorage.getItem('bugflow-theme') || THEMES.DEFAULT;
  });

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.DEFAULT) {
      setThemeState(THEMES.DEFAULT);
      localStorage.removeItem('bugflow-theme');
    } else if (Object.values(THEMES).includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem('bugflow-theme', newTheme);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove any previously active theme classes
    root.classList.remove('dark', 'theme-light', 'theme-blue', 'theme-purple', 'theme-emerald');

    // ONLY apply class if theme is explicitly set to a non-default theme
    if (theme && theme !== THEMES.DEFAULT) {
      if (theme === THEMES.DARK) {
        root.classList.add('dark');
      } else {
        root.classList.add(`theme-${theme}`);
      }
    }
    // If theme is 'default', no class is added and original default CSS rules apply
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
