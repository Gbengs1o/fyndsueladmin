// File: app/(tabs)/settings.tsx

import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LetterAvatar } from '../../components/LetterAvatar';
import { SettingsRow } from '../../components/SettingsRow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; // Import our hook
import { supabase } from '../../lib/supabase';

// We get the color type directly from the hook
type AppColors = ReturnType<typeof useTheme>['colors'];

export default function SettingsScreen() {
  // REFACTORED: Get colors directly from our theme context.
  const { colors } = useTheme();
  // REFACTORED: The styles are now created inside the component and are theme-aware.
  const styles = useMemo(() => getThemedStyles(colors), [colors]);

  const { user, profile, fetchProfile, signOut, isLoading: isAuthLoading, isProfileLoading } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && user) {
      fetchProfile(user);
    }
  }, [isFocused, user]);

  const handleSignOut = () => {
    signOut(() => router.replace('/(auth)/signIn'));
  };

  if (isAuthLoading || (isProfileLoading && !profile)) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>Could not load user profile.</Text>
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {isProfileLoading && (
        <View style={styles.refreshingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      <View style={styles.profileHeader}>
        <LetterAvatar
          avatarUrl={profile.avatar_url}
          name={profile.full_name}
          size={120}
          textStyle={{ fontSize: 48 }}
        />
        <Text style={styles.name}>{profile.full_name || "Fuel Finder User"}</Text>
      </View>

      <View style={styles.section}>
        <SettingsRow label="View Profile" iconName="person-circle-outline" onPress={() => router.push('/profile')} />
        <SettingsRow label="Change Password" iconName="lock-closed-outline" onPress={() => router.push('/change-password')} />
        <SettingsRow label="Privacy Policy" iconName="shield-checkmark-outline" onPress={() => router.push('/privacy-policy')} />
        <SettingsRow label="Contact Us" iconName="mail-outline" onPress={() => router.push('/contact-us')} />
      </View>

      
      <View style={styles.section}>
        <SettingsRow label="Delete Account" iconName="trash-outline" onPress={() => router.push('/delete-account')} isDestructive />
      </View>

      <Pressable style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

// REFACTORED: Moved styles into a function that accepts the theme colors
const getThemedStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Use theme color
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 80,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background, // Use theme color
  },
  errorText: {
    color: colors.text, // Use theme color
    marginBottom: 20,
  },
  refreshingIndicator: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 10,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.text, // Use theme color
  },
  section: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    backgroundColor: colors.card, // Use theme color
    borderColor: colors.border, // Use theme color
  },
  switchTextContainer: {
    flex: 1,
  },
  icon: {
    marginRight: 15,
  },
  label: {
    fontSize: 16,
    color: colors.text, // Use theme color
  },
  labelDescription: {
    fontSize: 12,
    color: colors.textSecondary, // Use theme color
  },
  logoutButton: {
    backgroundColor: colors.destructive, // Use theme color
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: colors.destructiveText, // Use theme color
    fontSize: 16,
    fontWeight: 'bold',
  },
});