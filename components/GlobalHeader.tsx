import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

type AppColors = ReturnType<typeof useTheme>['colors'];

export function GlobalHeader() {
    const { theme, colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const isDark = theme === 'dark';

    return (
        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
            <BlurView intensity={isDark ? 80 : 60} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer} />
            <View style={[styles.gradientOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.7)' }]} />

            <View style={styles.contentContainer}>
                <Pressable
                    style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)') : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                    onPress={() => router.push('/profile')}
                >
                    <View style={styles.iconContainer}>
                        <FontAwesome name="user-circle-o" size={16} color={colors.text} />
                    </View>
                </Pressable>

                <View style={styles.rightContainer}>

                    <View style={styles.themeToggleContainer}>
                        <ThemeToggle />
                    </View>
                </View>
            </View>

            <View style={[styles.bottomBorder, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />
        </View>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    headerWrapper: { width: '100%', backgroundColor: 'transparent', zIndex: 1000, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 4 } }) },
    blurContainer: { ...StyleSheet.absoluteFillObject },
    gradientOverlay: { ...StyleSheet.absoluteFillObject, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0, 0, 0, 0.1)' },
    contentContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, minHeight: 36 },
    rightContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconButton: { borderRadius: 6, padding: 4 },
    iconContainer: { width: 28, height: 28, borderRadius: 14, borderWidth: 0.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: `${colors.text}20` }, // THEME-AWARE
    notificationContainer: { position: 'relative' },
    notificationBadge: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white', backgroundColor: colors.notificationBadge }, // THEME-AWARE
    badgeDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'white' },
    themeToggleContainer: { borderRadius: 10, borderWidth: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 0, marginLeft: 2, borderColor: `${colors.text}15` }, // THEME-AWARE
    bottomBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
});