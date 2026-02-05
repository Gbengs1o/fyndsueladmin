// app/_layout.tsx

// FIX #1: This import must be the very first line to solve the crypto crash.
import 'react-native-get-random-values';

// FIX #2: The main React object must be imported to use JSX.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import * as Linking from 'expo-linking';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

import * as Notifications from 'expo-notifications';

// Keep the splash screen visible until we are ready to render the right screen.
SplashScreen.preventAutoHideAsync();

// Configure notifications to show alerts and play sound when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutNav() {
  const { isLoadingTheme } = useTheme();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Hide the native splash screen as soon as functionality allows, 
    // so we can show our custom animated one.
    SplashScreen.hideAsync();

    // Listen for incoming URLs (deep links)
    const handleDeepLink = (event: { url: string }) => {
      // Supabase OAuth redirect usually looks like: explscheme://google-auth#access_token=...&refresh_token=...
      // or sometimes as query params ?access_token=...
      // The GoogleAuthButton handles the parsing if we are using openAuthSessionAsync.
      // However, if the session is opened in a way that triggers a full app open (not modal),
      // we might need global handling.
      // But purely for Supabase + expo-auth-session as implemented in GoogleAuthButton,
      // the 'await WebBrowser.openAuthSessionAsync' call usually captures the return URL directly.
      // We adding this just in case we need to handle manual re-opening.
      console.log("Deep link received:", event.url);
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoadingTheme || isAuthLoading) {
      return;
    }

    const inTabsGroup = segments[0] === '(tabs)';

    // =======================================================================
    // START OF FIX
    // We add a new variable to check if the user is on the reset password page.
    const isResetPasswordPage = segments[0] === '(auth)' && segments[1] === 'resetPassword';
    // END OF FIX
    // =======================================================================

    // This part is the same:
    // If the user is NOT signed in and is trying to access a protected route...
    if (!session && inTabsGroup) {
      // Redirect them to the sign-in page.
      router.replace('/(auth)/signIn');
    }
    // If the user IS signed in...
    else if (session) {
      // =======================================================================
      // START OF FIX
      // We add a check here to make sure the user is NOT on the reset password page
      // before we redirect them. This is the special exception for our "bouncer".
      if (!inTabsGroup && !isResetPasswordPage) {
        // Redirect them to the main part of the app.
        router.replace('/(tabs)/home');
      }
      // END OF FIX
      // =======================================================================
    }

    // We no longer hide splash screen here, we did it on mount.
    // SplashScreen.hideAsync();

  }, [isLoadingTheme, isAuthLoading, session, segments]);

  // We always render the Stack, but we overlay the splash screen if needed.
  return (
    <View style={{ flex: 1 }}>
      <Stack>
        {/* These are layout groups. The router will look for a _layout.tsx file inside them. */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* These are individual screens. The router will look for a matching file in the `app` directory. */}
        {/* For example, `app/station/[id].tsx` is required for the route below. */}

        {/* Note: 'station/[id]' is effectively in (tabs), but if we want it global, we must have it here or handle via deep link.
            Since the file is in app/(tabs)/station/[id].tsx, the route is (tabs)/station/[id].
            Referencing it here as 'station/[id]' ONLY works if app/station/[id].tsx exists. It DOES NOT.
            So we remove the invalid ones to stop warnings.
        */}

        {/* If we want to show 'add-station' as a modal, and the file is app/add-station.tsx, we list it here. */}
        <Stack.Screen name="add-station" options={{ presentation: 'modal', title: "Add New Station" }} />
      </Stack>

      {(isLoadingTheme || isAuthLoading || !isAnimationFinished) && (
        <View style={StyleSheet.absoluteFill}>
          <AnimatedSplashScreen onAnimationFinish={() => setIsAnimationFinished(true)} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}