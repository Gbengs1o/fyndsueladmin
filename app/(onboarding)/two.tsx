import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
// CHANGED: Removed SvgXml and added Image
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

// Helper to get screen dimensions
const { width } = Dimensions.get('window');
// CHANGED: Renamed for clarity
const imageHeight = (width / 365) * 225;

export default function OnboardingPageTwo() {
  const { colors } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors), [colors]);

  // CHANGED: The large SVG string and the useMemo hook for theming it are now removed.

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      router.replace('/(auth)/signIn');
    } catch (e) {
      router.replace('/(auth)/signIn');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            {/* CHANGED: Replaced SvgXml with the Image component pointing to 2.png */}
            <Image
              source={require('../../assets/images/2.png')}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>At anytime</Text>
            <Text style={styles.subtitle}>
              Access real-time fuel prices and station availability around the clock. Make informed decisions and save time, day or night.
            </Text>
          </View>
        </View>
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={() => router.push('/three')}>
            <Feather name="arrow-right" size={32} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// The stylesheet is now theme-aware
const getThemedStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  skipContainer: {
    width: '100%',
    alignItems: 'flex-end',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '15%',
  },
  imageContainer: {
    width: '100%',
    height: imageHeight, // Set height to maintain aspect ratio
    marginBottom: 60,
  },
  // ADDED: Style for the new Image component
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  bottomContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.accent, // This will now be purple from your theme
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});