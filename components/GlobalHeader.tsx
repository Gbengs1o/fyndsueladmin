// File: components/GlobalHeader.tsx
// Enhanced Global Header with notifications, greeting, and quick actions

import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { LetterAvatar } from './LetterAvatar';

type AppColors = ReturnType<typeof useTheme>['colors'];

export function GlobalHeader() {
    const { theme, colors, toggleTheme } = useTheme();
    const { user, profile } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);

    const [unreadCount, setUnreadCount] = useState(0);
    const [hasUnreadBroadcasts, setHasUnreadBroadcasts] = useState(false); // NEW
    const [greeting, setGreeting] = useState('');

    // Get time-based greeting
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Good morning');
        } else if (hour < 17) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }
    }, []);

    // Fetch unread notifications count with real-time updates
    useEffect(() => {
        if (!user) return; // Wait for user to be available

        const fetchUnreadCount = async () => {
            try {
                // Fetch total unread count
                const { count, data } = await supabase
                    .from('notifications')
                    .select('title', { count: 'exact', head: false }) // Need to check titles
                    .eq('user_id', user.id)
                    .eq('is_read', false);

                setUnreadCount(count || 0);

                // Check if any unread notification has a title (Broadcast)
                if (data) {
                    const formattingHasBroadcasts = data.some((n: any) => n.title !== null && n.title !== '');
                    setHasUnreadBroadcasts(formattingHasBroadcasts);
                }
            } catch (e) {
                // Silently fail
            }
        };

        fetchUnreadCount();



        // Real-time subscription for notification changes
        const channel = supabase
            .channel(`header-notifications-${user.id}`) // Unique channel name per user
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload: any) => { // Type payload as any to avoid TS errors
                    console.log('Notification change detected:', payload);

                    // Trigger sound/alert on new notification
                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new;
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: newNotif.title || 'New Station Update',
                                body: newNotif.message,
                                sound: 'default', // Plays default sound
                            },
                            trigger: null, // Show immediately
                        });
                    }

                    // Refetch count when any notification changes
                    fetchUnreadCount();
                }
            )
            .subscribe();

        // Also refresh every 30 seconds as fallback
        const interval = setInterval(fetchUnreadCount, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [user?.id]); // Only re-run if user ID changes specifically

    const firstName = profile?.full_name?.split(' ')[0] || 'there';

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                {/* Left: Profile + Greeting */}
                <Pressable
                    style={styles.profileSection}
                    onPress={() => router.push('/profile')}
                >
                    <LetterAvatar
                        avatarUrl={profile?.avatar_url}
                        name={profile?.full_name || 'User'}
                        size={36}
                    />
                    <View style={styles.greetingContainer}>
                        <Text style={styles.greetingText}>{greeting},</Text>
                        <Text style={styles.nameText} numberOfLines={1}>{firstName}</Text>
                    </View>
                </Pressable>

                {/* Right: Actions */}
                <View style={styles.actionsContainer}>
                    {/* Theme Toggle */}
                    <Pressable
                        style={styles.actionButton}
                        onPress={toggleTheme}
                    >
                        <Ionicons
                            name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                            size={20}
                            color={colors.text}
                        />
                    </Pressable>

                    {/* Notifications */}
                    <Pressable
                        style={[
                            styles.actionButton,
                            unreadCount > 0 && styles.actionButtonActive,
                            hasUnreadBroadcasts && { backgroundColor: 'rgba(255, 59, 48, 0.15)' } // Red background if broadcast
                        ]}
                        onPress={() => router.push('/notifications')}
                    >
                        <Ionicons
                            name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                            size={20}
                            color={hasUnreadBroadcasts ? '#ff3b30' : (unreadCount > 0 ? '#fff' : colors.text)} // Red icon if broadcast
                        />
                        {unreadCount > 0 && (
                            <View style={[
                                styles.badge,
                                hasUnreadBroadcasts && { backgroundColor: '#ff3b30', borderColor: '#fff' } // Red badge if broadcast
                            ]}>
                                <Text style={styles.badgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const getThemedStyles = (colors: AppColors, theme: string) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    greetingContainer: {
        marginLeft: 10,
        flex: 1,
    },
    greetingText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    nameText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginTop: 1,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    actionButtonActive: {
        backgroundColor: '#00c853', // Bright green when has notifications
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.notificationBadge,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: colors.card,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#fff',
    },
});