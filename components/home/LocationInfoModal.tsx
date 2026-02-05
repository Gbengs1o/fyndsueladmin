import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LocationInfoModalProps {
    visible: boolean;
    onClose: () => void;
    locationInfo: {
        address?: Location.LocationGeocodedAddress;
        latitude?: number;
        longitude?: number;
        heading?: number | null;
        speed?: number | null;
    };
}

export default function LocationInfoModal({
    visible,
    onClose,
    locationInfo,
}: LocationInfoModalProps) {
    const { colors, theme } = useTheme();

    const handleShare = async () => {
        if (!locationInfo.latitude || !locationInfo.longitude) return;

        try {
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${locationInfo.latitude},${locationInfo.longitude}`;
            await Share.share({
                message: `Check out my current location: ${mapUrl}`,
                url: mapUrl, // iOS
                title: 'My Location' // Android
            });
        } catch (error) {
            console.error(error);
        }
    };

    const formatCoordinate = (coord?: number) => coord ? coord.toFixed(6) : '---';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.centeredView}>
                    <Pressable
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme === 'dark' ? 'rgba(30,30,40,0.95)' : 'rgba(255,255,255,0.98)',
                                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }
                        ]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header Image / Map Placeholder */}
                        <View style={styles.mapPlaceholder}>
                            <MaterialCommunityIcons name="map-marker-radius" size={48} color={colors.primary} />
                            <Text style={[styles.youAreHereText, { color: colors.primary }]}>You are here</Text>
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                            {/* Address Section */}
                            <View style={styles.section}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>CURRENT ADDRESS</Text>
                                <Text style={[styles.addressText, { color: colors.text }]}>
                                    {locationInfo.address ? (
                                        <>
                                            {locationInfo.address.name && <Text>{locationInfo.address.name}{'\n'}</Text>}
                                            {locationInfo.address.street && <Text>{locationInfo.address.street}{'\n'}</Text>}
                                            {locationInfo.address.city}, {locationInfo.address.region} {locationInfo.address.postalCode}
                                        </>
                                    ) : (
                                        "Fetching address..."
                                    )}
                                </Text>
                            </View>

                            {/* Coordinates Grid */}
                            <View style={styles.grid}>
                                <View style={[styles.gridItem, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>LATITUDE</Text>
                                    <Text style={[styles.gridValue, { color: colors.text }]}>{formatCoordinate(locationInfo.latitude)}</Text>
                                </View>
                                <View style={[styles.gridItem, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>LONGITUDE</Text>
                                    <Text style={[styles.gridValue, { color: colors.text }]}>{formatCoordinate(locationInfo.longitude)}</Text>
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                    onPress={handleShare}
                                >
                                    <Ionicons name="share-outline" size={20} color="#fff" />
                                    <Text style={styles.actionButtonText}>Share Location</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                    onPress={onClose}
                                >
                                    <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        width: '100%',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: { elevation: 15 },
        }),
    },
    mapPlaceholder: {
        height: 120,
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    youAreHereText: {
        marginTop: 8,
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    addressText: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 26,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    gridItem: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
    },
    gridLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 14,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    closeButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
});
