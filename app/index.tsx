// File: app/index.tsx

import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    // This effect runs when the component mounts to check the onboarding status.
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (value === 'true') {
          setHasCompletedOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to check onboarding status from storage", e);
      } finally {
        // We're done checking, so set loading to false.
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, []);

  // 1. Show a loading spinner while we check for the onboarding status from AsyncStorage.
  //    This is the very first check.
  if (isCheckingOnboarding) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  // 2. If the onboarding check is done AND the user has NOT completed it,
  //    redirect them to the onboarding flow. We use the route group syntax.
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/one" />;
  }

  // ---- From this point on, we know the user has completed onboarding ----
  // ---- Now we can run your original authentication logic ----

  // 3. While the AuthContext is checking for a user session, show a loading spinner.
  if (isAuthLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  // 4. If auth loading is done and there is NO user, redirect to the sign-in screen.
  if (!user) {
    return <Redirect href="/(auth)/signIn" />;
  }
  
  // 5. If auth loading is done and there IS a user, redirect to the main app's home screen.
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff' // Optional: give it a background color
    }
});