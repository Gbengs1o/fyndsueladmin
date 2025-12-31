import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Keyboard,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GooglePlaceData, GooglePlaceDetail, GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RECENT_SEARCHES_KEY = '@fynd_fuel_recent_searches';
const MAX_RECENT_SEARCHES = 5;

// Types
type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

type RecentSearch = {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    timestamp: number;
};

type PopularPlace = {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
};

type AppColors = ReturnType<typeof useTheme>['colors'];

// Access the API key safely
const getApiKey = () => {
    // 1. Hardcoded fallback to the key that works in development (from .env)
    // This ensures that even if EAS environment variables are missing, the app has a working key.
    const DEV_KEY = "AIzaSyCHkNvB2RLbbyZT9YthpyVDxGSP4Z7qF9o";

    try {
        // Try process.env first (EAS Secrets / Local .env)
        const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (envKey && envKey.length > 20) return envKey;

        // Try Constants.expoConfig
        const config = Constants.expoConfig as any;
        const configKey = config?.android?.config?.googleMaps?.apiKey ||
            config?.ios?.config?.googleMaps?.apiKey ||
            config?.web?.config?.googleMaps?.apiKey ||
            config?.extra?.googleMapsApiKey;

        if (configKey && configKey.length > 20) return configKey;

        // Use the known good key if all else fails
        return DEV_KEY;
    } catch (e) {
        console.error("Error reading API Key:", e);
        return DEV_KEY;
    }
};

const GOOGLE_MAPS_API_KEY = getApiKey();

interface SearchBarProps {
    searchKey: number;
    setSearchKey: (value: number | ((prevVar: number) => number)) => void;
    currentRegion: Region | null;
    locationInfo: { city?: string; country?: string; countryCode?: string };
    onPlaceSelected: (region: Region) => void;
}

