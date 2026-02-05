// File: app/(tabs)/favourite.tsx
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingAnimation from '../../components/LoadingAnimation';
import StationIcon from '../../components/StationIcon'; // Assumes StationIcon.tsx is in components/
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { DbStation } from './home';

type AppColors = ReturnType<typeof useTheme>['colors'];
interface FavouriteStationData extends DbStation {
    notifications_enabled: boolean;
    latest_pms_price: number | null;
    last_updated_at: string | null;
}

const formatTimeAgo = (dateString: string | null): string => {
    if (!dateString) return 'No updates';
    const now = new Date(); const past = new Date(dateString);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return `Up. ${Math.floor(interval)}hrs ago`;
    interval = seconds / 60;
    if (interval > 1) return `Up. ${Math.floor(interval)}mins ago`;
    return "Just now";
};

import AdvertCard, { Advert } from '../../components/AdvertCard'; // Added AdvertCard

// ... imports

export default function FavouriteScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const { user } = useAuth();
    const isFocused = useIsFocused();
    const legacyNavigation = useNavigation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [allFavourites, setAllFavourites] = useState<FavouriteStationData[]>([]);
    const [adverts, setAdverts] = useState<Advert[]>([]); // Ad state

    const fetchFavourites = useCallback(async () => {
        if (!user) { setAllFavourites([]); setIsLoading(false); return; }
        setIsLoading(true);
        const { data, error } = await supabase.rpc('get_favourite_stations_for_app', { p_user_id: user.id });
        if (error) Alert.alert('Error Loading Tracked Stations', error.message);
        else if (data) setAllFavourites(data as FavouriteStationData[]);
        setIsLoading(false);
    }, [user]);

    // Fetch ads independently
    useEffect(() => {
        const fetchAdverts = async () => {
            try {
                // Check Global Kill Switch
                const { data: settingsData } = await supabase.from('app_settings').select('value').eq('key', 'global_ads_enabled').single();
                if (settingsData && settingsData.value === false) {
                    setAdverts([]);
                    return;
                }

                const { data } = await supabase
                    .from('adverts')
                    .select('*')
                    .eq('is_active', true)
                    .in('type', ['card', 'video', 'banner']) // Allow video and images
                    .limit(2); // Fetch a couple

                if (data) {
                    const validAdverts = data.map(ad => ({
                        ...ad,
                        type: (['banner', 'card', 'native', 'video'].includes(ad.type) ? ad.type : 'card') as 'banner' | 'card' | 'native' | 'video'
                    }));
                    setAdverts(validAdverts);
                }
            } catch (err) {
                console.error("Error fetching ads for favourites:", err);
            }
        };

        if (isFocused) {
            fetchAdverts();
        }
    }, [isFocused]);

    const handleRemoveFavourite = (stationIdToRemove: number) => {
        Alert.alert("Stop Tracking", "Are you sure you want to stop tracking this station?",
            [{ text: "Cancel", style: "cancel" }, {
                text: "Remove",
                onPress: async () => {
                    if (!user) return;
                    setAllFavourites(current => current.filter(fav => fav.id !== stationIdToRemove));
                    const { error } = await supabase.from('favourite_stations').delete().match({ user_id: user.id, station_id: stationIdToRemove });
                    if (error) { Alert.alert('Error', 'Could not stop tracking.'); fetchFavourites(); }
                }, style: "destructive"
            }]
        );
    };

    const handleToggleNotification = async (favourite: FavouriteStationData) => {
        const newStatus = !favourite.notifications_enabled;
        setAllFavourites(current => current.map(fav => fav.id === favourite.id ? { ...fav, notifications_enabled: newStatus } : fav));
        const { error } = await supabase.from('favourite_stations').update({ notifications_enabled: newStatus }).match({ user_id: user!.id, station_id: favourite.id });
        if (error) { Alert.alert('Error', 'Could not update notification preference.'); fetchFavourites(); }
    };

    const handleCardPress = (stationId: number) => {
        router.push(`/station/${stationId}`);
    };

    useEffect(() => { if (isFocused) fetchFavourites(); }, [isFocused, user, fetchFavourites]);

    const filteredData = useMemo(() => {
        let data: (FavouriteStationData | Advert)[] = [...allFavourites];
        if (searchTerm.trim()) {
            data = data.filter(item => 'name' in item && item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // Inject Ads
        if (adverts.length > 0 && data.length > 0) {
            // Inject first ad after 2nd item
            if (data.length >= 2 && adverts[0]) {
                data.splice(2, 0, adverts[0]);
            } else if (adverts[0]) {
                data.push(adverts[0]);
            }

            // Inject second ad after 5th item (if list is long enough)
            if (data.length >= 6 && adverts[1]) {
                data.splice(6, 0, adverts[1]);
            }
        }
        return data;
    }, [searchTerm, allFavourites, adverts]);

    const renderItem = ({ item }: { item: FavouriteStationData | Advert }) => {
        // Check if it's an ad
        if ('type' in item && (item.type === 'banner' || item.type === 'card' || item.type === 'video')) {
            return (
                <View style={{ marginBottom: 16 }}>
                    <AdvertCard advert={item as Advert} />
                </View>
            );
        }

        const favourite = item as FavouriteStationData;
        return (
            <TouchableOpacity onPress={() => handleCardPress(favourite.id)} activeOpacity={0.7}>
                <View style={styles.cardContainer}>
                    <View style={styles.logoContainer}>
                        {favourite.logo_url ? (
                            <Image source={{ uri: favourite.logo_url }} style={styles.logoImage} resizeMode="contain" />
                        ) : (
                            <StationIcon color={colors.primary} width={24} height={24} />
                        )}
                    </View>
                    <View style={styles.infoContainer}>
                        <Text style={styles.stationName} numberOfLines={1}>{favourite.name}</Text>
                        <View style={styles.ratingContainer}>
                            <FontAwesome name="star" size={16} color={colors.accent} />
                            <Text style={styles.ratingText}>{favourite.rating?.toFixed(1) ?? 'N/A'} ({favourite.review_count ?? 0} reviews)</Text>
                        </View>
                        <Text style={styles.addressText} numberOfLines={2}>{favourite.address}</Text>
                    </View>
                    <View style={styles.priceBox}>
                        <Text style={styles.priceText}>N {favourite.latest_pms_price?.toFixed(0) || '---'}/L</Text>
                        <Text style={styles.updateText}>{formatTimeAgo(favourite.last_updated_at)}</Text>
                    </View>
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity onPress={() => handleToggleNotification(favourite)} style={styles.actionButton}><Ionicons name={favourite.notifications_enabled ? "notifications" : "notifications-outline"} size={22} color={favourite.notifications_enabled ? colors.primary : colors.textSecondary} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveFavourite(favourite.id)} style={styles.actionButton}><View style={styles.removeIconCircle}><FontAwesome name="minus" size={12} color="#FFFFFF" /></View></TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity style={styles.headerLeft} onPress={() => legacyNavigation.goBack()}><Ionicons name="chevron-back" size={24} color={colors.text} /><Text style={styles.backButtonText}>Back</Text></TouchableOpacity>
                    <View style={styles.headerCenter}><Text style={styles.headerTitle}>Track Activities</Text></View>
                    <View style={styles.headerRight} />
                </View>
                <TextInput style={styles.searchInput} placeholder="Search tracked stations..." placeholderTextColor={colors.textSecondary} value={searchTerm} onChangeText={setSearchTerm} />
                {isLoading ? (<LoadingAnimation message="Loading tracked stations..." size="medium" />) : (
                    <FlatList
                        data={filteredData} renderItem={renderItem} keyExtractor={(item) => 'id' in item ? item.id.toString() : Math.random().toString()}
                        style={styles.list} contentContainerStyle={styles.listContentContainer}
                        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>{allFavourites.length === 0 ? "You aren't tracking any stations yet.\n\nTap the 📍 button on any station to start tracking its activity." : "No tracked stations match your search."}</Text></View>}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}


const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    headerContainer: { height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    headerCenter: { flex: 2, alignItems: 'center' },
    headerRight: { flex: 1 },
    backButtonText: { fontSize: 16, marginLeft: 5, color: colors.text },
    headerTitle: { fontSize: 18, fontWeight: '500', color: colors.text },
    searchInput: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, marginHorizontal: 16, marginBottom: 24, backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
    list: { flex: 1 },
    listContentContainer: { paddingHorizontal: 16, paddingBottom: 100 },
    cardContainer: { height: 92, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 5, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, backgroundColor: colors.card, shadowColor: colors.shadow },
    // *** THE ONLY CHANGE IS HERE ***
    logoContainer: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginRight: 12,
        // CHANGE: Removed the background color to make the container transparent
        backgroundColor: 'transparent',
    },
    logoImage: { width: 24, height: 24 },
    infoContainer: { flex: 1, height: '100%', justifyContent: 'center', gap: 3 },
    stationName: { fontSize: 16, fontWeight: '600', color: colors.text },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    ratingText: { fontSize: 14, fontWeight: '500', color: colors.text },
    addressText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
    priceBox: { width: 85, height: 60, borderLeftWidth: 1, paddingLeft: 10, justifyContent: 'center', alignItems: 'flex-start', gap: 3, borderLeftColor: colors.primary },
    priceText: { fontSize: 16, fontWeight: '700', color: colors.text },
    updateText: { fontSize: 10, fontWeight: '500', color: colors.textSecondary },
    actionsContainer: { flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center', height: '100%', paddingLeft: 8 },
    actionButton: { padding: 4 },
    removeIconCircle: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.destructive },
    emptyContainer: { flex: 1, marginTop: 50, paddingHorizontal: 20, alignItems: 'center' },
    emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24, color: colors.textSecondary },
});