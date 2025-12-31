import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

interface Notification {
    id: number;
    message: string;
    is_read: boolean;
    created_at: string;
    station_id: number | null;
    title?: string | null; // Added title for broadcasts
}

type TabType = 'updates' | 'messages';

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const router = useRouter();

    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('updates');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Derived state
    const updates = useMemo(() => allNotifications.filter(n => !n.title || n.title.trim().length === 0), [allNotifications]);
    const messages = useMemo(() => allNotifications.filter(n => n.title && n.title.trim().length > 0), [allNotifications]);

    const unreadUpdatesCount = useMemo(() => updates.filter(n => !n.is_read).length, [updates]);
    const unreadMessagesCount = useMemo(() => messages.filter(n => !n.is_read).length, [messages]);

    const displayedNotifications = activeTab === 'updates' ? updates : messages;

    const fetchNotifications = useCallback(async () => {
        if (!user) { setAllNotifications([]); setIsLoading(false); return; }

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setAllNotifications(data as Notification[] || []);
        } catch (error) {
            Alert.alert("Error", "Could not fetch notifications.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchNotifications();
        setIsRefreshing(false);
    };

    const markTabAsRead = useCallback(async () => {
        if (!user) return;

        // Only mark items in the CURRENT tab as read
        const targetList = activeTab === 'updates' ? updates : messages;
        const unreadIds = targetList.filter(n => !n.is_read).map(n => n.id);

        if (unreadIds.length === 0) return;

        const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);

        if (!error) {
            // Optimistically update state
            setAllNotifications(prev => prev.map(n =>
                unreadIds.includes(n.id) ? { ...n, is_read: true } : n
            ));
        }
    }, [user, activeTab, updates, messages]);

    // Handle notification press - navigate to station
    const handleNotificationPress = (notification: Notification) => {
        if (notification.station_id) {
            router.push(`/station/${notification.station_id}`);
        }
    };

    useEffect(() => {
        if (isFocused) { setIsLoading(true); fetchNotifications(); }
    }, [isFocused, fetchNotifications]);

    // Auto-mark as read timer - scoped to active tab
    useEffect(() => {
        let timer: NodeJS.Timeout;
        const currentUnreadCount = activeTab === 'updates' ? unreadUpdatesCount : unreadMessagesCount;

        if (isFocused && currentUnreadCount > 0) {
            timer = setTimeout(() => { markTabAsRead(); }, 2000);
        }
        return () => clearTimeout(timer);
    }, [isFocused, activeTab, unreadUpdatesCount, unreadMessagesCount, markTabAsRead]);

    // Real-time subscription for new notifications
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => fetchNotifications()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications]);

    const renderItem = ({ item }: { item: Notification }) => {
        const isBroadcast = !!item.title;

        return (
            <Pressable
                onPress={() => handleNotificationPress(item)}
                style={({ pressed }) => [
                    styles.notificationCard,
                    isBroadcast && styles.broadcastCard,
                    { opacity: pressed ? 0.8 : (item.is_read ? 0.7 : 1.0) }
                ]}
            >
                {!item.is_read && <View style={[styles.unreadDot, isBroadcast && { backgroundColor: '#ff3b30' }]} />}

                <View style={styles.iconContainer}>
                    <View style={[
                        styles.iconCircle,
                        isBroadcast ? { backgroundColor: 'rgba(255, 59, 48, 0.1)' } : { backgroundColor: 'rgba(0, 200, 83, 0.1)' }
                    ]}>
                        <Ionicons
                            name={isBroadcast ? 'megaphone' : (item.message.includes('flagged') ? 'flag' : 'pricetag')}
                            size={20}
                            color={isBroadcast ? '#ff3b30' : (item.message.includes('flagged') ? colors.destructive : colors.primary)}
                        />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    {isBroadcast && <Text style={styles.broadcastTitle}>{item.title}</Text>}
                    <Text style={[styles.message, isBroadcast && { fontSize: 14, color: colors.textSecondary }]}>{item.message}</Text>
                    <Text style={styles.timestamp}>
                        {new Date(item.created_at).toLocaleString()}
                    </Text>
                    {item.station_id && !isBroadcast && (
                        <Text style={styles.tapHint}>Tap to view station →</Text>
                    )}
                </View>
            </Pressable>
        );
    };

    if (isLoading && allNotifications.length === 0) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
            </View>

            <View style={styles.tabContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'updates' && styles.activeTab]}
                    onPress={() => setActiveTab('updates')}
                >
                    <Text style={[styles.tabText, activeTab === 'updates' && styles.activeTabText]}>
                        Station Updates
                    </Text>
                    {unreadUpdatesCount > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>{unreadUpdatesCount}</Text>
                        </View>
                    )}
                </Pressable>

                <Pressable
                    style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
                    onPress={() => setActiveTab('messages')}
                >
                    <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
                        Company Message
                    </Text>
                    {unreadMessagesCount > 0 && (
                        <View style={[styles.tabBadge, { backgroundColor: '#ff3b30' }]}>
                            <Text style={styles.tabBadgeText}>{unreadMessagesCount}</Text>
                        </View>
                    )}
                </Pressable>
            </View>

            <FlatList
                data={displayedNotifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Ionicons
                            name={activeTab === 'updates' ? "notifications-off-outline" : "chatbubble-ellipses-outline"}
                            size={60}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.emptyText}>
                            {activeTab === 'updates' ? "No station updates yet." : "No messages from company."}
                        </Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
                contentContainerStyle={styles.listContentContainer}
            />
        </View>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background },
    header: { paddingTop: 40, paddingBottom: 10 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: colors.text },

    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.primary,
        fontWeight: '700',
    },
    tabBadge: {
        marginLeft: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },

    notificationCard: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'flex-start',
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    broadcastCard: {
        borderColor: 'rgba(255, 59, 48, 0.3)',
        backgroundColor: 'rgba(255, 59, 48, 0.03)',
    },

    unreadDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 16, right: 16, backgroundColor: colors.primary },

    iconContainer: { marginRight: 16, marginTop: 2 },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    textContainer: { flex: 1 },
    broadcastTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    message: { fontSize: 15, fontWeight: '500', color: colors.text, lineHeight: 20 },
    timestamp: { fontSize: 11, marginTop: 6, color: colors.textSecondary },
    tapHint: { fontSize: 11, marginTop: 8, color: colors.primary, fontWeight: '600' },

    emptyText: { fontSize: 16, marginTop: 16, textAlign: 'center', color: colors.textSecondary },
    listContentContainer: { paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 },
});