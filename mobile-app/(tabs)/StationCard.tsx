// File: app/(tabs)/StationCard.tsx (or wherever this component is located)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
// *** THIS IS THE ONLY LINE THAT HAS CHANGED ***
import StationIcon from '../../components/StationIcon';
import { DbStation } from './home'; // Assuming home.ts is in the same directory

type AppColors = ReturnType<typeof useTheme>['colors'];

interface StationCardProps {
    station: DbStation;
    onPress: () => void;
    isFavourite?: boolean;
    onToggleFavourite?: () => void;
    notificationsEnabled?: boolean;
    onToggleNotification?: () => void;
}

const formatTimeAgo = (dateString?: string | null): string => {
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleDateString(); } catch { return '...'; }
};

const StationCard: React.FC<StationCardProps> = ({ station, onPress, isFavourite, onToggleFavourite, notificationsEnabled, onToggleNotification }) => {
    const { colors, theme } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);
    const router = useRouter();

    const handleViewPress = (e: any) => { e.stopPropagation(); router.push(`/station/${station.id}`); };
    const handleFavouritePress = (e: any) => { e.stopPropagation(); onToggleFavourite?.(); };
    const handleNotificationPress = (e: any) => { e.stopPropagation(); onToggleNotification?.(); };

    return (
        <Pressable style={styles.cardContainer} onPress={onPress}>
            <View style={styles.topSection}>
                <View style={styles.iconContainer}>
                    <StationIcon color={colors.primary} width={20} height={20} />
                </View>
                <View style={styles.infoContainer}>
                    <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
                    <View style={styles.ratingContainer}>
                        {typeof onToggleFavourite === 'function' && (
                            <Pressable onPress={handleFavouritePress} style={styles.iconButton}>
                                <Ionicons name={isFavourite ? 'heart' : 'heart-outline'} size={18} color={isFavourite ? colors.destructive : colors.textSecondary} />
                            </Pressable>
                        )}
                        {typeof onToggleNotification === 'function' && (
                            <Pressable onPress={handleNotificationPress} style={styles.iconButton}>
                                <Ionicons name={notificationsEnabled ? 'notifications' : 'notifications-outline'} size={18} color={notificationsEnabled ? colors.primary : colors.textSecondary} />
                            </Pressable>
                        )}
                        <Ionicons name="star" size={16} color={colors.accent} />
                        <Text style={styles.ratingText}>{station.rating?.toFixed(1) ?? 'N/A'} ({station.review_count ?? 0} reviews)</Text>
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>{station.address || 'No address provided'}</Text>
                </View>
                <View style={styles.priceBox}>
                    <Text style={styles.priceText}>₦{station.latest_pms_price ? station.latest_pms_price.toFixed(0) : '---'}/L</Text>
                    <Text style={styles.lastUpdatedText}>Upd: {formatTimeAgo(station.last_updated_at)}</Text>
                </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.bottomSection}>
                <Text style={styles.distanceText}>
                    {station.distance_meters != null ? `Within ${(station.distance_meters / 1000).toFixed(1)} km` : 'Distance not applicable'}
                </Text>
                <Pressable style={({ pressed }) => [styles.viewButton, pressed && { opacity: 0.8 }]} onPress={handleViewPress}>
                    <Ionicons name="eye" size={16} color={colors.primaryText} />
                    <Text style={styles.viewButtonText}>View</Text>
                </Pressable>
            </View>
        </Pressable>
    );
};

const getThemedStyles = (colors: AppColors, theme: string) => StyleSheet.create({
    cardContainer: { borderRadius: 12, borderWidth: 1, padding: 12, marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.card, borderColor: colors.border },
    topSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    iconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
    infoContainer: { flex: 1, marginRight: 10, justifyContent: 'center' },
    stationName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
    iconButton: { marginRight: 8, padding: 4 },
    ratingText: { fontSize: 13, marginLeft: 4, color: colors.textSecondary, fontWeight: '500' },
    addressText: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
    priceBox: { minWidth: 85, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: colors.border },
    priceText: { fontSize: 16, fontWeight: '800', color: colors.text },
    lastUpdatedText: { fontSize: 10, marginTop: 4, color: colors.textSecondary, fontWeight: '500' },
    separator: { height: 1, marginVertical: 12, backgroundColor: colors.border, opacity: 0.5 },
    bottomSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    distanceText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    viewButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
    viewButtonText: { fontSize: 13, fontWeight: '600', marginLeft: 6, color: '#fff' },
});

export default StationCard;