// File: components/LetterAvatar.tsx

import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext'; // REMOVED: Old 'Colors' import

// Get the color type from our hook
type AppColors = ReturnType<typeof useTheme>['colors'];

interface LetterAvatarProps {
  avatarUrl: string | null | undefined;
  name: string | null | undefined;
  size?: number;
}

export const LetterAvatar: React.FC<LetterAvatarProps> = ({ avatarUrl, name, size = 120 }) => {
  // CHANGED: Get the full 'colors' object directly from our theme context.
  const { colors } = useTheme();
  
  // NEW: Styles are now generated dynamically based on the theme and size prop.
  const styles = useMemo(() => getThemedStyles(colors, size), [colors, size]);

  const firstLetter = name ? name.charAt(0).toUpperCase() : '?';

  if (avatarUrl) {
    // CLEANER: The style is now self-contained.
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  // CLEANER: The style is now self-contained.
  return (
    <View style={styles.letterAvatarContainer}>
      <Text style={[styles.letter, { fontSize: size / 2 }]}>{firstLetter}</Text>
    </View>
  );
};

// NEW: A separate function to generate theme-aware styles.
const getThemedStyles = (colors: AppColors, size: number) => StyleSheet.create({
  avatarImage: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 4,
    borderColor: colors.primary, // Now correctly uses the theme's purple color.
  },
  letterAvatarContainer: {
    width: size,
    height: size,
    borderRadius: size / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.primary, // Now correctly uses the theme's purple color.
    backgroundColor: colors.primary, // Background is also purple.
  },
  letter: {
    fontWeight: 'bold',
    color: colors.primaryText, // Uses the new color we added to the theme.
  },
});