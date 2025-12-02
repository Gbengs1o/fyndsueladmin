import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, LayoutAnimation, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import InitialLoadingScreen from '../../components/home/InitialLoadingScreen';
import StationInfoPopup from '../../components/home/StationInfoPopup';
import SubtleActivityIndicator from '../../components/home/SubtleActivityIndicator';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

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
}

export default function HomeScreen() {
    const { theme, colors } = useTheme();
    const mapRef = useRef<MapView>(null);
    const tabBarHeight = useBottomTabBarHeight();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [stationGeoJSON, setStationGeoJSON] = useState<any>(null);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
    const [isTripModeActive, setTripModeActive] = useState(false);
    const [isTripLoading, setIsTripLoading] = useState(false);
    const [route, setRoute] = useState<{ geometry: any; bounds: any } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isFabMenuVisible, setIsFabMenuVisible] = useState(false);

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        map: { flex: 1 },
        locationButton: {
            position: 'absolute',
            bottom: tabBarHeight + 20,
            right: 20,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.card,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            zIndex: 10,
        },
        fabButton: {
            position: 'absolute',
            bottom: tabBarHeight + 80,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
            zIndex: 10,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
        },
        menuContainer: {
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: tabBarHeight + 20,
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        menuText: {
            fontSize: 16,
            color: colors.text,
            marginLeft: 15,
            fontWeight: '500',
        },
    }), [colors, tabBarHeight]);

    useEffect(() => {
        const fetchAllStations = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_stations_geojson');
                if (error) throw error;
                setStationGeoJSON(data);
            } catch (err: any) {
                console.error("Error fetching stations:", err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllStations();
    }, []);

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
                        initialRegion = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 };

                        // Trigger Auto-Scan if needed
                        checkAutoScan(location.coords.latitude, location.coords.longitude);
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
    }, []);

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
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
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
            console.log("Scanning area:", latitude, longitude);

            const { data, error } = await supabase.functions.invoke('scan-area', {
                body: { lat: latitude, lon: longitude }
            });

            if (error) throw error;

            console.log("Scan result:", data);

            if (data?.status === 'scanned') {
                // Refetch stations to update map
                const { data: stationData, error: stationError } = await supabase.rpc('get_stations_geojson');
                if (stationError) throw stationError;
                setStationGeoJSON(stationData);

                if (!silent) {
                    Alert.alert("Scan Complete", data.message || `Found ${data.count} new stations.`);
                }
            } else if (data?.status === 'cached') {
                if (!silent) {
                    Alert.alert("Info", data.message || "This area has already been scanned recently.");
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
        };

        setSelectedStation(station);
        mapRef.current?.animateToRegion({
            latitude: station.latitude,
            longitude: station.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 500);
    };

    const handleMapPress = () => {
        if (selectedStation) setSelectedStation(null);
        Keyboard.dismiss();
    };

    const handleAddStation = () => {
        setIsFabMenuVisible(false);
        router.push('/addStation');
    };

    if (!currentRegion) {
        return <InitialLoadingScreen message="Finding your location..." />;
    }

    // Convert GeoJSON features to Marker components
    const renderMarkers = () => {
        if (!stationGeoJSON || !stationGeoJSON.features) return null;

        return stationGeoJSON.features.map((feature: any, index: number) => {
            const coordinates = feature.geometry.coordinates;
            const properties = feature.properties;

            // Ensure unique key
            const key = properties.id ? `station-${properties.id}` : `marker-${index}`;

            return (
                <Marker
                    key={key}
                    coordinate={{
                        latitude: coordinates[1],
                        longitude: coordinates[0],
                    }}
                    onPress={() => handleStationPress(feature)}
                    tracksViewChanges={false} // Optimization
                >
                    <View style={{
                        backgroundColor: selectedStation?.id === properties.id ? '#007AFF' : colors.primary,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    }} />
                </Marker>
            );
        });
    };

    // Convert route geometry (LineString) to Polyline coordinates
    const renderRoute = () => {
        if (!isTripModeActive || !route || !route.geometry || !route.geometry.coordinates) return null;

        const coordinates = route.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
        }));

        return (
            <Polyline
                coordinates={coordinates}
                strokeColor={colors.primary}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
            />
        );
    };

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
                clusterColor={colors.primary}
                clusterTextColor="#ffffff"
                animationEnabled={true}
                layoutAnimationConf={{
                    springDamping: 0.5,
                    duration: 500,
                    update: {
                        type: LayoutAnimation.Types.spring,
                        springDamping: 0.5,
                    },
                }}
            >
                {renderMarkers()}
                {renderRoute()}
            </MapView>

            {/* FAB Button */}
            <TouchableOpacity
                style={styles.fabButton}
                onPress={() => setIsFabMenuVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color="#ffffff" />
            </TouchableOpacity>

            {/* Location Button */}
            <TouchableOpacity style={styles.locationButton} onPress={recenterToMyLocation} activeOpacity={0.7}>
                <Ionicons name="locate" size={24} color={colors.primary} />
            </TouchableOpacity>

            {/* FAB Menu Modal */}
            <Modal
                visible={isFabMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsFabMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsFabMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.menuContainer}>
                                <TouchableOpacity style={styles.menuItem} onPress={() => {
                                    setIsFabMenuVisible(false);
                                    checkAreaForStations();
                                }}>
                                    <Ionicons name="scan-circle" size={28} color={colors.primary} />
                                    <Text style={styles.menuText}>Scan Area for Missing Stations</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={handleAddStation}>
                                    <Ionicons name="add-circle" size={28} color={colors.primary} />
                                    <Text style={styles.menuText}>Add Station Manually</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <StationInfoPopup station={selectedStation} onClose={() => setSelectedStation(null)} tabBarHeight={tabBarHeight} />
            <SubtleActivityIndicator visible={isLoading || isTripLoading || isScanning} />
        </View>
    );
}