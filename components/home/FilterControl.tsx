import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

interface FilterControlProps {
    filterTerm: string;
    onApplyFilter: (term: string) => void;
}

export default function FilterControl({ filterTerm, onApplyFilter }: FilterControlProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [tempFilterTerm, setTempFilterTerm] = useState(filterTerm);

    const handleOpen = () => { setTempFilterTerm(filterTerm); setModalVisible(true); };
    const handleApply = () => { onApplyFilter(tempFilterTerm); setModalVisible(false); };
    const handleClear = () => { setTempFilterTerm(''); onApplyFilter(''); setModalVisible(false); };

    return (
        <>
            <TouchableOpacity style={styles.filterButton} onPress={handleOpen}>
                <MaterialCommunityIcons name={filterTerm ? "filter" : "filter-outline"} size={24} color={colors.text} />
            </TouchableOpacity>
            <Modal transparent={true} visible={isModalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
                        <Text style={styles.modalTitle}>Filter by Brand</Text>
                        <TextInput style={styles.modalInput} placeholder="e.g., Conoil, Total, Shell..." placeholderTextColor={colors.placeholder} value={tempFilterTerm} onChangeText={setTempFilterTerm} autoFocus={true} />
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={[styles.modalButton, styles.clearButton]} onPress={handleClear}><Text style={styles.clearButtonText}>Clear Filter</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.applyButton]} onPress={handleApply}><Text style={styles.applyButtonText}>Apply</Text></TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    filterButton: { position: 'absolute', top: 120, right: 15, backgroundColor: colors.card, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5, zIndex: 10 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay },
    modalContent: { width: '85%', backgroundColor: colors.card, borderRadius: 16, padding: 20, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: colors.text },
    modalInput: { width: '100%', height: 44, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 20, fontSize: 16, color: colors.text, backgroundColor: colors.background },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    clearButton: { backgroundColor: colors.border, marginRight: 10 },
    clearButtonText: { color: colors.text, fontWeight: '600', fontSize: 16 },
    applyButton: { backgroundColor: colors.primary },
    applyButtonText: { color: colors.primaryText, fontWeight: '600', fontSize: 16 },
});