export default function SearchBar({ searchKey, setSearchKey, currentRegion, locationInfo, onPlaceSelected }: SearchBarProps) {
    const { colors, theme } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);

    // State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [expandedAddressId, setExpandedAddressId] = useState<string | null>(null);

    // Animation refs
    const modalSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const googleRef = useRef<any>(null);

    const placeholderText = locationInfo.city
        ? `Search in ${locationInfo.city}...`
        : 'Where to?';

    // Load recent searches on mount
    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        try {
            const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                setRecentSearches(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load recent searches:', e);
        }
    };

    const saveRecentSearch = async (search: RecentSearch) => {
        try {
            const filtered = recentSearches.filter(s => s.id !== search.id);
            const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
            setRecentSearches(updated);
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save recent search:', e);
        }
    };

    const clearRecentSearches = async () => {
        try {
            await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
            setRecentSearches([]);
        } catch (e) {
            console.error('Failed to clear recent searches:', e);
        }
    };

    // Query configuration
    const autocompleteQuery = useMemo(() => {
        const baseQuery = { key: GOOGLE_MAPS_API_KEY, language: 'en' };
        if (!currentRegion) return baseQuery;
        return {
            ...baseQuery,
            location: `${currentRegion.latitude},${currentRegion.longitude}`,
            radius: '50000',
            strictbounds: false
        };
    }, [currentRegion]);

    const handleOpenSearch = () => {
        setIsModalVisible(true);
        Animated.spring(modalSlide, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
        }).start();
    };

    const handleCloseSearch = useCallback(() => {
        Animated.timing(modalSlide, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setIsModalVisible(false);
            setSearchQuery('');
            setIsSearching(false);
            setIsSelecting(false);
            setSearchError(null);
            setExpandedAddressId(null);
            Keyboard.dismiss();
        });
    }, [modalSlide]);

    const handlePlaceSelect = (data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
        setSearchError(null);
        if (details?.geometry?.location) {
            setIsSelecting(true);
            const { lat, lng } = details.geometry.location;

            const newSearch: RecentSearch = {
                id: data.place_id || details.place_id,
                name: data.structured_formatting?.main_text || details.name || data.description,
                address: data.structured_formatting?.secondary_text || details.formatted_address || '',
                latitude: lat,
                longitude: lng,
                timestamp: Date.now(),
            };
            saveRecentSearch(newSearch);

            // Give the UI a moment to show the loader before closing
            setTimeout(() => {
                handleCloseSearch();
                setTimeout(() => {
                    onPlaceSelected({
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02
                    });
                    setSearchKey(prevKey => prevKey + 1);
                }, 300);
            }, 500);
        }
    };

    const handleRecentSearchPress = (search: RecentSearch) => {
        setIsSelecting(true);
        setTimeout(() => {
            handleCloseSearch();
            setTimeout(() => {
                onPlaceSelected({
                    latitude: search.latitude,
                    longitude: search.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02
                });
                setSearchKey(prevKey => prevKey + 1);
            }, 300);
        }, 500);
    };

    const handleClearInput = () => {
        if (googleRef.current) {
            googleRef.current.setAddressText('');
            setSearchQuery('');
            setIsSearching(false);
            setSearchError(null);
        }
    };

    // Toggle expanded address
    const toggleExpandAddress = (id: string) => {
        setExpandedAddressId(expandedAddressId === id ? null : id);
    };

    // Render recent search item
    const renderRecentItem = ({ item }: { item: RecentSearch }) => {
        const isExpanded = expandedAddressId === item.id;
        return (
            <TouchableOpacity
                style={styles.recentItem}
                onPress={() => handleRecentSearchPress(item)}
                onLongPress={() => toggleExpandAddress(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.recentIcon}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.recentTextContainer}>
                    <Text style={styles.recentName} numberOfLines={isExpanded ? undefined : 1}>{item.name}</Text>
                    <Text
                        style={styles.recentAddress}
                        numberOfLines={isExpanded ? undefined : 1}
                    >
                        {item.address}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
        );
    };

    // Custom row renderer for autosuggest
    const renderRow = (data: GooglePlaceData) => {
        const isExpanded = expandedAddressId === data.place_id;
        return (
            <View style={styles.suggestionRow}>
                <View style={[styles.suggestionIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="location" size={16} color={colors.primary} />
                </View>
                <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionMainText} numberOfLines={isExpanded ? undefined : 2}>
                        {data.structured_formatting?.main_text || data.description}
                    </Text>
                    {data.structured_formatting?.secondary_text && (
                        <Text style={styles.suggestionSecondaryText} numberOfLines={isExpanded ? undefined : 1}>
                            {data.structured_formatting.secondary_text}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => toggleExpandAddress(data.place_id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.chevronButton}
                >
                    <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    // Clear the renderPopularPlace since it's unused


    return (
        <>
            {/* Clean Search Trigger on Map */}
            <View style={styles.searchContainer}>
                <TouchableOpacity
                    style={styles.triggerButton}
                    activeOpacity={0.9}
                    onPress={handleOpenSearch}
                >
                    <View style={styles.searchIconWrapper}>
                        <Ionicons name="search" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.triggerText} numberOfLines={1}>
                        {placeholderText}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Modal */}
            <Modal
                visible={isModalVisible}
                animationType="none"
                transparent={true}
                onRequestClose={handleCloseSearch}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={handleCloseSearch}
                    />
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            { transform: [{ translateY: modalSlide }] }
                        ]}
                    >
                        <SafeAreaView style={styles.modalSafeArea}>
                            {/* Drag Handle */}
                            <View style={styles.dragHandle} />

                            {/* Header */}
                            <View style={[styles.modalHeader, { overflow: 'visible', zIndex: 1000 }]}>
                                <TouchableOpacity onPress={handleCloseSearch} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>

                                <View style={[styles.searchInputWrapper, { overflow: 'visible' }]}>
                                    <View style={styles.inputSearchIconContainer}>
                                        <Ionicons name="search" size={18} color={colors.textSecondary} />
                                    </View>
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={handleClearInput} style={styles.clearInputButton}>
                                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                    <View style={[styles.autocompleteWrapper, { overflow: 'visible' }]}>
                                        <GooglePlacesAutocomplete
                                            ref={googleRef}
                                            placeholder={placeholderText}
                                            fetchDetails={true}
                                            enablePoweredByContainer={false}
                                            minLength={2}
                                            debounce={300}
                                            onPress={handlePlaceSelect}
                                            onFail={(error) => {
                                                console.log("Search Error:", error);
                                                // More descriptive error for diagnostics
                                                setSearchError(error.toString() || "Unknown Search Error");
                                            }}
                                            query={autocompleteQuery}
                                            suppressDefaultStyles={true}
                                            textInputProps={{
                                                placeholderTextColor: colors.placeholder,
                                                autoFocus: true,
                                                onChangeText: (text) => {
                                                    setSearchQuery(text);
                                                    setIsSearching(text.length > 0);
                                                    setSearchError(null);
                                                },
                                            }}
                                            renderRow={renderRow}
                                            styles={{
                                                container: styles.autocompleteContainer,
                                                textInput: styles.textInput,
                                                textInputContainer: styles.textInputContainer,
                                                listView: styles.listView,
                                                row: styles.rowContainer,
                                                separator: styles.separator,
                                            }}
                                            renderLeftButton={() => <View />}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Loading Overlay when a place is selected */}
                            {isSelecting && (
                                <View style={styles.loaderOverlay}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={styles.loaderText}>Taking you there...</Text>
                                </View>
                            )}

                            {/* Content Area */}
                            {!isSearching && !isSelecting ? (
                                <ScrollView
                                    style={styles.modalContent}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* Recent Searches */}
                                    {recentSearches.length > 0 && (
                                        <View style={styles.section}>
                                            <View style={styles.sectionHeader}>
                                                <Text style={styles.sectionTitle}>Recent</Text>
                                                <TouchableOpacity onPress={clearRecentSearches}>
                                                    <Text style={styles.clearText}>Clear</Text>
                                                </TouchableOpacity>
                                            </View>
                                            {recentSearches.map((item) => (
                                                <View key={item.id}>
                                                    {renderRecentItem({ item })}
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Start State */}
                                    <View style={styles.startState}>
                                        <Ionicons name="search-outline" size={64} color={colors.border} />
                                        <Text style={styles.startTitle}>Find your fuel</Text>
                                        <Text style={styles.startSubtitle}>Search for any location or station</Text>
                                    </View>

                                    <View style={{ height: 40 }} />
                                </ScrollView>
                            ) : (
                                <View style={styles.activeResultsWrapper}>
                                    {/* GooglePlacesAutocomplete list will render here via absolute positioning from the header */}
                                </View>
                            )}
                        </SafeAreaView>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const getThemedStyles = (colors: AppColors, theme: string) => StyleSheet.create({
    // Trigger Button
    searchContainer: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 999,
    },
    triggerButton: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        paddingHorizontal: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
                shadowRadius: 12,
            },
            android: { elevation: 6 },
        }),
    },
    searchIconWrapper: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    triggerText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: colors.textSecondary,
        marginLeft: 12,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
    },
    modalContainer: {
        height: SCREEN_HEIGHT * 0.9,
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: { elevation: 20 },
        }),
    },
    modalSafeArea: {
        flex: 1,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0',
        borderRadius: 12,
        paddingLeft: 12,
        height: 46,
        overflow: 'visible', // CRITICAL for Android production builds to prevent clipping absolute children
    },
    inputSearchIconContainer: {
        marginLeft: 4,
        marginRight: 8,
    },
    clearInputButton: {
        position: 'absolute',
        right: 8,
        height: 46,
        width: 36,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    hiddenInput: {
        display: 'none',
    },
    autocompleteWrapper: {
        flex: 1,
    },
    autocompleteContainer: {
        flex: 1,
        zIndex: 100,
    },
    textInputContainer: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        paddingHorizontal: 0,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: 46,
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        margin: 0,
    },
    listView: {
        position: 'absolute',
        top: 48,
        left: -80,
        width: SCREEN_WIDTH - 24,
        backgroundColor: colors.card,
        borderRadius: 12,
        maxHeight: SCREEN_HEIGHT * 0.4,
        elevation: 10, // Higher elevation for Android
        zIndex: 5000, // Very high zIndex
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                backgroundColor: colors.card,
            }
        }),
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    rowContainer: {
        backgroundColor: 'transparent',
        padding: 0,
    },
    separator: {
        height: 1,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        marginLeft: 56,
    },

    // Suggestion Row
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    suggestionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    suggestionTextContainer: {
        flex: 1,
    },
    suggestionMainText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
        lineHeight: 18,
    },
    suggestionSecondaryText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    chevronButton: {
        padding: 4,
    },

    // Loader Overlay
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        zIndex: 2000,
    },
    loaderText: {
        marginTop: 12,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // Modal Content
    modalContent: {
        flex: 1,
        paddingTop: 16,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    clearText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },

    // Recent Item
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        borderRadius: 12,
        marginBottom: 8,
    },
    recentIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    recentTextContainer: {
        flex: 1,
    },
    recentName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    recentAddress: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 17,
    },

    // Start State
    startState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
        opacity: 0.6,
    },
    startTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
    },
    startSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? '#FF6B6B20' : '#FF6B6B15',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#FF6B6B',
        fontWeight: '500',
    },
    activeResultsWrapper: {
        flex: 1,
        paddingTop: 12,
    },
});