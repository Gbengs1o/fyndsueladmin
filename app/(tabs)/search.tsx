// File: app/(tabs)/search.tsx
// Premium redesign with real-time location, pull-to-refresh, and stunning UI

import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import AdvertCard, { Advert } from '../../components/AdvertCard';
import FyndFuelLogo from '../../components/icons/FyndFuelLogo';
import LoadingAnimation from '../../components/LoadingAnimation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import { supabase } from '../../lib/supabase';
import { useFilterStore } from '../../stores/useFilterStore';
import { DbStation as OriginalDbStation } from './home';
import StationCard from './StationCard';

export type DbStation = OriginalDbStation & {
    average_rating?: number | null;
    amenities?: string[] | null;
    products?: string[] | null;
    latest_pms_price?: number | null;
    latest_ago_price?: number | null;
    latest_lpg_price?: number | null;
    latest_dpk_price?: number | null;
    distance_meters: number;
    last_updated_at?: string | null;
};

type AppColors = ReturnType<typeof useTheme>['colors'];

const getThemedStyles = (colors: AppColors, theme: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Premium Header
    header: {
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: { elevation: 8 },
        }),
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 16,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },

    // Search Bar - Premium
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        borderRadius: 16,
        flex: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        paddingHorizontal: 14,
    },
    inputIcon: { color: colors.textSecondary, marginRight: 10 },
    searchInput: {
        height: 52,
        fontSize: 16,
        flex: 1,
        color: colors.text,
        fontWeight: '500',
    },
    clearButton: { padding: 6 },
    mapButton: {
        height: 52,
        width: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: { elevation: 6 },
        }),
    },

    // Filter Chips Row
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 16,
    },
    chipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        gap: 8,
    },
    chipButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipButtonText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    chipButtonTextActive: { color: '#fff' },

    // Location Badge
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.1)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        gap: 8,
        flex: 1,
    },
    locationBadgeText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 13,
        flex: 1,
    },

    // Stats Bar
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: { elevation: 3 },
        }),
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statBoxDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    statValueHighlight: {
        color: colors.primary,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Price Summary - Premium Card
    priceSummaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: colors.card,
        borderRadius: 20,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: { elevation: 4 },
        }),
    },
    priceSummaryBox: {
        flex: 1,
        gap: 4,
    },
    priceSummaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    priceSummaryLabelHigh: {
        color: '#ff6b6b',
    },
    priceSummaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    priceSummaryDistance: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    priceSummaryDividerContainer: {
        flex: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    priceSummaryArrow: {
        width: 40,
        height: 2,
        backgroundColor: colors.border,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionHeaderText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    sectionHeaderCount: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
        backgroundColor: theme === 'dark' ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },

    // Empty & Loading States
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 15,
        lineHeight: 22,
    },

    // Modal - Premium
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 20,
    },
    brandGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    brandItem: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        width: '30%',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    brandIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    brandItemText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Refresh Indicator
    refreshHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    refreshHintText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});

// Price Summary Component
const PriceSummary = React.memo(({ stations, colors, theme }: { stations: DbStation[], colors: AppColors, theme: string }) => {
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);
    const summary = useMemo(() => {
        const stationsWithPrice = stations.filter(s => s.latest_pms_price != null);
        if (stationsWithPrice.length < 2) return null;
        const lowest = stationsWithPrice.reduce((prev, curr) => prev.latest_pms_price! < curr.latest_pms_price! ? prev : curr);
        const highest = stationsWithPrice.reduce((prev, curr) => prev.latest_pms_price! > curr.latest_pms_price! ? prev : curr);
        if (lowest.id === highest.id) return null;
        return { lowest, highest, savings: highest.latest_pms_price! - lowest.latest_pms_price! };
    }, [stations]);

    if (!summary) return null;

    return (
        <View style={styles.priceSummaryContainer}>
            <View style={styles.priceSummaryBox}>
                <Text style={styles.priceSummaryLabel}>⬇ Lowest Price</Text>
                <Text style={styles.priceSummaryValue}>₦{summary.lowest.latest_pms_price?.toLocaleString()}/L</Text>
                <Text style={styles.priceSummaryDistance}>{(summary.lowest.distance_meters / 1000).toFixed(1)}km • {summary.lowest.name?.slice(0, 20)}</Text>
            </View>
            <View style={styles.priceSummaryDividerContainer}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>SAVE</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#00c853' }}>₦{summary.savings}</Text>
                </View>
            </View>
            <View style={[styles.priceSummaryBox, { alignItems: 'flex-end' }]}>
                <Text style={[styles.priceSummaryLabel, styles.priceSummaryLabelHigh]}>⬆ Highest Price</Text>
                <Text style={styles.priceSummaryValue}>₦{summary.highest.latest_pms_price?.toLocaleString()}/L</Text>
                <Text style={styles.priceSummaryDistance}>{(summary.highest.distance_meters / 1000).toFixed(1)}km away</Text>
            </View>
        </View>
    );
});

