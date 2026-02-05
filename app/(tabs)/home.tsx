import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Keyboard, LayoutAnimation, Modal, Platform, Share, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import FilterControl from '../../components/home/FilterControl';
import InitialLoadingScreen from '../../components/home/InitialLoadingScreen';
import NearbyStationsList from '../../components/home/NearbyStationsList';
import SearchBar from '../../components/home/SearchBar';
import SubtleActivityIndicator from '../../components/home/SubtleActivityIndicator';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

interface Station {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    price?: number;
    fuel_type?: string;
    brand?: string;
}

// Exported type for favourite.tsx
export interface DbStation {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    brand?: string;
    logo_url?: string;
    rating?: number;
    review_count?: number;
}

export default function HomeScreen() {
    const { theme, colors } = useTheme();
    const { user } = useAuth();
    const mapRef = useRef<any>(null);
    const tabBarHeight = useBottomTabBarHeight();
    const router = useRouter();
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    // Animation values
    const fabScale = useRef(new Animated.Value(1)).current;
    const statsOpacity = useRef(new Animated.Value(0)).current;
    const popupSlide = useRef(new Animated.Value(300)).current;

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [stationGeoJSON, setStationGeoJSON] = useState<any>(null);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isTripModeActive, setTripModeActive] = useState(false);
    const [isTripLoading, setIsTripLoading] = useState(false);
    const [route, setRoute] = useState<{ geometry: any; bounds: any } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isFabMenuVisible, setIsFabMenuVisible] = useState(false);
    const [isLocationInfoVisible, setIsLocationInfoVisible] = useState(false); // NEW
    const [searchKey, setSearchKey] = useState(0);
    const [locationInfo, setLocationInfo] = useState<{
        area?: string;
        city?: string;
        countryCode?: string;
        fullAddress?: Location.LocationGeocodedAddress; // NEW
    }>({});
    const [filterTerm, setFilterTerm] = useState('');

    // New features
    const [isFollowMode, setIsFollowMode] = useState(false);
    const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
    const [heading, setHeading] = useState<number | null>(null);
    const [nearbyStationsCount, setNearbyStationsCount] = useState(0);
    const [trackedStationIds, setTrackedStationIds] = useState<Set<number>>(new Set());
    const [isTrackingLoading, setIsTrackingLoading] = useState(false);
    const [mapCenterDistance, setMapCenterDistance] = useState<number | null>(null);

    // Nearby stations list state
    const [isNearbyListVisible, setIsNearbyListVisible] = useState(false);
    const [nearbyStations, setNearbyStations] = useState<any[]>([]);

    // Premium color palette - with better light mode contrast
    const premiumColors = useMemo(() => ({
        gradient1: theme === 'dark' ? '#1a1a2e' : '#667eea',
        gradient2: theme === 'dark' ? '#16213e' : '#764ba2',
        accent: '#00d9ff',
        success: '#00c853',
        warning: '#ffab00',
        // Use solid backgrounds for better readability
        panelBg: theme === 'dark' ? 'rgba(30, 30, 50, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        panelBorder: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        glass: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        glassBorder: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    }), [theme]);

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        map: { flex: 1 },

        // Solid Control Panel - Single row layout (reverted)
        controlPanel: {
            position: 'absolute',
            bottom: tabBarHeight + 16,
            left: 16,
            right: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: premiumColors.panelBg,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: premiumColors.panelBorder,
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12,
                    shadowRadius: 16,
                },
                android: { elevation: 12 },
            }),
        },

        // Stats Display - compact for single row
        statsContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flex: 1,
        },
        // Nearby stat - tappable
        nearbyStatButton: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            gap: 6,
        },
        nearbyStatValue: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
        },
        nearbyStatLabel: {
            fontSize: 11,
            fontWeight: '500',
            color: colors.textSecondary,
        },
        // Location pin button
        locationPinButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        },

        // Control Buttons
        controlButtonsRow: {
            flexDirection: 'row',
            gap: 8,
        },
        controlButton: {
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            borderWidth: 1,
            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        },
        controlButtonActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },

        // FAB Button - Moved higher for better separation
        fabButton: {
            position: 'absolute',
            bottom: tabBarHeight + 140, // Increased from 100
            right: 16,
            width: 56, // Slightly smaller
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            ...Platform.select({
                ios: {
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                },
                android: { elevation: 10 },
            }),
        },

        // Modal Overlay with blur effect styling
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
        },
        menuContainer: {
            backgroundColor: colors.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: tabBarHeight + 24,
        },
        menuHandle: {
            width: 40,
            height: 4,
            backgroundColor: colors.border,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 20,
        },
        menuTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 20,
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderRadius: 16,
            marginBottom: 8,
            backgroundColor: premiumColors.glass,
        },
        menuItemIcon: {
            width: 48,
            height: 48,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
        },
        menuItemContent: {
            flex: 1,
        },
        menuItemTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        menuItemSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },

        // Station Popup - Premium Design
        popupContainer: {
            position: 'absolute',
            left: 16,
            right: 16,
            backgroundColor: colors.card,
            borderRadius: 24,
            overflow: 'hidden',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.2,
                    shadowRadius: 20,
                },
                android: { elevation: 15 },
            }),
        },
        popupGradient: {
            padding: 20,
        },
        popupHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
        },
        popupBrand: {
            fontSize: 12,
            fontWeight: '600',
            color: 'rgba(255,255,255,0.8)',
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        popupTitle: {
            fontSize: 22,
            fontWeight: '700',
            color: '#fff',
            marginTop: 4,
        },
        popupCloseButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        popupContent: {
            padding: 20,
            paddingTop: 0,
        },
        popupInfoRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
        },
        popupInfoIcon: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: premiumColors.glass,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        popupInfoText: {
            flex: 1,
            fontSize: 14,
            color: colors.text,
        },
        popupActions: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
        },
        popupActionButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            gap: 8,
        },
        popupActionPrimary: {
            backgroundColor: colors.primary,
        },
        popupActionSecondary: {
            backgroundColor: premiumColors.glass,
            borderWidth: 1,
            borderColor: colors.border,
        },
        popupActionText: {
            fontSize: 15,
            fontWeight: '600',
        },

        // Speed Indicator - solid background for visibility
        speedIndicator: {
            position: 'absolute',
            top: 130,
            left: 16,
            backgroundColor: premiumColors.panelBg,
            borderRadius: 18,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: premiumColors.panelBorder,
            alignItems: 'center',
            minWidth: 75,
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                },
                android: { elevation: 6 },
            }),
        },
        speedValue: {
            fontSize: 28,
            fontWeight: '800',
            color: colors.text,
            lineHeight: 32,
        },
        speedUnit: {
            fontSize: 11,
            fontWeight: '600',
            color: colors.textSecondary,
            marginTop: 2,
        },

        // Navigation Indicator - solid background
        navIndicator: {
            position: 'absolute',
            top: 110,
            alignSelf: 'center', // Center it
            backgroundColor: premiumColors.panelBg,
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: premiumColors.panelBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                },
                android: { elevation: 6 },
            }),
        },
        navIndicatorDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
        },
        navIndicatorText: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.text,
        },

        // Custom Marker
        markerContainer: {
            alignItems: 'center',
        },
        markerOuter: {
            width: 36,
            height: 36,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: '#fff',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                },
                android: { elevation: 4 },
            }),
        },
        markerSelected: {
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 4,
        },
        markerPulse: {
            position: 'absolute',
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.primary,
            opacity: 0.3,
        },
    }), [colors, tabBarHeight, premiumColors, theme]);

    // Live location tracking with follow mode
    useEffect(() => {
        let isMounted = true;

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted' || !isMounted) return;

                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 2000,
                        distanceInterval: 5,
                    },
                    (location) => {
                        // Guard against updates after unmount
                        if (!isMounted) return;

                        try {
                            const { latitude, longitude, speed, heading: newHeading } = location.coords;
                            setUserLocation({ latitude, longitude });

                            // Update speed (convert m/s to km/h)
                            if (speed !== null && speed >= 0) {
                                setCurrentSpeed(Math.round(speed * 3.6));
                            }

                            // Update heading
                            if (newHeading !== null && newHeading >= 0) {
                                setHeading(newHeading);
                            }

                            // If follow mode is active, pan map to user location
                            if (isFollowMode && mapRef.current) {
                                mapRef.current.animateToRegion({
                                    latitude,
                                    longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }, 500);
                            }
                        } catch (callbackError) {
                            console.warn('Location callback error:', callbackError);
                        }
                    }
                );
            } catch (error) {
                console.error('Location tracking error:', error);
            }
        };

        startLocationTracking();

        return () => {
            isMounted = false;
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }
        };
    }, [isFollowMode]);

    // Animate stats panel on mount
    useEffect(() => {
        Animated.timing(statsOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    // Animate popup when station selected
    useEffect(() => {
        if (selectedStation) {
            Animated.spring(popupSlide, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(popupSlide, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [selectedStation]);



    // Calculate nearby stations (within 20km)
    useEffect(() => {
        if (stationGeoJSON?.features && userLocation) {
            const nearby = stationGeoJSON.features
                .map((feature: any) => {
                    const [lon, lat] = feature.geometry.coordinates;
                    const distance = getDistance(userLocation.latitude, userLocation.longitude, lat, lon);
                    return { ...feature.properties, distance, latitude: lat, longitude: lon };
                })
                .filter((station: any) => station.distance <= 20) // Show stations within 20km
                .sort((a: any, b: any) => a.distance - b.distance);

            setNearbyStationsCount(nearby.length);
            setNearbyStations(nearby);
        }
    }, [stationGeoJSON, userLocation]);

    // Helper function to calculate distance
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };



    useEffect(() => {
        const fetchAllStations = async () => {
            console.log("[Home] Fetching stations..."); // DEBUG LOG
            setIsLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_stations_geojson');
                if (error) throw error;
                console.log("[Home] Stations fetched:", data ? "Success" : "Empty"); // DEBUG LOG
                setStationGeoJSON(data);
            } catch (err: any) {
                console.error("[Home] Error fetching stations:", err.message);
            } finally {
                console.log("[Home] Finished loading stations."); // DEBUG LOG
                setIsLoading(false);
            }
        };
        fetchAllStations();
    }, []);

    // Fetch user's tracked station IDs
    const fetchTrackedIds = useCallback(async () => {
        if (!user) { setTrackedStationIds(new Set()); return; }
        const { data } = await supabase.from('favourite_stations').select('station_id').eq('user_id', user.id);
        if (data) { setTrackedStationIds(new Set(data.map(f => f.station_id))); }
    }, [user]);

    useEffect(() => {
        fetchTrackedIds();
    }, [user, fetchTrackedIds]);

    // Toggle tracking a station
    const handleToggleTrack = async (stationId: number) => {
        if (!user) {
            Alert.alert("Login Required", "Please sign in to track stations.");
            return;
        }

        setIsTrackingLoading(true);
        const isCurrentlyTracked = trackedStationIds.has(stationId);

        try {
            if (isCurrentlyTracked) {
                await supabase.from('favourite_stations').delete().match({ user_id: user.id, station_id: stationId });
                setTrackedStationIds(prev => { const next = new Set(prev); next.delete(stationId); return next; });
            } else {
                await supabase.from('favourite_stations').insert({ user_id: user.id, station_id: stationId, notifications_enabled: true });
                setTrackedStationIds(prev => new Set(prev).add(stationId));
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
            fetchTrackedIds(); // Refresh on error
        } finally {
            setIsTrackingLoading(false);
        }
    };

    const updateLocationName = useCallback(async (latitude: number, longitude: number) => {
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (address) {
                // Heuristic for "Area": District -> Name (often building/place) -> Street
                const area = address.district || address.name || address.street || address.subregion;
                // Heuristic for "City": City -> Subregion -> Region
                const city = address.city || address.subregion || address.region;

                setLocationInfo({
                    area: area || city || 'Unknown Area',
                    city: city || address.country || undefined,
                    countryCode: address.isoCountryCode || undefined,
                    fullAddress: address // NEW
                });
            }
        } catch (error) {
            console.log("Could not reverse geocode:", error);
        }
    }, []);

    // Update location info when modal opens
    useEffect(() => {
        if (isLocationInfoVisible && userLocation) {
            updateLocationName(userLocation.latitude, userLocation.longitude);
        }
    }, [isLocationInfoVisible, userLocation, updateLocationName]);

    useEffect(() => {
        const setupInitialScreen = async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                let initialRegion: Region;
                if (status !== 'granted') {
                    initialRegion = { latitude: 6.5244, longitude: 3.3792, latitudeDelta: 0.1, longitudeDelta: 0.1 };
                } else {
                    const location = await Location.getLastKnownPositionAsync({}) || await Location.getCurrentPositionAsync({});
                    if (location) {
                        initialRegion = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
                        setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
                        checkAutoScan(location.coords.latitude, location.coords.longitude);
                        updateLocationName(location.coords.latitude, location.coords.longitude);
                    } else {
                        initialRegion = { latitude: 6.5244, longitude: 3.3792, latitudeDelta: 0.1, longitudeDelta: 0.1 };
                    }
                }
                setCurrentRegion(initialRegion);
            } catch (error) {
                console.error("Failed to setup initial screen:", error);
                const fallbackRegion = { latitude: 6.5244, longitude: 3.3792, latitudeDelta: 0.1, longitudeDelta: 0.1 };
                setCurrentRegion(fallbackRegion);
            }
        };
        setupInitialScreen();
    }, [updateLocationName]);

    const checkAutoScan = async (lat: number, lon: number) => {
        try {
            const lastScanDate = await AsyncStorage.getItem('last_auto_scan_date');
            const today = new Date().toDateString();

            if (lastScanDate !== today) {
                console.log("Auto-scanning for new day...");
                await checkAreaForStations(true, { latitude: lat, longitude: lon });
                await AsyncStorage.setItem('last_auto_scan_date', today);
            }
        } catch (error) {
            console.error("Auto-scan check failed:", error);
        }
    };

    const toggleFollowMode = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsFollowMode(!isFollowMode);

        if (!isFollowMode && userLocation) {
            mapRef.current?.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const recenterToMyLocation = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Required", "Please enable location services.");
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            mapRef.current?.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
            updateLocationName(latitude, longitude);
        } catch (error) {
            console.error("Failed to get current location:", error);
            Alert.alert("Error", "Could not get your current location.");
        }
    };

    const checkAreaForStations = async (silent = false, specificLocation?: { latitude: number; longitude: number }) => {
        const location = specificLocation || currentRegion;
        if (!location) return;

        setIsScanning(true);
        try {
            const { latitude, longitude } = location;

            const { data, error } = await supabase.functions.invoke('scan-area', {
                body: { lat: latitude, lon: longitude }
            });

            if (error) throw error;

            if (data?.status === 'scanned') {
                const { data: stationData, error: stationError } = await supabase.rpc('get_stations_geojson');
                if (stationError) throw stationError;
                setStationGeoJSON(stationData);

                if (!silent) {
                    Alert.alert("✨ Scan Complete", data.message || `Found ${data.count} new stations.`);
                }
            } else if (data?.status === 'cached') {
                if (!silent) {
                    Alert.alert("ℹ️ Info", data.message || "This area has already been scanned recently.");
                }
            }
        } catch (error: any) {
            console.error("Scan failed:", error);
            if (!silent) {
                Alert.alert("Scan Failed", error.message || "Could not scan area.");
            }
        } finally {
            setIsScanning(false);
        }
    };

    const handleStationPress = (feature: any) => {
        const properties = feature.properties;
        const coordinates = feature.geometry.coordinates;

        const station: Station = {
            id: properties.id,
            name: properties.name,
            latitude: coordinates[1],
            longitude: coordinates[0],
            address: properties.address,
            price: properties.price,
            fuel_type: properties.fuel_type,
            brand: properties.brand,
        };

        setSelectedStation(station);
        mapRef.current?.animateToRegion({
            latitude: station.latitude,
            longitude: station.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
        }, 500);
    };

    const handleMapPress = () => {
        if (selectedStation) setSelectedStation(null);
        Keyboard.dismiss();
    };

    const handleSuggestStation = () => {
        setIsFabMenuVisible(false);
        router.push('/addStation');
    };

    const handleApplyFilter = (term: string) => {
        setFilterTerm(term);
    };

    const handlePlaceSelected = (region: Region) => {
        mapRef.current?.animateToRegion(region, 1000);
        setCurrentRegion(region);
        updateLocationName(region.latitude, region.longitude);
    };

    const animateFab = () => {
        Animated.sequence([
            Animated.timing(fabScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(fabScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setIsFabMenuVisible(true);
    };

    if (!currentRegion) {
        return <InitialLoadingScreen message="Finding your location..." />;
    }

    const renderMarkers = () => {
        if (!stationGeoJSON || !stationGeoJSON.features) return null;

        const filteredFeatures = filterTerm
            ? stationGeoJSON.features.filter((feature: any) => {
                const brand = feature.properties.brand || feature.properties.name || '';
                return brand.toLowerCase().includes(filterTerm.toLowerCase());
            })
            : stationGeoJSON.features;

        return filteredFeatures.map((feature: any, index: number) => {
            const coordinates = feature.geometry.coordinates;
            const properties = feature.properties;
            const key = properties.id ? `station-${properties.id}` : `marker-${index}`;
            const isSelected = selectedStation?.id === properties.id;

            return (
                <Marker
                    key={key}
                    coordinate={{
                        latitude: coordinates[1],
                        longitude: coordinates[0],
                    }}
                    onPress={() => handleStationPress(feature)}
                    tracksViewChanges={false}
                >
                    <View style={styles.markerContainer}>
                        {isSelected && <View style={styles.markerPulse} />}
                        <View style={[
                            styles.markerOuter,
                            { backgroundColor: colors.primary },
                            isSelected && styles.markerSelected,
                            isSelected && { backgroundColor: premiumColors.accent }
                        ]}>
                            <MaterialCommunityIcons
                                name="gas-station"
                                size={isSelected ? 22 : 18}
                                color="#fff"
                            />
                        </View>
                    </View>
                </Marker>
            );
        });
    };

    const renderRoute = () => {
        if (!isTripModeActive || !route || !route.geometry || !route.geometry.coordinates) return null;

        const coordinates = route.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
        }));

        return (
            <Polyline
                coordinates={coordinates}
                strokeColor={premiumColors.accent}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
            />
        );
    };

    const isMoving = currentSpeed !== null && currentSpeed > 5;

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={currentRegion}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={false}
                followsUserLocation={isFollowMode}
                clusterColor={colors.primary}
                clusterTextColor="#ffffff"
                animationEnabled={true}
                layoutAnimationConf={{
                    duration: 500,
                    update: {
                        type: LayoutAnimation.Types.spring,
                    },
                }}
                onRegionChangeComplete={(region) => {
                    // Calculate distance from map center to user location
                    if (userLocation && !isFollowMode) {
                        const dist = getDistance(userLocation.latitude, userLocation.longitude, region.latitude, region.longitude);
                        setMapCenterDistance(dist);
                    } else {
                        setMapCenterDistance(null);
                    }
                }}
            >
                {renderMarkers()}
                {renderRoute()}
            </MapView>



            {/* Search Bar */}
            <SearchBar
                searchKey={searchKey}
                setSearchKey={setSearchKey}
                currentRegion={currentRegion}
                locationInfo={locationInfo}
                onPlaceSelected={handlePlaceSelected}
            />

            {/* Filter Control */}
            <FilterControl filterTerm={filterTerm} onApplyFilter={handleApplyFilter} />

            {/* Distance/Speed Indicator */}
            {isFollowMode ? (
                // Follow Mode: Show speed - Only if moving (> 1 km/h)
                currentSpeed !== null && currentSpeed > 1 && (
                    <View style={styles.speedIndicator}>
                        <Text style={styles.speedValue}>{currentSpeed}</Text>
                        <Text style={styles.speedUnit}>km/h</Text>
                    </View>
                )
            ) : (
                // Pan/Zoom Mode: Show distance from user to map center
                mapCenterDistance !== null && mapCenterDistance > 0.1 && (
                    <View style={[styles.speedIndicator, { minWidth: 90 }]}>
                        <Text style={styles.speedValue}>
                            {mapCenterDistance < 1
                                ? Math.round(mapCenterDistance * 1000)
                                : mapCenterDistance.toFixed(1)}
                        </Text>
                        <Text style={styles.speedUnit}>
                            {mapCenterDistance < 1 ? 'm away' : 'km away'}
                        </Text>
                    </View>
                )
            )}

            {/* Navigation Status Indicator */}
            {isFollowMode && (
                <View style={styles.navIndicator}>
                    <View style={[
                        styles.navIndicatorDot,
                        { backgroundColor: isMoving ? premiumColors.success : premiumColors.warning }
                    ]} />
                    <Text style={styles.navIndicatorText}>
                        {isMoving ? 'Navigating' : 'Stationary'}
                    </Text>
                </View>
            )}

            {/* Premium Control Panel - Single Row Layout */}
            <Animated.View style={[styles.controlPanel, { opacity: statsOpacity }]}>
                {/* Stats Container: Location Pin + Nearby Stat */}
                <View style={styles.statsContainer}>
                    {/* Location Pin Button */}
                    <TouchableOpacity
                        style={styles.locationPinButton}
                        activeOpacity={0.7}
                        onPress={() => setIsLocationInfoVisible(true)}
                    >
                        <Ionicons name="location-sharp" size={22} color={colors.primary} />
                    </TouchableOpacity>

                    {/* Tappable Nearby Stations */}
                    <TouchableOpacity
                        style={styles.nearbyStatButton}
                        activeOpacity={0.7}
                        onPress={() => setIsNearbyListVisible(true)}
                    >
                        <Text style={styles.nearbyStatValue}>{nearbyStationsCount}</Text>
                        <Text style={styles.nearbyStatLabel}>NEARBY</Text>
                    </TouchableOpacity>
                </View>

                {/* Control Buttons */}
                <View style={styles.controlButtonsRow}>
                    <TouchableOpacity
                        style={[styles.controlButton, isFollowMode && styles.controlButtonActive]}
                        onPress={toggleFollowMode}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isFollowMode ? "navigate" : "navigate-outline"}
                            size={20}
                            color={isFollowMode ? '#fff' : colors.primary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={recenterToMyLocation}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="locate" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* FAB Button with Animation */}
            <Animated.View style={[styles.fabButton, { transform: [{ scale: fabScale }] }]}>
                <TouchableOpacity onPress={animateFab} activeOpacity={0.8} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    <LinearGradient
                        colors={[premiumColors.gradient1, premiumColors.gradient2]}
                        style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="add" size={32} color="#ffffff" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Nearby Stations List Modal */}
            <NearbyStationsList
                visible={isNearbyListVisible}
                stations={nearbyStations}
                onClose={() => setIsNearbyListVisible(false)}
                onStationPress={(station) => {
                    handleStationPress({
                        geometry: { coordinates: [station.longitude, station.latitude] },
                        properties: station
                    });
                    // Center map on station
                    mapRef.current?.animateToRegion({
                        latitude: station.latitude,
                        longitude: station.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }}
            />

            {/* Premium FAB Menu Modal */}
            <Modal
                visible={isFabMenuVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsFabMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsFabMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.menuContainer}>
                                <View style={styles.menuHandle} />
                                <Text style={styles.menuTitle}>Quick Actions</Text>

                                <TouchableOpacity style={styles.menuItem} onPress={() => {
                                    setIsFabMenuVisible(false);
                                    checkAreaForStations();
                                }}>
                                    <LinearGradient
                                        colors={['#667eea', '#764ba2']}
                                        style={styles.menuItemIcon}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="scan" size={24} color="#fff" />
                                    </LinearGradient>
                                    <View style={styles.menuItemContent}>
                                        <Text style={styles.menuItemTitle}>Scan Area</Text>
                                        <Text style={styles.menuItemSubtitle}>Find missing stations nearby</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={handleSuggestStation}>
                                    <LinearGradient
                                        colors={['#f093fb', '#f5576c']}
                                        style={styles.menuItemIcon}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </LinearGradient>
                                    <View style={styles.menuItemContent}>
                                        <Text style={styles.menuItemTitle}>Suggest Station</Text>
                                        <Text style={styles.menuItemSubtitle}>Add a new fuel station</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={toggleFollowMode}>
                                    <LinearGradient
                                        colors={['#4facfe', '#00f2fe']}
                                        style={styles.menuItemIcon}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name={isFollowMode ? "navigate" : "navigate-outline"} size={24} color="#fff" />
                                    </LinearGradient>
                                    <View style={styles.menuItemContent}>
                                        <Text style={styles.menuItemTitle}>{isFollowMode ? 'Stop Following' : 'Follow Mode'}</Text>
                                        <Text style={styles.menuItemSubtitle}>Map follows your movement</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Premium Station Popup */}
            {selectedStation && (
                <Animated.View
                    style={[
                        styles.popupContainer,
                        {
                            bottom: tabBarHeight + 100,
                            transform: [{ translateY: popupSlide }]
                        }
                    ]}
                >
                    <LinearGradient
                        colors={[premiumColors.gradient1, premiumColors.gradient2]}
                        style={styles.popupGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.popupHeader}>
                            <View>
                                <Text style={styles.popupBrand}>{selectedStation.brand || 'Fuel Station'}</Text>
                                <Text style={styles.popupTitle} numberOfLines={1}>{selectedStation.name}</Text>
                            </View>
                            <TouchableOpacity style={styles.popupCloseButton} onPress={() => setSelectedStation(null)}>
                                <Ionicons name="close" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    <View style={styles.popupContent}>
                        <View style={styles.popupInfoRow}>
                            <View style={styles.popupInfoIcon}>
                                <Ionicons name="location" size={18} color={colors.primary} />
                            </View>
                            <Text style={styles.popupInfoText} numberOfLines={2}>
                                {selectedStation.address || 'Address not available'}
                            </Text>
                        </View>

                        {selectedStation.price && (
                            <View style={styles.popupInfoRow}>
                                <View style={styles.popupInfoIcon}>
                                    <MaterialCommunityIcons name="fuel" size={18} color={colors.primary} />
                                </View>
                                <Text style={styles.popupInfoText}>
                                    ₦{selectedStation.price}/L • {selectedStation.fuel_type || 'PMS'}
                                </Text>
                            </View>
                        )}

                        <View style={styles.popupActions}>
                            {/* Track Button */}
                            <TouchableOpacity
                                style={[
                                    styles.popupActionButton,
                                    trackedStationIds.has(selectedStation.id)
                                        ? { backgroundColor: '#00c853', borderColor: '#00c853' }
                                        : styles.popupActionSecondary
                                ]}
                                onPress={() => handleToggleTrack(selectedStation.id)}
                                disabled={isTrackingLoading}
                            >
                                <Ionicons
                                    name={trackedStationIds.has(selectedStation.id) ? "bookmark" : "bookmark-outline"}
                                    size={18}
                                    color={trackedStationIds.has(selectedStation.id) ? '#fff' : colors.primary}
                                />
                                <Text style={[styles.popupActionText, { color: trackedStationIds.has(selectedStation.id) ? '#fff' : colors.primary }]}>
                                    {trackedStationIds.has(selectedStation.id) ? 'Tracking' : 'Track'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.popupActionButton, styles.popupActionPrimary]}
                                onPress={() => router.push(`/station/${selectedStation.id}`)}
                            >
                                <Ionicons name="eye" size={18} color="#fff" />
                                <Text style={[styles.popupActionText, { color: '#fff' }]}>Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}

            {/* Location Detail Modal */}
            <Modal
                visible={isLocationInfoVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsLocationInfoVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsLocationInfoVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menuContainer, { paddingBottom: 40 }]}>
                                <View style={styles.menuHandle} />
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{
                                        width: 50, height: 50, borderRadius: 16, backgroundColor: premiumColors.glass,
                                        justifyContent: 'center', alignItems: 'center', marginRight: 16
                                    }}>
                                        <Ionicons name="location" size={28} color={colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Current Location</Text>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Your precise whereabouts</Text>
                                    </View>
                                </View>

                                {/* Map Snippet / Coords */}
                                <View style={{
                                    height: 120, borderRadius: 20, overflow: 'hidden', marginBottom: 24,
                                    backgroundColor: premiumColors.glass, borderWidth: 1, borderColor: premiumColors.glassBorder
                                }}>
                                    {/* Placeholder for Mini Map - keeping it lightweight for now */}
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'dark' ? '#222' : '#f0f0f0' }}>
                                        <MaterialCommunityIcons name="map-marker-radius" size={40} color={colors.primary} style={{ opacity: 0.8 }} />
                                        <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                                            {userLocation ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}` : 'Location Unavailable'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Full Address Details */}
                                <View style={{ gap: 16 }}>
                                    {locationInfo.fullAddress ? (
                                        <>
                                            {/* Full Street Address */}
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                <Ionicons name="home" size={20} color={colors.textSecondary} style={{ width: 30, marginTop: 2 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Full Address</Text>
                                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                                        {[
                                                            locationInfo.fullAddress.streetNumber,
                                                            locationInfo.fullAddress.street,
                                                            locationInfo.fullAddress.name
                                                        ].filter(Boolean).join(' ') || locationInfo.area || 'Unknown Address'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ height: 1, backgroundColor: colors.border }} />

                                            {/* District / City */}
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                <Ionicons name="map" size={20} color={colors.textSecondary} style={{ width: 30, marginTop: 2 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>District / City</Text>
                                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                                        {[locationInfo.fullAddress.district, locationInfo.fullAddress.city, locationInfo.fullAddress.subregion].filter(Boolean).join(', ') || locationInfo.city || 'Unknown City'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ height: 1, backgroundColor: colors.border }} />

                                            {/* Region / Country + Postal Code */}
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                <Ionicons name="earth" size={20} color={colors.textSecondary} style={{ width: 30, marginTop: 2 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Region / Country</Text>
                                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                                        {[locationInfo.fullAddress.region, locationInfo.fullAddress.country].filter(Boolean).join(', ')}
                                                        {locationInfo.fullAddress.postalCode && (
                                                            <Text style={{ fontWeight: '400', color: colors.textSecondary }}>{`  (${locationInfo.fullAddress.postalCode})`}</Text>
                                                        )}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Timezone if available */}
                                            {locationInfo.fullAddress.timezone && (
                                                <>
                                                    <View style={{ height: 1, backgroundColor: colors.border }} />
                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                        <Ionicons name="time" size={20} color={colors.textSecondary} style={{ width: 30, marginTop: 2 }} />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Timezone</Text>
                                                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                                                {locationInfo.fullAddress.timezone}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: colors.textSecondary }}>Fetching full address details...</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Share Button */}
                                {userLocation && (
                                    <TouchableOpacity
                                        style={{
                                            marginTop: 24,
                                            backgroundColor: colors.primary,
                                            paddingVertical: 14,
                                            borderRadius: 16,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                        onPress={async () => {
                                            try {
                                                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${userLocation.latitude},${userLocation.longitude}`;
                                                await Share.share({
                                                    message: `Check out my location: ${mapUrl}`,
                                                    url: mapUrl,
                                                    title: 'My Location'
                                                });
                                            } catch (error) {
                                                console.error('Share failed:', error);
                                            }
                                        }}
                                    >
                                        <Ionicons name="share-outline" size={20} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Share Location</Text>
                                    </TouchableOpacity>
                                )}

                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <SubtleActivityIndicator visible={isLoading || isTripLoading || isScanning} />
        </View>
    );
}