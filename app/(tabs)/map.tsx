// File: app/map.tsx

import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

// --- MAP STYLES (Same as home.tsx) ---
const darkMapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#242f3e" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#746855" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#242f3e" }]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#263c3f" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#6b9a76" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#38414e" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#212a37" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9ca5b3" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#746855" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#1f2835" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#f3d19c" }]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{ "color": "#2f3948" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#17263c" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#515c6d" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#17263c" }]
    }
];

const lightMapStyle = [];

interface Station {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    price?: number;
    address?: string;
}

export default function MapScreen() {
    const { theme, colors } = useTheme();
    const isDarkMode = theme === 'dark';
    const mapRef = useRef<MapView>(null);

    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [stations, setStations] = useState<Station[]>([]);
    const [routeCoordinates, setRouteCoordinates] = useState<any>(null);
    const [routeDistance, setRouteDistance] = useState<string>('');
    const [routeDuration, setRouteDuration] = useState<string>('');
    const [isRouting, setIsRouting] = useState(false);
    const [destinationQuery, setDestinationQuery] = useState('');
    const [isNavigating, setIsNavigating] = useState(false);

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        map: { flex: 1 },
        searchContainer: {
            position: 'absolute',
            top: 60,
            left: 20,
            right: 20,
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
            zIndex: 10,
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        input: {
            flex: 1,
            marginLeft: 10,
            fontSize: 16,
            color: colors.text,
        },
        routeInfoContainer: {
            position: 'absolute',
            bottom: 40,
            left: 20,
            right: 20,
            backgroundColor: colors.card,
            padding: 16,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
        },
        routeStats: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 16,
        },
        statItem: {
            alignItems: 'center',
        },
        statValue: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
        },
        statLabel: {
            fontSize: 12,
            color: colors.textSecondary,
        },
        startButton: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
        },
        startButtonText: {
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
        },
        stopButton: {
            backgroundColor: '#E53935',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 10,
        },
    });

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation(location);
        })();
    }, []);

    const fetchRoute = async (destLat: number, destLng: number) => {
        if (!userLocation) return;

        setIsRouting(true);
        try {
            const startLat = userLocation.coords.latitude;
            const startLng = userLocation.coords.longitude;

            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`
            );
            const data = await response.json();

            if (data.code === 'Ok' && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map((coord: number[]) => ({
                    latitude: coord[1],
                    longitude: coord[0],
                }));

                setRouteCoordinates(coordinates);
                setRouteDistance((route.distance / 1000).toFixed(1) + ' km');
                setRouteDuration(Math.round(route.duration / 60) + ' min');

                // Fit to route
                mapRef.current?.fitToCoordinates(coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });

                fetchStationsNearby(destLat, destLng);
            }
        } catch (error) {
            console.error("Routing error:", error);
            Alert.alert("Error", "Failed to calculate route");
        } finally {
            setIsRouting(false);
        }
    };

    const fetchStationsNearby = async (lat: number, lng: number) => {
        try {
            const { data, error } = await supabase
                .rpc('get_nearby_stations', {
                    lat,
                    long: lng,
                    radius_meters: 5000
                });

            if (error) throw error;
            if (data) setStations(data);
        } catch (error) {
            console.error("Error fetching stations:", error);
        }
    };

    const handleSearch = async () => {
        if (!destinationQuery.trim()) return;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationQuery)}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                fetchRoute(lat, lng);
            } else {
                Alert.alert("Not Found", "Could not find location");
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.inputRow}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={styles.input}
                        placeholder="Where to? (e.g. Central Park)"
                        placeholderTextColor={colors.textSecondary}
                        value={destinationQuery}
                        onChangeText={setDestinationQuery}
                        onSubmitEditing={handleSearch}
                    />
                    {isRouting && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                customMapStyle={isDarkMode ? darkMapStyle : lightMapStyle}
                initialRegion={{
                    latitude: userLocation?.coords.latitude || 0,
                    longitude: userLocation?.coords.longitude || 0,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                {routeCoordinates && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={colors.primary}
                        strokeWidth={5}
                        lineCap="round"
                        lineJoin="round"
                    />
                )}

                {stations.map((station) => (
                    <Marker
                        key={station.id}
                        coordinate={{
                            latitude: station.latitude,
                            longitude: station.longitude,
                        }}
                        title={station.name}
                        description={station.address}
                    >
                        <View style={{
                            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                            padding: 8,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: colors.primary,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}>
                            <FontAwesome name="gas-pump" size={16} color={colors.primary} />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {routeCoordinates && (
                <View style={styles.routeInfoContainer}>
                    <View style={styles.routeStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{routeDistance}</Text>
                            <Text style={styles.statLabel}>Distance</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{routeDuration}</Text>
                            <Text style={styles.statLabel}>Duration</Text>
                        </View>
                    </View>

                    {!isNavigating ? (
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => setIsNavigating(true)}
                        >
                            <Text style={styles.startButtonText}>Start Navigation</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.stopButton}
                            onPress={() => {
                                setIsNavigating(false);
                                setRouteCoordinates(null);
                                setDestinationQuery('');
                            }}
                        >
                            <Text style={styles.startButtonText}>End Navigation</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}