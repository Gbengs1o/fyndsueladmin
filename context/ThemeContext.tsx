import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- COLOR PALETTES ---
// This is the single source of truth for all colors in the app.

const lightColors = {
  // Primary & Text
  primary: '#5C0CA7',
  primaryText: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7281',

  // Backgrounds & Borders
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  overlay: 'rgba(0, 0, 0, 0.5)', 

  // Components
  pinDefault: '#E53935',
  pinText: '#FFFFFF',
  destructive: '#dc3545',
  destructiveText: '#FFFFFF',
  switchTrack: '#E5E7EB',
  switchThumb: '#FFFFFF',
  cardPressed: '#f0f0f0',
  shadow: '#000000',
  accent: '#5C0CA7', // CHANGED from '#FBC52D'
  logoBackground: '#000000',
  placeholder: '#9CA3AF',
  success: '#16a34a',
  disabled: '#D1D5DB',
  accentButton: '#5C0CA7', // CHANGED from '#edae11'
  primaryOpaque: 'rgba(92, 12, 167, 0.1)',

  // Leaderboard Podium
  podiumGold: '#5C0CA7', // CHANGED from '#FFD700'
  podiumSilver: '#C0C0C0',
  podiumBronze: '#CD7F32',
  podiumGoldBg: '#5C0CA7', // CHANGED from 'gold'
  podiumSilverBg: '#EFEFEF',
  podiumBronzeBg: '#E4A178',
  
  // Filter Screen Specific
  chipBackground: '#FFFFFF',
  chipBorder: '#5C0CA7',
  chipText: '#414141',
  chipTextSelected: '#FFFFFF',
  starColorEmpty: '#DDDDDD',

  // Tab Bar & Header
  headerBackground: '#FFFFFF',
  tabIconDefault: '#6B7281',
  notificationBadge: '#FF3B30',

  // Section-specific
  searchBar: {
    background: '#FFFFFF', border: '#E5E7EB', text: '#111827', icon: '#6B7281',
  },

  // Map Theme
  map: {
    background: '#f2f2f2', water: '#a4c4e1', road: '#ffffff',
    labels: '#545454', poi: '#d59563',
  },
};

const darkColors = {
  // Primary & Text
  primary: '#9333EA',
  primaryText: '#FFFFFF',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',

  // Backgrounds & Borders
  background: '#111827',
  card: '#1F2937',
  border: '#374151',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Components
  pinDefault: '#C62828',
  pinText: '#FFFFFF',
  destructive: '#ef4444',
  destructiveText: '#FFFFFF',
  switchTrack: '#374151',
  switchThumb: '#F9FAFB',
  cardPressed: '#2c2c2c',
  shadow: '#FFFFFF',
  accent: '#5C0CA7', // CHANGED from '#FBC52D'
  logoBackground: '#000000',
  placeholder: '#6B7281',
  success: '#22c55e',
  disabled: '#4B5563',
  accentButton: '#5C0CA7', // CHANGED from '#edae11'
  primaryOpaque: 'rgba(147, 51, 234, 0.15)',
  
  // Leaderboard Podium
  podiumGold: '#5C0CA7', // CHANGED from '#FFD700'
  podiumSilver: '#C0C0C0',
  podiumBronze: '#CD7F32',
  podiumGoldBg: '#5C0CA7', // CHANGED from 'gold'
  podiumSilverBg: '#EFEFEF',
  podiumBronzeBg: '#E4A178',
  
  // Filter Screen
  chipBackground: '#1F2937',
  chipBorder: '#9333EA',
  chipText: '#F9FAFB',
  chipTextSelected: '#FFFFFF',
  starColorEmpty: '#4B5563',

  // Tab Bar & Header
  headerBackground: '#1F2937',
  tabIconDefault: '#9CA3AF',
  notificationBadge: '#FF3B30',

  // Section-specific
  searchBar: {
    background: '#1F2937', border: '#374151', text: '#F9FAFB', icon: '#9CA3AF',
  },

  // Map Theme
  map: {
    background: '#242f2e', water: '#17263c', road: '#38414e',
    labels: '#9ca5b3', poi: '#d59563',
  },
};

// --- THEME PROVIDER LOGIC (No changes needed below) ---

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  colors: typeof lightColors;
  toggleTheme: () => void;
  isLoadingTheme: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(colorScheme || 'light');
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = (await AsyncStorage.getItem('app-theme')) as Theme;
        if (savedTheme) { setTheme(savedTheme); }
      } catch (error) { console.error('Failed to load theme.', error); }
      finally { setIsLoadingTheme(false); }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try { await AsyncStorage.setItem('app-theme', newTheme); }
    catch (error) { console.error('Failed to save theme.', error); }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoadingTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) { throw new Error('useTheme must be used within a ThemeProvider'); }
  return context;
};