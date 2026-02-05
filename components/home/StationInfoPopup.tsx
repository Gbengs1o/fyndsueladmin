import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

interface Station {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
}

interface StationInfoPopupProps {
    station: Station | null;
    onClose: () => void;
    tabBarHeight: number;
}

export default function StationInfoPopup({ station, onClose, tabBarHeight }: StationInfoPopupProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const router = useRouter();

    if (!station) {
        return null;
    }

    return (
        <View style={[styles.popupContainer, { bottom: tabBarHeight + 10 }]}>
            <Text style={styles.popupTitle} numberOfLines={1}>{station.name || 'Unnamed Station'}</Text>
            <Text style={styles.popupAddress} numberOfLines={1}>{station.address || 'Address not available'}</Text>
            <View style={styles.popupButtonsContainer}>
                <TouchableOpacity style={[styles.popupButton, styles.closeButton]} onPress={onClose}>
                    <Text style={[styles.popupButtonText, { color: colors.text }]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.popupButton, styles.viewButton]} onPress={() => router.push(`/station/${station.id}`)}>
                    <Text style={styles.popupButtonText}>View Station</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    popupContainer: { position: 'absolute', left: 20, right: 20, padding: 20, backgroundColor: colors.card, borderRadius: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
    popupTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4, textAlign: 'center' },
    popupAddress: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
    popupButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    popupButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    viewButton: { backgroundColor: colors.primary },
    closeButton: { backgroundColor: colors.border },
    popupButtonText: { fontSize: 16, fontWeight: '600', color: colors.primaryText },
});