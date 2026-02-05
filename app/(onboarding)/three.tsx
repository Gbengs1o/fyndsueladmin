import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
// CHANGED: Removed SvgXml and added Image
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

// Helper to get screen dimensions
const { width } = Dimensions.get('window');
// CHANGED: Calculate the height for the Image, maintaining the original aspect ratio
const imageHeight = (width / 361) * 201;

export default function OnboardingPageThree() {
  const { colors } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors), [colors]);

  // CHANGED: The large SVG string and the useMemo hook are now removed.

  const handleComplete = async () => {
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
        <View style={styles.headerSpacer} />
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            {/* CHANGED: Replaced SvgXml with the Image component pointing to 3.png */}
            <Image
              source={require('../../assets/images/3.png')}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Get the cheapest fuel{'\n'}prices for your next trip
            </Text>
            <Text style={styles.subtitle}>
              Our community-driven platform helps you find the best deals on fuel. Stop overpaying and start saving with every fill-up.
            </Text>
          </View>
        </View>
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.goButton} onPress={handleComplete}>
            <Text style={styles.goButtonText}>Go</Text>
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
  headerSpacer: {
    height: 55,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '15%',
  },
  imageContainer: {
    width: '100%',
    height: imageHeight, // Set the height for the image container
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
    lineHeight: 30,
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
  goButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary, // Using primary purple from your theme
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  goButtonText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.primaryText, // Text is white from your theme
  },
});