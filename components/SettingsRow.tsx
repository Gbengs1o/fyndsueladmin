import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

type SettingsRowProps = {
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  isDestructive?: boolean;
};

export const SettingsRow = ({ label, iconName, onPress, isDestructive = false }: SettingsRowProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors), [colors]);
  const labelColor = isDestructive ? colors.destructive : colors.text;

  return (
    <Pressable
      style={({ pressed }) => [ styles.row, pressed && styles.rowPressed ]}
      onPress={onPress}
    >
      <Ionicons name={iconName} size={22} color={labelColor} style={styles.icon} />
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
    </Pressable>
  );
};

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, marginBottom: 12,
    backgroundColor: colors.card, // THEME-AWARE
    borderColor: colors.border, // THEME-AWARE
  },
  rowPressed: {
    backgroundColor: colors.cardPressed, // THEME-AWARE
  },
  icon: {
    marginRight: 15,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
});