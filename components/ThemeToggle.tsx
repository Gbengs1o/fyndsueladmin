import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/Colors';
import { Feather } from '@expo/vector-icons';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const colors = Colors[theme];

  return (
    <Pressable onPress={toggleTheme} style={{ marginRight: 15 }}>
      {theme === 'light' ? (
        <Feather name="moon" size={24} color={colors.icon} />
      ) : (
        <Feather name="sun" size={24} color={colors.icon} />
      )}
    </Pressable>
  );
}