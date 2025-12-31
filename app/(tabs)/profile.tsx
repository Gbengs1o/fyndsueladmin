// File: app/(tabs)/profile.tsx
// Profile Page - Clean, natural design using theme colors

import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import FyndFuelLogo from '../../components/icons/FyndFuelLogo';
import { LetterAvatar } from '../../components/LetterAvatar';
import LoadingAnimation from '../../components/LoadingAnimation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

type AppColors = ReturnType<typeof useTheme>['colors'];

interface Profile {
    full_name: string;
    street: string | null;
    city: string | null;
    phone_number: string | null;
    avatar_url: string | null;
}

export default function ProfileScreen() {
    const { colors, theme } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);
    const { user, signOut, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const isFocused = useIsFocused();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [priceReportCount, setPriceReportCount] = useState<number>(0);
    const [stationAddCount, setStationAddCount] = useState<number>(0);
    const [reviewCount, setReviewCount] = useState<number>(0);
    const [isEditing, setIsEditing] = useState(false);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Calculate contribution level
    const contributionLevel = useMemo(() => {
        const total = priceReportCount + stationAddCount + reviewCount;
        if (total >= 100) return { name: 'Expert', icon: 'star', color: '#FFB800' };
        if (total >= 50) return { name: 'Active', icon: 'trending-up', color: colors.primary };
        if (total >= 10) return { name: 'Regular', icon: 'person', color: colors.success };
        return { name: 'Newcomer', icon: 'leaf', color: colors.textSecondary };
    }, [priceReportCount, stationAddCount, reviewCount, colors]);

    const fetchProfileAndStats = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // We use allSettled so if stats fail (e.g. database function missing), the profile still loads.
            const [profileResult, statsResult] = await Promise.allSettled([
                supabase.from('profiles').select('full_name, street, city, phone_number, avatar_url').eq('id', user.id).single(),
                supabase.rpc('get_user_stats')
            ]);

            // Handling Profile Result
            if (profileResult.status === 'fulfilled') {
                const { data, error } = profileResult.value;
                if (!error && data) {
                    setProfile(data as Profile);
                } else {
                    console.error("Profile fetch error:", error);
                    // If profile is missing solely here, maybe we can rely on AuthContext, 
                    // but usually AuthContext created it.
                }
            } else {
                console.error("Profile promise rejected:", profileResult.reason);
            }

            // Handling Stats Result
            if (statsResult.status === 'fulfilled') {
                const { data, error } = statsResult.value;
                if (!error && data && data[0]) {
                    setPriceReportCount(data[0].price_report_count || 0);
                    setStationAddCount(data[0].station_add_count || 0);
                    setReviewCount(data[0].review_count || 0);
                } else if (error) {
                    console.warn("Stats fetch error (ignoring):", error);
                }
            } else {
                console.warn("Stats promise rejected (ignoring):", statsResult.reason);
            }

            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        } catch (error: any) {
            console.error("Critical error in fetchProfileAndStats:", error);
            Alert.alert("Error", "Could not fetch some data.");
        } finally {
            setIsLoading(false);
        }
    }, [user, fadeAnim]);

    useEffect(() => {
        if (isFocused && user) fetchProfileAndStats();
    }, [isFocused, user, fetchProfileAndStats]);

    const handleUpdateProfile = async () => {
        if (!user || !profile) return;
        setIsSaving(true);
        const { error } = await supabase.from('profiles').update({
            full_name: profile.full_name,
            street: profile.street,
            city: profile.city,
            phone_number: profile.phone_number
        }).eq('id', user.id);

        if (error) {
            Alert.alert('Error', 'Failed to update profile.');
        } else {
            Alert.alert('Success', 'Profile updated!');
            setIsEditing(false);
        }
        setIsSaving(false);
    };

    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your photos to upload an avatar.');
            return;
        }
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5
            });
            if (!result.canceled) await uploadAvatar(result.assets[0]);
        } catch (e) {
            Alert.alert("Error", "Could not open the image library.");
        }
    };

    const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { uri, mimeType } = asset;
            const fileExt = mimeType?.split('/')[1] || 'jpg';
            const path = `${user.id}/${Date.now()}.${fileExt}`;
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            const { error: uploadError } = await supabase.storage.from('avatars').upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            if (updateError) throw updateError;

            setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
            Alert.alert('Success', 'Avatar updated!');
        } catch (error: any) {
            Alert.alert('Upload Error', error.message || 'Failed to upload avatar.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => signOut(() => router.replace('/(auth)/signIn')) }
            ]
        );
    };

    if (isAuthLoading || isLoading) {
        return (
            <View style={styles.centerContent}>
                <LoadingAnimation message="Loading profile..." size="medium" />
            </View>
        );
    }

    if (!user || !profile) {
        return (
            <View style={styles.centerContent}>
                <Ionicons name="person-circle-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.errorText}>Could not load profile</Text>
                <Pressable style={styles.retryButton} onPress={fetchProfileAndStats}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Pressable style={styles.headerButton} onPress={() => router.push('/settings')}>
                            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable style={styles.headerButton} onPress={handleSignOut}>
                            <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    {/* Avatar */}
                    <Pressable onPress={handlePickAvatar} style={styles.avatarContainer}>
                        <LetterAvatar avatarUrl={profile.avatar_url} name={profile.full_name} size={100} />
                        <View style={styles.cameraButton}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </Pressable>

                    {/* Name & Email */}
                    <Text style={styles.userName}>{profile.full_name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>

                    {/* Level Badge */}
                    <View style={[styles.levelBadge, { backgroundColor: contributionLevel.color + '20' }]}>
                        <Ionicons name={contributionLevel.icon as any} size={14} color={contributionLevel.color} />
                        <Text style={[styles.levelText, { color: contributionLevel.color }]}>
                            {contributionLevel.name} Contributor
                        </Text>
                    </View>
                </View>

                {/* Stats */}
                <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
                    <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: colors.primaryOpaque }]}>
                            <Ionicons name="pricetag" size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.statValue}>{priceReportCount}</Text>
                        <Text style={styles.statLabel}>Reports</Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
                            <FyndFuelLogo size={18} color={colors.success} />
                        </View>
                        <Text style={styles.statValue}>{stationAddCount}</Text>
                        <Text style={styles.statLabel}>Stations</Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                            <Ionicons name="chatbubble" size={18} color="#F59E0B" />
                        </View>
                        <Text style={styles.statValue}>{reviewCount}</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                </Animated.View>

                {/* Profile Info Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Profile Information</Text>
                        <Pressable onPress={() => setIsEditing(!isEditing)}>
                            <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                        </Pressable>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phone</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.infoInput}
                                        value={profile.phone_number || ''}
                                        placeholder="Enter phone"
                                        placeholderTextColor={colors.placeholder}
                                        keyboardType="phone-pad"
                                        onChangeText={(text) => setProfile(p => p ? { ...p, phone_number: text } : null)}
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{profile.phone_number || 'Not set'}</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Street</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.infoInput}
                                        value={profile.street || ''}
                                        placeholder="Enter street"
                                        placeholderTextColor={colors.placeholder}
                                        onChangeText={(text) => setProfile(p => p ? { ...p, street: text } : null)}
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{profile.street || 'Not set'}</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.infoRow}>
                            <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>City</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.infoInput}
                                        value={profile.city || ''}
                                        placeholder="Enter city"
                                        placeholderTextColor={colors.placeholder}
                                        onChangeText={(text) => setProfile(p => p ? { ...p, city: text } : null)}
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{profile.city || 'Not set'}</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {isEditing && (
                        <Pressable
                            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                            onPress={handleUpdateProfile}
                            disabled={isSaving}
                        >
                            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                        </Pressable>
                    )}
                </View>

                {/* Quick Links */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Links</Text>

                    <Pressable style={styles.linkRow} onPress={() => router.push('/favourite')}>
                        <View style={styles.linkIcon}>
                            <Ionicons name="bookmark" size={20} color="#00c853" />
                        </View>
                        <Text style={styles.linkText}>Track Activities</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </Pressable>

                    <Pressable style={styles.linkRow} onPress={() => router.push('/leaderboard')}>
                        <View style={styles.linkIcon}>
                            <Ionicons name="trophy" size={20} color="#F59E0B" />
                        </View>
                        <Text style={styles.linkText}>Leaderboard</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </Pressable>

                    <Pressable style={styles.linkRow} onPress={() => router.push('/notifications')}>
                        <View style={styles.linkIcon}>
                            <Ionicons name="notifications" size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.linkText}>Notifications</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
    scrollContent: {
        paddingBottom: 100,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: colors.text,
        marginTop: 12,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },

    // Header
    header: {
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTop: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        right: 16,
        flexDirection: 'row',
        gap: 12,
    },
    headerButton: {
        padding: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.card,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    levelText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Stats
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },

    // Section
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    editButton: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },

    // Info Card
    infoCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: colors.text,
    },
    infoInput: {
        fontSize: 15,
        color: colors.text,
        borderBottomWidth: 1,
        borderBottomColor: colors.primary,
        paddingVertical: 2,
    },
    infoDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 44,
    },
    saveButton: {
        backgroundColor: colors.primary,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },

    // Links
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    linkIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    linkText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
});