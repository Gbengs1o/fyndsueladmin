// File: app/locationSearch.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, FlatList, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useDebounce } from '../../hooks/useDebounce';
import { FontAwesome } from '@expo/vector-icons';
import { useFilterStore } from '../../stores/useFilterStore';

// --- THEME IMPORTS ---
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/Colors';

type LocationResult = { name: string; state: string; country: string; lat: number; lon: number; };
type ThemeColors = typeof Colors.light | typeof Colors.dark;

export default function LocationSearchScreen() {
    // --- THEME HOOKS ---
    const { theme } = useTheme();
    const colors: ThemeColors = Colors[theme];
    const styles = useMemo(() => getThemedStyles(colors), [colors]);

    // --- EXISTING STATE & LOGIC (UNCHANGED) ---
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<LocationResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const debouncedQuery = useDebounce(query, 500);
    const router = useRouter();
    const setLocation = useFilterStore((state) => state.setLocation);

    useEffect(() => {
        if (debouncedQuery.length > 2) {
            const searchLocations = async () => {
                setIsLoading(true);
                const URL = `https://nominatim.openstreetmap.org/search?q=${debouncedQuery}, Nigeria&format=json&limit=10&addressdetails=1`;
                try {
                    const response = await fetch(URL);
                    const data = await response.json();
                    const formattedData = data.map((item: any) => ({
                        name: item.address.city || item.address.town || item.address.village || item.display_name.split(',')[0],
                        state: item.address.state || item.display_name.split(',').slice(1).join(', ').trim(),
                        country: 'Nigeria',
                        lat: parseFloat(item.lat),
                        lon: parseFloat(item.lon)
                    }));
                    setResults(formattedData);
                } catch (error) { Alert.alert('Error', 'Could not fetch locations.'); }
                finally { setIsLoading(false); }
            };
            searchLocations();
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const handleUseMyLocation = async () => {
        setIsGettingLocation(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Cannot get your location without permission.");
            setIsGettingLocation(false);
            return;
        }
        try {
            const location = await Location.getCurrentPositionAsync({});
            setLocation({
                name: 'My Current Location',
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            router.back();
        } catch (error) {
            Alert.alert("Error", "Could not fetch your current location.");
        } finally {
            setIsGettingLocation(false);
        }
    };
    
    // --- THEMED RENDER ---
    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{ 
                    title: 'Select Location',
                    headerStyle: { backgroundColor: colors.cardBackground },
                    headerTintColor: colors.text,
                    headerTitleStyle: { color: colors.text },
                }}
            />
            <View style={styles.searchBarContainer}>
                <FontAwesome name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="Search for a city or state..." 
                    placeholderTextColor={colors.textSecondary}
                    value={query} 
                    onChangeText={setQuery} 
                    autoFocus={true} 
                />
            </View>

            <Pressable style={styles.myLocationButton} onPress={handleUseMyLocation} disabled={isGettingLocation}>
                {isGettingLocation ? (
                    <ActivityIndicator color={colors.primary} />
                ) : (
                    <>
                        <FontAwesome name="location-arrow" size={18} color={colors.primary} />
                        <Text style={styles.myLocationButtonText}>Use My Current Location</Text>
                    </>
                )}
            </Pressable>

            {isLoading && !isGettingLocation && <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />}
            
            <FlatList
                data={results}
                keyExtractor={(item) => `${item.lat}${item.lon}`}
                renderItem={({ item }) => (
                    <Pressable 
                        style={styles.resultItem} 
                        onPress={() => { 
                            setLocation({ name: item.name, latitude: item.lat, longitude: item.lon }); 
                            router.back(); 
                        }}
                    >
                        <Text style={styles.resultName}>{item.name}</Text>
                        <Text style={styles.resultState}>{item.state}</Text>
                    </Pressable>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {debouncedQuery.length > 2 ? 'No results found.' : 'Start typing to search for a location.'}
                        </Text>
                    </View>
                }
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
}

// --- THEMED STYLESHEET ---
const getThemedStyles = (colors: ThemeColors) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.background,
    },
    searchBarContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: colors.cardBackground, 
        borderRadius: 10, 
        paddingHorizontal: 10, 
        marginHorizontal: 15, 
        marginTop: 15,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    searchIcon: { 
        marginRight: 10,
    },
    searchInput: { 
        flex: 1, 
        height: 45, 
        fontSize: 16,
        color: colors.text,
    },
    myLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBorder,
        marginTop: 10,
    },
    myLocationButtonText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 10,
    },
    resultItem: { 
        paddingVertical: 15, 
        paddingHorizontal: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.cardBorder,
    },
    resultName: { 
        fontSize: 16, 
        fontWeight: 'bold',
        color: colors.text,
    },
    resultState: { 
        fontSize: 14, 
        color: colors.textSecondary, 
        marginTop: 2,
    },
    emptyContainer: { 
        flex: 1, 
        paddingTop: 50, 
        alignItems: 'center',
    },
    emptyText: { 
        color: colors.textSecondary,
    },
});