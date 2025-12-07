import Constants from 'expo-constants';
import React, { useMemo } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTheme } from '../../context/ThemeContext';

// Local Region type definition
type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

type AppColors = ReturnType<typeof useTheme>['colors'];

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.android?.config?.googleMaps?.apiKey || Constants.expoConfig?.ios?.config?.googleMaps?.apiKey || Constants.expoConfig?.web?.config?.googleMaps?.apiKey || Constants.expoConfig?.extra?.googleMapsApiKey;

interface SearchBarProps {
    searchKey: number;
    setSearchKey: (value: number | ((prevVar: number) => number)) => void;
    currentRegion: Region | null;
    locationInfo: { city?: string; country?: string; countryCode?: string };
    onPlaceSelected: (region: Region) => void;
}

export default function SearchBar({ searchKey, setSearchKey, currentRegion, locationInfo, onPlaceSelected }: SearchBarProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);

    const placeholderText = locationInfo.city 
        ? `Search within ${locationInfo.city}` 
        : 'Search current city';

    // Logic strictly for "City" search (Radius 50km)
    const autocompleteQuery = useMemo(() => {
        const baseQuery = { key: GOOGLE_MAPS_API_KEY, language: 'en' };
        
        if (!currentRegion) return baseQuery;

        return { 
            ...baseQuery, 
            location: `${currentRegion.latitude},${currentRegion.longitude}`, 
            radius: '50000',
            strictbounds: false // Set to true if you want to strictly restrict to this radius
        };
    }, [currentRegion]);

    return (
        <View style={styles.searchContainer}>
            <View style={styles.autocompleteContainer}>
                <GooglePlacesAutocomplete
                    key={searchKey} 
                    placeholder={placeholderText} 
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                        if (details?.geometry?.location) {
                            const { lat, lng } = details.geometry.location;
                            onPlaceSelected({ latitude: lat, longitude: lng, latitudeDelta: 0.1, longitudeDelta: 0.1 });
                            Keyboard.dismiss();
                            setSearchKey(prevKey => prevKey + 1);
                        }
                    }}
                    query={autocompleteQuery}
                    styles={{
                        container: { flex: 1 },
                        textInput: styles.searchInput,
                        listView: styles.listView,
                        row: { backgroundColor: colors.card },
                        description: { color: colors.text },
                        separator: { backgroundColor: colors.border },
                    }}
                    textInputProps={{ placeholderTextColor: colors.placeholder }}
                />
            </View>
        </View>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    searchContainer: { 
        position: 'absolute', 
        top: 60, 
        left: 15, 
        right: 15, 
        flexDirection: 'row', 
        alignItems: 'center', 
        zIndex: 10 
    },
    autocompleteContainer: { 
        flex: 1 
    },
    searchInput: { 
        height: 48, 
        fontSize: 16, 
        backgroundColor: colors.card, 
        // Updated radius to be rounded on all sides
        borderRadius: 12,
        borderWidth: 1, 
        borderColor: colors.border, 
        shadowColor: colors.shadow, 
        shadowOffset: { width: 2, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 4, 
        elevation: 5, 
        color: colors.text 
    },
    listView: { 
        backgroundColor: colors.card, 
        borderRadius: 12, 
        marginTop: 4, 
        borderWidth: 1, 
        borderColor: colors.border 
    },
});