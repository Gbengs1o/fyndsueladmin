// File: app/(tabs)/settings.tsx
// Settings Page - Clean, natural design

import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LetterAvatar } from '../../components/LetterAvatar';
import LoadingAnimation from '../../components/LoadingAnimation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

interface SettingsItem {
  id: string;
  icon: string;
  label: string;
  subtitle?: string;
  route?: string;
  action?: () => void;
  isDestructive?: boolean;
}

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);
  const { user, profile, fetchProfile, signOut, isLoading: isAuthLoading, isProfileLoading } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused && user) {
      fetchProfile(user);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [isFocused, user]);

  const handleSignOut = () => {
    signOut(() => router.replace('/(auth)/signIn'));
  };

  const renderSettingsItem = (item: SettingsItem) => (
    <Pressable
      key={item.id}
      style={styles.settingsItem}
      onPress={() => {
        if (item.route) router.push(item.route as any);
        if (item.action) item.action();
      }}
    >
      <View style={[styles.settingsIcon, item.isDestructive && styles.settingsIconDestructive]}>
        <Ionicons
          name={item.icon as any}
          size={20}
          color={item.isDestructive ? colors.destructive : colors.textSecondary}
        />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsLabel, item.isDestructive && styles.settingsLabelDestructive]}>
          {item.label}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );

  if (isAuthLoading || (isProfileLoading && !profile)) {
    return (
      <View style={styles.centerContent}>
        <LoadingAnimation message="Loading..." size="medium" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContent}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorText}>Could not load profile</Text>
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Pressable style={styles.profileCard} onPress={() => router.push('/profile')}>
            <LetterAvatar
              avatarUrl={profile.avatar_url}
              name={profile.full_name}
              size={56}
              textStyle={{ fontSize: 22 }}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.full_name || "User"}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <View style={styles.profileArrow}>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsIcon}>
                <Ionicons
                  name={theme === 'dark' ? 'moon' : 'sunny-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              <View style={styles.settingsContent}>
                <Text style={styles.settingsLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.switchTrack, true: colors.primary }}
                thumbColor={colors.switchThumb}
              />
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.settingsCard}>
            {renderSettingsItem({ id: 'profile', icon: 'person-outline', label: 'Edit Profile', route: '/profile' })}
            {renderSettingsItem({ id: 'password', icon: 'lock-closed-outline', label: 'Change Password', route: '/change-password' })}
          </View>
        </View>

        {/* App */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <View style={styles.settingsCard}>
            {renderSettingsItem({ id: 'notifications', icon: 'notifications-outline', label: 'Notifications', route: '/notifications' })}
            {renderSettingsItem({ id: 'track-activities', icon: 'bookmark-outline', label: 'Track Activities', route: '/favourite' })}
            {renderSettingsItem({ id: 'leaderboard', icon: 'trophy-outline', label: 'Leaderboard', route: '/leaderboard' })}
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.settingsCard}>
            {renderSettingsItem({ id: 'privacy', icon: 'shield-outline', label: 'Privacy Policy', route: '/privacy-policy' })}
            {renderSettingsItem({ id: 'contact', icon: 'mail-outline', label: 'Contact Us', route: '/contact-us' })}
          </View>
        </View>

        {/* Danger */}
        <View style={styles.section}>
          <View style={styles.settingsCard}>
            {renderSettingsItem({ id: 'delete', icon: 'trash-outline', label: 'Delete Account', route: '/delete-account', isDestructive: true })}
          </View>
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.versionText}>Fynd Fuel v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const getThemedStyles = (colors: AppColors, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 12,
    marginBottom: 16,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileArrow: {
    padding: 4,
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsIconDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  settingsContent: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 15,
    color: colors.text,
  },
  settingsLabelDestructive: {
    color: colors.destructive,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.destructive,
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Version
  versionText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 20,
  },
});