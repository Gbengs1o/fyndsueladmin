import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface Station {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    price?: number;
    fuel_type?: string;
    brand?: string;
    distance?: number; // Calculated distance
}

interface NearbyStationsListProps {
    visible: boolean;
    stations: Station[];
    onClose: () => void;
    onStationPress: (station: Station) => void;
}

export default function NearbyStationsList({
    visible,
    stations,
    onClose,
    onStationPress,
}: NearbyStationsListProps) {
    const { colors, theme } = useTheme();

    const renderItem = ({ item }: { item: Station }) => (
        <TouchableOpacity
            style={[styles.itemContainer, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
            onPress={() => {
                onStationPress(item);
                onClose();
            }}
        >
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="gas-station" size={24} color={colors.primary} />
            </View>
            <View style={styles.infoContainer}>
                <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.stationAddress, { color: colors.textSecondary }]} numberOfLines={1}>{item.address || 'No address available'}</Text>

                <View style={styles.metaContainer}>
                    <View style={styles.metaItem}>
                        <Ionicons name="navigate" size={12} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {item.distance ? `${item.distance.toFixed(1)} km` : 'Near'}
                        </Text>
                    </View>
                    {item.price && (
                        <View style={styles.metaItem}>
                            <Ionicons name="pricetag" size={12} color={colors.success} />
                            <Text style={[styles.metaText, { color: colors.success }]}>
                                ${item.price}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.container, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: colors.text }]}>Nearby Stations</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                {stations.length} stations found within 20km
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* List */}
                    <FlatList
                        data={stations}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No stations found nearby.</Text>
                            </View>
                        }
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        width: '100%',
        height: '60%', // Takes up bottom 60% of screen
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
            },
            android: { elevation: 20 },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
        marginRight: 8,
    },
    stationName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    stationAddress: {
        fontSize: 13,
        marginBottom: 8,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
});
