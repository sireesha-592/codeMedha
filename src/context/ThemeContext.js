// src/context/ThemeContext.js
// Converted from web ThemeContext — localStorage → AsyncStorage
// CSS variables → JS objects used via StyleSheet / inline styles

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // default dark

  useEffect(() => {
    AsyncStorage.getItem('theme').then(saved => {
      if (saved !== null) setIsDark(saved === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Dark Theme ───────────────────────────────────────────
const darkTheme = {
  pageBg:           '#0a0d14',
  sidebarBg:        '#0d1118',
  cardBg:           '#0d1118',
  inputBg:          '#0a0d14',
  hoverBg:          '#1a1f2e',
  border:           '#1e2535',
  borderHover:      '#2a2d3e',
  textPrimary:      '#ffffff',
  textSecondary:    '#94a3b8',
  textMuted:        '#555555',
  accent:           '#00d4aa',
  accentPurple:     '#7c6af5',
  accentOrange:     '#f5a623',
  accentRed:        '#f55555',
  navActiveBg:      'rgba(0,212,170,0.08)',
  navActiveColor:   '#00d4aa',
  navInactiveColor: '#666666',
  toggleBg:         '#1e2535',
  toggleColor:      '#ffffff',
  gradientStart:    '#061a14',
  gradientEnd:      '#0a2d24',
};

// ─── Light Theme ──────────────────────────────────────────
const lightTheme = {
  pageBg:           '#f0f4f8',
  sidebarBg:        '#ffffff',
  cardBg:           '#ffffff',
  inputBg:          '#f8fafc',
  hoverBg:          '#f0f4f8',
  border:           '#e2e8f0',
  borderHover:      '#cbd5e1',
  textPrimary:      '#1a1a2e',
  textSecondary:    '#64748b',
  textMuted:        '#94a3b8',
  accent:           '#00b896',
  accentPurple:     '#6c5ce7',
  accentOrange:     '#f5a623',
  accentRed:        '#e74c3c',
  navActiveBg:      'rgba(0,184,150,0.08)',
  navActiveColor:   '#00b896',
  navInactiveColor: '#94a3b8',
  toggleBg:         '#e2e8f0',
  toggleColor:      '#1a1a2e',
  gradientStart:    '#e8f5f0',
  gradientEnd:      '#d0ede6',
};