// Section Header Component
const DistanceHeader = React.memo(({ title, count, colors, theme }: { title: string, count: number, colors: AppColors, theme: string }) => {
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <Text style={styles.sectionHeaderCount}>{count} stations</Text>
        </View>
    );
});

// Empty State Component
const EmptyState = React.memo(({ colors, theme, onRefresh }: { colors: AppColors, theme: string, onRefresh: () => void }) => {
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);
    return (
        <View style={styles.centered}>
            <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Stations Found</Text>
            <Text style={styles.emptyText}>
                We couldn't find any stations matching your criteria. Try adjusting your filters or search in a different area.
            </Text>
            <Pressable
                style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 14 }}
                onPress={onRefresh}
            >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Refresh Search</Text>
            </Pressable>
        </View>
    );
});

export default function SearchScreen() {
    const { colors, theme } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);

    const router = useRouter();
    const isFocused = useIsFocused();
    const locationFilter = useFilterStore((state) => state.location);
    const setLocationFilter = useFilterStore((state) => state.setLocation);
    const filters = useFilterStore((state) => state.filters);

    const [searchQuery, setSearchQuery] = useState('');
    const [allStations, setAllStations] = useState<DbStation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    const [brandsModalVisible, setBrandsModalVisible] = useState(false);
    const { user } = useAuth();
    const [favouriteIds, setFavouriteIds] = useState<Set<number>>(new Set());
    const [adverts, setAdverts] = useState<Advert[]>([]);

    // Real-time location tracking
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);
    const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

    const POPULAR_BRANDS = ["Mobil", "NNPC", "Rainoil", "Conoil", "PPMC", "Total", "Ascon Oil", "OANDO", "AP"];

    // Animation
    const headerScale = useRef(new Animated.Value(1)).current;

    const handleBrandSelect = (brandName: string) => {
        setSearchQuery(brandName);
        setBrandsModalVisible(false);
    };

    const fetchFavouriteIds = useCallback(async () => {
        if (!user) { setFavouriteIds(new Set()); return; }
        const { data } = await supabase.from('favourite_stations').select('station_id').eq('user_id', user.id);
        if (data) { setFavouriteIds(new Set(data.map(f => f.station_id))); }
    }, [user]);

    const handleToggleFavourite = async (station: DbStation) => {
        if (!user) { return Alert.alert("Authentication Required", "Please sign in to add favourites."); }
        const isCurrentlyFavourite = favouriteIds.has(station.id);
        const originalFavouriteIds = new Set(favouriteIds);
        const newIds = new Set(favouriteIds);
        if (isCurrentlyFavourite) { newIds.delete(station.id); } else { newIds.add(station.id); }
        setFavouriteIds(newIds);
        if (isCurrentlyFavourite) {
            const { error } = await supabase.from('favourite_stations').delete().match({ user_id: user.id, station_id: station.id });
            if (error) { Alert.alert("Error", "Could not remove from favourites."); setFavouriteIds(originalFavouriteIds); }
        } else {
            const { error } = await supabase.from('favourite_stations').insert({ user_id: user.id, station_id: station.id, notifications_enabled: true });
            if (error) { Alert.alert("Error", "Could not add to favourites."); setFavouriteIds(originalFavouriteIds); }
        }
    };

    const fetchFilteredStations = useCallback(async (isRefresh = false) => {
        if (!locationFilter) return;
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const { data: baseStations, error: rpcError } = await supabase.rpc('get_stations_for_app', {
                search_term: debouncedSearchQuery,
                target_latitude: locationFilter.latitude,
                target_longitude: locationFilter.longitude,
                search_radius_meters: 50000,
            });

            if (rpcError || !baseStations || baseStations.length === 0) {
                setAllStations([]);
                if (rpcError) console.error('Search Error:', rpcError.message);
                return;
            }

            const stationIds = baseStations.map(station => station.id);

            const [allReportsResponse, _] = await Promise.all([
                supabase
                    .from('price_reports')
                    .select('station_id, rating, amenities_update, payment_methods_update, fuel_type, other_fuel_prices')
                    .in('station_id', stationIds),
                fetchFavouriteIds()
            ]);

            const amenitiesMap = new Map<number, Set<string>>();
            const ratingsMap = new Map<number, { sum: number; count: number }>();
            const productsMap = new Map<number, Set<string>>();

            if (allReportsResponse.data) {
                for (const report of allReportsResponse.data) {
                    const { station_id, rating, amenities_update, payment_methods_update, fuel_type, other_fuel_prices } = report;

                    if (rating) {
                        const existingRating = ratingsMap.get(station_id) || { sum: 0, count: 0 };
                        ratingsMap.set(station_id, { sum: existingRating.sum + rating, count: existingRating.count + 1 });
                    }

                    const allAdditions = [...(amenities_update?.add || []), ...(payment_methods_update?.add || [])];
                    if (allAdditions.length > 0) {
                        const existingAmenities = amenitiesMap.get(station_id) || new Set();
                        allAdditions.forEach(amenity => existingAmenities.add(amenity));
                        amenitiesMap.set(station_id, existingAmenities);
                    }

                    const existingProducts = productsMap.get(station_id) || new Set();
                    if (fuel_type === 'PMS') {
                        existingProducts.add('Petrol');
                    }
                    if (other_fuel_prices) {
                        Object.keys(other_fuel_prices).forEach(productName => existingProducts.add(productName));
                    }
                    if (existingProducts.size > 0) {
                        productsMap.set(station_id, existingProducts);
                    }
                }
            }

            const enrichedStations = baseStations.map(station => {
                const ratingInfo = ratingsMap.get(station.id);
                const amenitiesSet = amenitiesMap.get(station.id);
                const productsSet = productsMap.get(station.id);
                return {
                    ...station,
                    amenities: amenitiesSet ? Array.from(amenitiesSet) : [],
                    average_rating: ratingInfo ? ratingInfo.sum / ratingInfo.count : null,
                    products: productsSet ? Array.from(productsSet) : [],
                };
            });

            setAllStations(enrichedStations);
            setLastLocationUpdate(new Date());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [debouncedSearchQuery, locationFilter, fetchFavouriteIds]);

    // Fetch Adverts
    useEffect(() => {
        const fetchAdverts = async () => {
            try {
                // 1. Check Global Kill Switch
                const { data: settingsData } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'global_ads_enabled')
                    .single();

                const areAdsEnabled = settingsData?.value ?? true; // Default to true if missing
                if (!areAdsEnabled) {
                    setAdverts([]);
                    return;
                }

                // 2. Identify User Location Context (State/City)
                let userLocationKeywords: string[] = [];
                if (locationFilter) {
                    // If name is generic, try to reverse geocode
                    if (locationFilter.name === 'Current Location' || !locationFilter.name) {
                        try {
                            const [address] = await Location.reverseGeocodeAsync({
                                latitude: locationFilter.latitude,
                                longitude: locationFilter.longitude
                            });
                            if (address) {
                                if (address.city) userLocationKeywords.push(address.city);
                                if (address.subregion) userLocationKeywords.push(address.subregion);
                                if (address.region) userLocationKeywords.push(address.region); // State often here
                            }
                        } catch (e) {
                            // Sient fail on geocode
                        }
                    } else {
                        // Use the selected location name as a keyword
                        userLocationKeywords.push(locationFilter.name);
                    }
                }

                // Normalise keywords for matching
                const normalizedLocationKeywords = userLocationKeywords.map(k => k.toLowerCase());

                // 3. Fetch Active Ads
                const { data, error } = await supabase
                    .from('adverts')
                    .select('*')
                    .eq('is_active', true)
                    .gte('end_date', new Date().toISOString())
                    .lte('start_date', new Date().toISOString())
                    .order('priority', { ascending: false });

                if (data) {
                    // 4. Client-side Filtering for Targeting
                    const targetedAdverts = data.filter(ad => {
                        // If no specific target locations, show to everyone (or maybe default to 'Nigeria' logic if needed, but 'null' usually means global)
                        if (!ad.target_locations || ad.target_locations.length === 0) return true;

                        // Check if ANY of the target locations match our user keywords
                        // e.g. target=['Lagos'] matches user=['Lagos', 'Ikeja']
                        // Handle "All Nigeria" case if you have a specific keyword for it, otherwise assume empty target = all.
                        const targets = ad.target_locations.map((t: string) => t.toLowerCase());

                        // Special case: If ad targets "Nigeria" or "All Nigeria", always show
                        if (targets.some((t: string) => t.includes('nigeria'))) return true;

                        // Match against user location
                        const hasMatch = targets.some((target: string) =>
                            normalizedLocationKeywords.some(keyword => keyword.includes(target) || target.includes(keyword))
                        );

                        return hasMatch;
                    });

                    // Cast the data to Advert type
                    const validAdverts = targetedAdverts.map(ad => ({
                        ...ad,
                        type: (['banner', 'card', 'native', 'video'].includes(ad.type) ? ad.type : 'card') as 'banner' | 'card' | 'native' | 'video'
                    }));
                    setAdverts(validAdverts);
                }
            } catch (err) {
                console.error("Error fetching adverts:", err);
            }
        };



        fetchAdverts();

        // Real-time Subscriptions
        const settingsChannel = supabase.channel('public:app_settings')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'key=eq.global_ads_enabled' },
                (payload) => {
                    const newValue = payload.new.value;
                    if (newValue === false) {
                        setAdverts([]); // Kill switch activated
                    } else {
                        fetchAdverts(); // Re-fetch if turned back on
                    }
                }
            )
            .subscribe();

        const advertsChannel = supabase.channel('public:adverts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'adverts' },
                () => {
                    fetchAdverts(); // Refresh ads on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(settingsChannel);
            supabase.removeChannel(advertsChannel);
        };
    }, [locationFilter]); // Re-fetch when location changes (for targeting)



    // Pull-to-refresh handler
    const onRefresh = useCallback(() => {
        fetchFilteredStations(true);
    }, [fetchFilteredStations]);

    // Start real-time location tracking
    const startLocationTracking = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Enable location to track nearby stations in real-time.');
                return;
            }

            setIsTrackingLocation(true);

            // Get initial location
            const location = await Location.getCurrentPositionAsync({});
            setLocationFilter({
                name: 'Current Location',
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            // Start watching location
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 30000, // Update every 30 seconds
                    distanceInterval: 100, // Or when moved 100 meters
                },
                (newLocation) => {
                    setLocationFilter({
                        name: 'Current Location',
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude
                    });
                }
            );
        } catch (error) {
            console.error('Location tracking error:', error);
            setIsTrackingLocation(false);
        }
    }, [setLocationFilter]);

    const stopLocationTracking = useCallback(() => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
        setIsTrackingLocation(false);
    }, []);

    useEffect(() => {
        if (isFocused && locationFilter) fetchFilteredStations();
    }, [isFocused, locationFilter, fetchFilteredStations]);

    useEffect(() => {
        if (isFocused && !locationFilter) {
            startLocationTracking();
        }
    }, [isFocused, locationFilter, startLocationTracking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    const filteredAndSortedStations = useMemo(() => {
        const FUEL_TYPE_TO_PRICE_KEY_MAP: Record<string, keyof DbStation> = {
            'Petrol': 'latest_pms_price',
            'Diesel': 'latest_ago_price',
            'Gas': 'latest_lpg_price',
            'Kerosine': 'latest_dpk_price',
        };

        let processedData = [...allStations];

        const minPrice = parseFloat(filters.priceRange.min);
        const maxPrice = parseFloat(filters.priceRange.max);
        const isPriceRangeActive = !isNaN(minPrice) || !isNaN(maxPrice);

        processedData = processedData.filter(station => {
            if (filters.fuelType) {
                const hasFuel = (station.products || []).includes(filters.fuelType);
                if (!hasFuel) return false;
            }

            if (isPriceRangeActive && filters.fuelType) {
                const priceKey = FUEL_TYPE_TO_PRICE_KEY_MAP[filters.fuelType];
                if (!priceKey) return true;

                const price = station[priceKey] as number | null;
                if (price == null) return false;

                const isAboveMin = isNaN(minPrice) || price >= minPrice;
                const isBelowMax = isNaN(maxPrice) || price <= maxPrice;

                if (!(isAboveMin && isBelowMax)) return false;
            }

            if (filters.rating > 0 && (station.average_rating || 0) < filters.rating) return false;

            if (filters.amenities.length > 0) {
                const stationAmenities = new Set(station.amenities || []);
                const hasAllAmenities = filters.amenities.every(required => stationAmenities.has(required));
                if (!hasAllAmenities) return false;
            }

            return true;
        });

        if (isPriceRangeActive && filters.fuelType && FUEL_TYPE_TO_PRICE_KEY_MAP[filters.fuelType]) {
            const fuelKey = FUEL_TYPE_TO_PRICE_KEY_MAP[filters.fuelType];
            processedData.sort((a, b) => (a[fuelKey] as number || 99999) - (b[fuelKey] as number || 99999));
        } else if (filters.sortBy === 'last_update') {
            processedData.sort((a, b) => new Date(b.last_updated_at || 0).getTime() - new Date(a.last_updated_at || 0).getTime());
        }

        return processedData;
    }, [allStations, filters]);

    const sectionedStations = useMemo(() => {
        const stationsSortedByDistance = [...filteredAndSortedStations].sort((a, b) => a.distance_meters - b.distance_meters);
        if (stationsSortedByDistance.length === 0) return [];
        const GROUP_INTERVAL_KM = 5;
        const groups: { [key: string]: DbStation[] } = {};
        stationsSortedByDistance.forEach(station => {
            const groupKey = Math.ceil(station.distance_meters / 1000 / GROUP_INTERVAL_KM) * GROUP_INTERVAL_KM;
            const finalGroupKey = groupKey === 0 ? GROUP_INTERVAL_KM : groupKey;
            const title = `Within ${finalGroupKey}km`;
            if (!groups[title]) groups[title] = [];
            groups[title].push(station);
        });
        return Object.keys(groups).map(title => ({ title, data: groups[title] }));
    }, [filteredAndSortedStations]);

    const getCombinedData = useCallback(() => {
        // 1. Data Validation: If no stations, just return what we have (empty or not)
        if (!sectionedStations || sectionedStations.length === 0) {
            return [];
        }

        // 2. Efficient Shallow Clone: We only need to clone the array structure, not the objects inside
        // logical structure: Array<{ title: string, data: Array<Station | Advert> }>
        const combined = sectionedStations.map(section => ({
            ...section,
            data: [...section.data] // Shallow copy of the data array so we can splice into it safely
        }));

        // 3. Ad Injection Logic
        // We want to inject ads into the FIRST section (usually "Within 5km")
        if (adverts.length > 0 && combined.length > 0) {
            const firstSection = combined[0];

            // Inject 1st Ad
            if (adverts[0]) {
                // If we have at least 2 stations, put it after the 2nd one.
                // Otherwise put it at the top or bottom.
                if (firstSection.data.length >= 2) {
                    firstSection.data.splice(2, 0, adverts[0]);
                } else {
                    // Less than 2 stations, just append it
                    firstSection.data.push(adverts[0]);
                }
            }

            // Inject 2nd Ad
            if (adverts[1]) {
                // If we have a second section (e.g. "Within 10km"), put it there
                if (combined.length > 1) {
                    const secondSection = combined[1];
                    // Insert at the top of 2nd section
                    secondSection.data.unshift(adverts[1]);
                }
                // Fallback: If only 1 section but it's long enough, put it further down (e.g. after index 6)
                else if (firstSection.data.length > 6) {
                    firstSection.data.splice(6, 0, adverts[1]);
                }
            }
        }

        return combined;
    }, [sectionedStations, adverts]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.fuelType) count++;
        if (filters.rating > 0) count++;
        if (filters.amenities.length > 0) count++;
        if (filters.priceRange.min || filters.priceRange.max) count++;
        return count;
    }, [filters]);

    return (
        <View style={styles.container}>
            {/* Premium Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Find Gas ⛽</Text>
                    {isTrackingLocation && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00c853' }} />
                            <Text style={{ fontSize: 12, color: '#00c853', fontWeight: '600' }}>Live</Text>
                        </View>
                    )}
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBarContainer}>
                        <Ionicons name="search" size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search stations or brands..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                            </Pressable>
                        )}
                    </View>
                    <Pressable onPress={() => router.push('/home')}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.mapButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="map" size={22} color="#fff" />
                        </LinearGradient>
                    </Pressable>
                </View>

                <View style={styles.buttonRow}>
                    <Pressable
                        style={[styles.chipButton, activeFiltersCount > 0 && styles.chipButtonActive]}
                        onPress={() => router.push('/filter')}
                    >
                        <Ionicons name="options" size={18} color={activeFiltersCount > 0 ? '#fff' : colors.text} />
                        <Text style={[styles.chipButtonText, activeFiltersCount > 0 && styles.chipButtonTextActive]}>
                            Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                        </Text>
                    </Pressable>

                    <Pressable style={styles.chipButton} onPress={() => setBrandsModalVisible(true)}>
                        <FyndFuelLogo size={18} color={colors.text} />
                        <Text style={styles.chipButtonText}>Brands</Text>
                    </Pressable>

                    <Pressable style={styles.locationBadge} onPress={startLocationTracking}>
                        <Ionicons name="location" size={16} color={colors.primary} />
                        <Text style={styles.locationBadgeText} numberOfLines={1}>
                            {locationFilter?.name || 'Set Location'}
                        </Text>
                        <Ionicons name="refresh" size={14} color={colors.primary} />
                    </Pressable>
                </View>
            </View>

            {/* Brands Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={brandsModalVisible}
                onRequestClose={() => setBrandsModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setBrandsModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={() => { }}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Popular Brands</Text>
                        <View style={styles.brandGrid}>
                            {POPULAR_BRANDS.map((brand) => (
                                <Pressable key={brand} style={styles.brandItem} onPress={() => handleBrandSelect(brand)}>
                                    <LinearGradient
                                        colors={['#667eea', '#764ba2']}
                                        style={styles.brandIconContainer}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <FyndFuelLogo size={24} color="#fff" />
                                    </LinearGradient>
                                    <Text style={styles.brandItemText}>{brand}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Content */}
            {isLoading ? (
                <View style={styles.centered}>
                    <LoadingAnimation message="Finding nearby stations..." size="large" />
                </View>
            ) : (
                <SectionList
                    sections={getCombinedData()}
                    keyExtractor={(item, index) => {
                        if ('type' in item && (item.type === 'banner' || item.type === 'card' || item.type === 'native' || item.type === 'video')) {
                            return `advert-${item.id}-${index}`;
                        }
                        return `station-${item.id}`;
                    }}
                    ListHeaderComponent={
                        <>
                            {/* Stats Bar */}
                            <View style={styles.statsBar}>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, styles.statValueHighlight]}>{filteredAndSortedStations.length}</Text>
                                    <Text style={styles.statLabel}>Stations</Text>
                                </View>
                                <View style={styles.statBoxDivider} />
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>
                                        {filteredAndSortedStations[0]?.distance_meters
                                            ? `${(filteredAndSortedStations[0].distance_meters / 1000).toFixed(1)}km`
                                            : '—'
                                        }
                                    </Text>
                                    <Text style={styles.statLabel}>Nearest</Text>
                                </View>
                                <View style={styles.statBoxDivider} />
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>50km</Text>
                                    <Text style={styles.statLabel}>Radius</Text>
                                </View>
                            </View>

                            <PriceSummary stations={filteredAndSortedStations} colors={colors} theme={theme} />

                            {lastLocationUpdate && (
                                <View style={styles.refreshHint}>
                                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                    <Text style={styles.refreshHintText}>
                                        Updated {lastLocationUpdate.toLocaleTimeString()} • Pull to refresh
                                    </Text>
                                </View>
                            )}
                        </>
                    }
                    renderSectionHeader={({ section: { title, data } }) => (
                        // Don't show header if section only contains ads (rare) or is generic
                        <DistanceHeader title={title} count={data.filter((d: any) => !d.type || d.type === 'station').length} colors={colors} theme={theme} />
                    )}
                    renderItem={({ item }) => {
                        if ('type' in item && (item.type === 'banner' || item.type === 'video' || item.type === 'native' || item.type === 'card')) {
                            return (
                                <View style={{ paddingHorizontal: 16 }}>
                                    <AdvertCard advert={item as Advert} />
                                </View>
                            );
                        }

                        // Default to 0 if distance is missing to avoid NaN
                        const distKm = item.distance_meters ? (item.distance_meters / 1000) : 0;

                        return (
                            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                                <StationCard
                                    station={{
                                        ...item,
                                        // Map fields to match StationCard expectations
                                        rating: item.average_rating || 0,
                                        review_count: 0, // Placeholder as review count isn't in search results yet
                                    }}
                                    onPress={() => router.push({ pathname: `/station/${item.id}`, params: { name: item.name } })}
                                    isFavourite={favouriteIds.has(item.id)}
                                    onToggleFavourite={() => handleToggleFavourite(item)}
                                />
                            </View>
                        );
                    }}
                    ListEmptyComponent={<EmptyState colors={colors} theme={theme} onRefresh={onRefresh} />}
                    contentContainerStyle={{ paddingBottom: 150 }}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                            title="Refreshing..."
                            titleColor={colors.textSecondary}
                        />
                    }
                />
            )}
        </View>
    );
}