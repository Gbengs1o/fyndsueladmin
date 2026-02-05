// File: components/ContentContainer.tsx

import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

interface ContentContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
}

export function ContentContainer({
  children, style, padding = 16, paddingHorizontal, paddingVertical
}: ContentContainerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors), [colors]);

  return (
    <View style={[
      styles.container,
      {
        padding: paddingHorizontal !== undefined || paddingVertical !== undefined ? 0 : padding,
        paddingHorizontal: paddingHorizontal,
        paddingVertical: paddingVertical,
      },
      style
    ]}>
      {children}
    </View>
  );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Now theme-aware
  },
});