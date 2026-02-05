import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function AddStationScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const mapRef = useRef<MapView>(null);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [distanceToUser, setDistanceToUser] = useState(0);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                setIsLoadingLocation(false);
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };
            setUserLocation(coords);
            setLocation(coords);
            setIsLoadingLocation(false);

            // Auto-fill address
            fetchAddress(coords.latitude, coords.longitude);
        })();
    }, []);

    const fetchAddress = async (lat: number, lon: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
                {
                    headers: {
                        'User-Agent': 'FyndFuelApp/1.0', // Required by OSM
                    },
                }
            );
            const data = await response.json();
            if (data && data.display_name) {
                setAddress(data.display_name);
            }
        } catch (error) {
            console.error('Error fetching address:', error);
        }
    };

    const handleMapPress = (e: any) => {
        const newCoords = e.nativeEvent.coordinate;
        setLocation(newCoords);
        calculateDistance(newCoords);
        fetchAddress(newCoords.latitude, newCoords.longitude);
    };

    const calculateDistance = (targetCoords: { latitude: number; longitude: number }) => {
        if (!userLocation) return;

        const R = 6371e3; // metres
        const φ1 = (userLocation.latitude * Math.PI) / 180;
        const φ2 = (targetCoords.latitude * Math.PI) / 180;
        const Δφ = ((targetCoords.latitude - userLocation.latitude) * Math.PI) / 180;
        const Δλ = ((targetCoords.longitude - userLocation.longitude) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c; // in metres
        setDistanceToUser(d);
    };

    const handleSubmit = async () => {
        if (!name || !address || !location) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        if (distanceToUser > 200) {
            Alert.alert('Too Far', 'You must be within 200 meters of the station to add it.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            const { data, error } = await supabase
                .from('stations')
                .insert({
                    name,
                    address,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    is_verified: false,
                    created_by_user: true,
                    origin_type: 'user_manual',
                    user_id: userData.user.id,
                })
                .select()
                .single();

            if (error) throw error;

            Alert.alert('Success', 'Station added successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        // Navigate to the new station page (assuming route exists)
                        // Or go back
                        if (data && data.id) {
                            // router.replace(`/station/${data.id}`); // Assuming this route exists
                            router.back(); // Fallback for now to be safe
                        } else {
                            router.back();
                        }
                    },
                },
            ]);
        } catch (error: any) {
            console.error('Error adding station:', error);
            Alert.alert('Error', error.message || 'Could not add station.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isGeofenceValid = distanceToUser <= 200;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: colors.background }}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Add New Station</Text>
                </View>

                <View style={styles.form}>
                    <Text style={[styles.label, { color: colors.text }]}>Station Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g. Shell Gas Station"
                        placeholderTextColor={colors.text + '80'}
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={[styles.label, { color: colors.text }]}>Address</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                        placeholder="Address"
                        placeholderTextColor={colors.text + '80'}
                        value={address}
                        onChangeText={setAddress}
                        multiline
                    />

                    <Text style={[styles.label, { color: colors.text }]}>Location</Text>
                    <View style={styles.mapContainer}>
                        {isLoadingLocation ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : location ? (
                            <MapView
                                ref={mapRef}
                                style={styles.map}
                                provider={PROVIDER_GOOGLE}
                                initialRegion={{
                                    latitude: location.latitude,
                                    longitude: location.longitude,
                                    latitudeDelta: 0.005,
                                    longitudeDelta: 0.005,
                                }}
                                onPress={handleMapPress}
                            >
                                <Marker coordinate={location} />
                                {userLocation && (
                                    <Marker
                                        coordinate={userLocation}
                                        pinColor="blue"
                                        title="You are here"
                                    />
                                )}
                            </MapView>
                        ) : (
                            <Text style={{ color: colors.text }}>Could not get location.</Text>
                        )}
                    </View>

                    <Text style={[
                        styles.helperText,
                        { color: isGeofenceValid ? colors.primary : 'red' }
                    ]}>
                        {isGeofenceValid
                            ? `Within range (${Math.round(distanceToUser)}m)`
                            : `Too far! Move closer to the station (${Math.round(distanceToUser)}m > 200m)`}
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            { backgroundColor: isGeofenceValid ? colors.primary : '#ccc' }
                        ]}
                        onPress={handleSubmit}
                        disabled={!isGeofenceValid || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Station</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 40,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    form: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
    },
    mapContainer: {
        height: 200,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    helperText: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'right',
    },
    submitButton: {
        height: 55,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
