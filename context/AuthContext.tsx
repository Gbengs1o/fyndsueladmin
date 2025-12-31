// File: context/AuthContext.tsx

import { Session, User } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// --- ADDED: Define a type for the user profile ---
type ProfileType = {
  full_name: string;
  avatar_url: string;
  push_notifications_enabled?: boolean;
};

// --- MODIFIED: Update the context type to include profile data and functions ---
type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: ProfileType | null; // Added profile state
  isLoading: boolean; // For initial session loading
  isProfileLoading: boolean; // For profile-specific loading
  signOut: (callback?: () => void) => void;
  fetchProfile: (user: User) => Promise<void>; // Added fetchProfile function
};

// --- ADDED: Handle notifications when app is in foreground ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This function handles getting permission and the push token
async function registerForPushNotificationsAsync(userId: string): Promise<string | undefined> {
  let token;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: '974cfc38-9485-4dad-ac04-aa5c46b42a76',
    })).data;
    if (token) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
    }
  } catch (error: any) {
    console.error("Push notification registration failed:", error);
    Alert.alert("Push Notification Error", "Could not register for push notifications. Please check your internet connection and try again.");
  }
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  return token;
}


export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- ADDED: State for profile data and loading status ---
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // --- MODIFIED: fetchProfile with upsert logic for missing profiles ---
  const fetchProfile = useCallback(async (user: User) => {
    if (!user) return;

    setIsProfileLoading(true);
    try {
      // 1. Try to fetch the profile
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`full_name, avatar_url, push_notifications_enabled`)
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data as ProfileType);
      } else if (error && (status === 406 || error.code === 'PGRST116')) {
        // 2. Profile doesn't exist (PGRST116 is "The result contains 0 rows")
        // Create one using metadata from the user session
        console.log('Profile missing, creating new profile for:', user.email);

        const updates = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          updated_at: new Date(),
        };

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert(updates)
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          // Don't throw here, just leave profile as null so the app doesn't crash, 
          // but maybe show a UI warning if possible.
        }

        if (newProfile) {
          setProfile(newProfile as ProfileType);
        }
      } else {
        console.error('Error fetching profile:', error);
      }

    } catch (error: any) {
      console.error('Unexpected error in fetchProfile:', error);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchSessionAndData = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user);
        await registerForPushNotificationsAsync(currentSession.user.id);
      }
      setIsLoading(false);
    };

    fetchSessionAndData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (_event === 'SIGNED_IN' && newSession?.user) {
        // Block UI while fetching profile for new sign-ins
        setIsLoading(true);
        setSession(newSession);
        try {
          await fetchProfile(newSession.user);
          await registerForPushNotificationsAsync(newSession.user.id);
        } finally {
          setIsLoading(false);
        }
      } else if (_event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
      } else {
        // For token refreshes etc., just update session without blocking UI
        setSession(newSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async (callback?: () => void) => {
    if (session?.user.id) {
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', session.user.id);
    }
    await supabase.auth.signOut();
    if (callback) {
      callback();
    }
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isLoading,
    isProfileLoading,
    signOut,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}