// File: app/(tabs)/addStation.tsx
// Suggest Station Page - Clean, natural design

import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import FyndFuelLogo from '../../components/icons/FyndFuelLogo';
import LoadingAnimation, { InlineLoader } from '../../components/LoadingAnimation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    Constants.expoConfig?.ios?.config?.googleMaps?.apiKey ||
    Constants.expoConfig?.web?.config?.googleMaps?.apiKey || '';

interface GooglePlace {
    place_id: string;
    name: string;
    vicinity: string;
}

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function AddStationScreen() {
    const { theme, colors } = useTheme();
    const { user } = useAuth();
    const mapRef = useRef<MapView>(null);
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);

    const [region, setRegion] = useState<Region | null>(null);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [distanceToPin, setDistanceToPin] = useState<number>(0);
    const [address, setAddress] = useState('');
    const [stationName, setStationName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GooglePlace[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const formAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required.');
                setIsLoadingLocation(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation(location);
            setRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
            reverseGeocode(location.coords.latitude, location.coords.longitude);
            setIsLoadingLocation(false);

            Animated.timing(formAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        })();
    }, []);

    const reverseGeocode = async (latitude: number, longitude: number) => {
        try {
            const result = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (result.length > 0) {
                const { street, name, city, region, country } = result[0];
                const formattedAddress = [name, street, city, region, country].filter(Boolean).join(', ');
                setAddress(formattedAddress);
            }
        } catch (error) {
            console.log("Reverse geocode error", error);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const onRegionDidChange = async (newRegion: Region) => {
        setRegion(newRegion);
        if (userLocation) {
            const dist = calculateDistance(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                newRegion.latitude,
                newRegion.longitude
            );
            setDistanceToPin(dist);
        }
        reverseGeocode(newRegion.latitude, newRegion.longitude);
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}&types=establishment`
            );
            const data = await response.json();
            if (data.status === 'OK') {
                setSearchResults(data.predictions.map((p: any) => ({
                    place_id: p.place_id,
                    name: p.structured_formatting.main_text,
                    vicinity: p.structured_formatting.secondary_text,
                })));
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectPlace = async (place: GooglePlace) => {
        setSearchQuery(place.name);
        setSearchResults([]);
        setShowSearch(false);
        setStationName(place.name);

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();

            if (data.status === 'OK') {
                const { lat, lng } = data.result.geometry.location;
                const newRegion = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                mapRef.current?.animateToRegion(newRegion, 800);
                setRegion(newRegion);
                reverseGeocode(lat, lng);
            }
        } catch (error) {
            console.error("Place details error:", error);
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your photos to upload a station image.');
            return;
        }

        Alert.alert(
            "Add Photo",
            "Choose a source",
            [
                {
                    text: "Camera",
                    onPress: async () => {
                        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
                        if (cameraStatus.status !== 'granted') {
                            Alert.alert('Permission Denied', 'Camera access is required.');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.5
                        });
                        if (!result.canceled) setSelectedImage(result.assets[0]);
                    }
                },
                {
                    text: "Gallery",
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.5
                        });
                        if (!result.canceled) setSelectedImage(result.assets[0]);
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const uploadImage = async () => {
        if (!user || !selectedImage) return null;
        try {
            const { uri, mimeType } = selectedImage;
            const fileExt = mimeType?.split('/')[1] || 'jpg';
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();

            const { error: uploadError } = await supabase.storage
                .from('stations')
                .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('stations').getPublicUrl(fileName);
            return publicUrl;
        } catch (error) {
            console.error("Upload Error:", error);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!stationName.trim()) {
            Alert.alert("Missing Info", "Please enter a station name.");
            return;
        }
        if (!region) {
            Alert.alert("No Location", "Please select a location.");
            return;
        }
        if (distanceToPin > 200) {
            Alert.alert("Too Far", "You must be within 200m of the station.");
            return;
        }
        if (!user) {
            Alert.alert("Sign In Required", "Please sign in to suggest a station.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign In", onPress: () => router.push('/(auth)/signIn') }
            ]);
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrl = null;
            if (selectedImage) {
                imageUrl = await uploadImage();
                if (!imageUrl) {
                    Alert.alert("Upload Failed", "Failed to upload image. Continue without image?", [
                        { text: "No", onPress: () => { setIsSubmitting(false); return; }, style: 'cancel' },
                        { text: "Yes", onPress: () => { } }
                    ]);
                }
            }

            const { error } = await supabase
                .from('suggested_fuel_stations')
                .insert([{
                    name: stationName,
                    latitude: region.latitude,
                    longitude: region.longitude,
                    address: address,
                    submitted_by: user.id,
                    status: 'pending',
                    image_url: imageUrl
                }]);

            if (error) throw error;

            Alert.alert(
                "Submitted!",
                "Your suggestion is under review. Thanks for contributing!",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to submit.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isWithinRange = distanceToPin <= 200;
    const canSubmit = !isSubmitting && isWithinRange && stationName.trim().length > 0;

    if (isLoadingLocation) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingAnimation message="Getting location..." size="medium" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Map */}
            <View style={styles.mapContainer}>
                {region && (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={region}
                        onRegionChangeComplete={onRegionDidChange}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                    />
                )}

                {/* Center Pin */}
                <View style={styles.pinContainer}>
                    <View style={[styles.pinCircle, !isWithinRange && styles.pinCircleInvalid]}>
                        <FyndFuelLogo size={20} color="#fff" />
                    </View>
                    <View style={[styles.pinTail, !isWithinRange && styles.pinTailInvalid]} />
                </View>

                {/* Back Button */}
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color={colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for a place..."
                            placeholderTextColor={colors.placeholder}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            onFocus={() => setShowSearch(true)}
                        />
                        {isSearching && <InlineLoader size={16} />}
                        {searchQuery && !isSearching && (
                            <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </Pressable>
                        )}
                    </View>

                    {showSearch && searchResults.length > 0 && (
                        <View style={styles.resultsList}>
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.place_id}
                                renderItem={({ item }) => (
                                    <Pressable style={styles.resultItem} onPress={() => selectPlace(item)}>
                                        <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                                        <View style={styles.resultContent}>
                                            <Text style={styles.resultName}>{item.name}</Text>
                                            <Text style={styles.resultAddress} numberOfLines={1}>{item.vicinity}</Text>
                                        </View>
                                    </Pressable>
                                )}
                                keyboardShouldPersistTaps="handled"
                            />
                        </View>
                    )}
                </View>

                {/* Distance Indicator */}
                <View style={[styles.distanceBadge, !isWithinRange && styles.distanceBadgeInvalid]}>
                    <Ionicons
                        name={isWithinRange ? "checkmark-circle" : "warning"}
                        size={14}
                        color={isWithinRange ? colors.success : colors.destructive}
                    />
                    <Text style={[styles.distanceText, !isWithinRange && styles.distanceTextInvalid]}>
                        {Math.round(distanceToPin)}m {isWithinRange ? '✓' : '(max 200m)'}
                    </Text>
                </View>
            </View>

            {/* Form */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formWrapper}>
                <Animated.View style={[styles.formContainer, { opacity: formAnim }]}>
                    <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.formTitle}>Suggest a Station</Text>
                        <Text style={styles.formSubtitle}>Help others find fuel nearby</Text>

                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Station Name</Text>
                            <View style={styles.inputBox}>
                                <FyndFuelLogo size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Total, MRS, Conoil"
                                    placeholderTextColor={colors.placeholder}
                                    value={stationName}
                                    onChangeText={setStationName}
                                />
                            </View>
                        </View>

                        {/* Address */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Address</Text>
                            <View style={styles.addressBox}>
                                <Ionicons name="location" size={18} color={colors.primary} />
                                <Text style={styles.addressText} numberOfLines={2}>
                                    {address || "Move the map to select"}
                                </Text>
                            </View>
                        </View>

                        {/* Image Picker */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Station Photo (Optional)</Text>
                            <Pressable style={styles.imagePicker} onPress={handlePickImage}>
                                {selectedImage ? (
                                    <View style={styles.imagePreviewContainer}>
                                        <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                                        <Pressable style={styles.removeImage} onPress={(e) => { e.stopPropagation(); setSelectedImage(null); }}>
                                            <Ionicons name="close-circle" size={24} color={colors.destructive} />
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                                        <Text style={styles.imagePlaceholderText}>Add a photo of the station</Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>

                        {/* Warning */}
                        {!isWithinRange && (
                            <View style={styles.warningBox}>
                                <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                                <Text style={styles.warningText}>
                                    Move closer to the station. You're {Math.round(distanceToPin)}m away (max 200m).
                                </Text>
                            </View>
                        )}

                        {/* Submit */}
                        <Pressable
                            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                        >
                            {isSubmitting ? (
                                <InlineLoader color="#fff" size={20} />
                            ) : (
                                <>
                                    <Ionicons name="add-circle" size={20} color="#fff" />
                                    <Text style={styles.submitButtonText}>Submit</Text>
                                </>
                            )}
                        </Pressable>

                        <Text style={styles.noteText}>
                            Suggestions are reviewed before appearing in the app.
                        </Text>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const getThemedStyles = (colors: AppColors, theme: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },

    // Map
    mapContainer: {
        height: '45%',
        position: 'relative',
    },
    map: {
        flex: 1,
    },

    // Pin
    pinContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -18,
        marginTop: -44,
        alignItems: 'center',
    },
    pinCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
            android: { elevation: 4 },
        }),
    },
    pinCircleInvalid: {
        backgroundColor: colors.destructive,
    },
    pinTail: {
        width: 3,
        height: 12,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },
    pinTailInvalid: {
        backgroundColor: colors.destructive,
    },

    // Back
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },

    // Search
    searchContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 68,
        right: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 14,
        color: colors.text,
    },
    resultsList: {
        backgroundColor: colors.card,
        marginTop: 4,
        borderRadius: 10,
        maxHeight: 180,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    resultContent: {
        flex: 1,
    },
    resultName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    resultAddress: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 1,
    },

    // Distance
    distanceBadge: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    distanceBadgeInvalid: {
        borderColor: colors.destructive,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    distanceText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.success,
    },
    distanceTextInvalid: {
        color: colors.destructive,
    },

    // Form
    formWrapper: {
        flex: 1,
    },
    formContainer: {
        flex: 1,
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -16,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: colors.border,
    },
    formContent: {
        padding: 20,
        paddingBottom: 40,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    formSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
        marginBottom: 20,
    },

    // Inputs
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 6,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        gap: 10,
    },
    input: {
        flex: 1,
        height: 44,
        fontSize: 15,
        color: colors.text,
    },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.primaryOpaque,
        borderRadius: 10,
        padding: 12,
        gap: 10,
    },
    addressText: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        lineHeight: 18,
    },
    imagePicker: {
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        height: 150,
        overflow: 'hidden',
    },
    imagePreviewContainer: {
        flex: 1,
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImage: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.card,
        borderRadius: 12,
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    imagePlaceholderText: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // Warning
    warningBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: colors.destructive,
        lineHeight: 18,
    },

    // Submit
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 10,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // Note
    noteText: {
        textAlign: 'center',
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 16,
    },
});