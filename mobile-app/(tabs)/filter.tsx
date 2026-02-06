import { FontAwesome, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useFilterStore, AMENITIES, PAYMENT_METHODS, ALL_PRODUCTS } from '../../stores/useFilterStore';

type AppColors = ReturnType<typeof useTheme>['colors'];

const amenityIcons: { [key: string]: React.ReactElement } = {
    'Supermarket': <FontAwesome name="shopping-cart" size={32} />, 'Restaurant': <FontAwesome name="cutlery" size={32} />,
    'Membership Required': <MaterialIcons name="card-membership" size={32} />, 'Car Wash': <FontAwesome name="car" size={32} />,
    'ATM': <FontAwesome name="bank" size={32} />, 'Cash Discount': <FontAwesome name="money" size={32} />,
    'Air Pump': <MaterialCommunityIcons name="air-filter" size={32} />, 'Restrooms': <FontAwesome name="group" size={32} />,
    'Oil': <MaterialCommunityIcons name="oil" size={32} />, 'Full Service': <MaterialIcons name="miscellaneous-services" size={32} />,
    'Car Repairs': <FontAwesome name="wrench" size={32} />, 'Open 24/7': <MaterialCommunityIcons name="clock-time-twelve-outline" size={32} />,
    'Power': <FontAwesome name="bolt" size={32} />,
};

const RatingBlock = ({ ratingValue, selectedRating, onSelect, colors }: { ratingValue: number; selectedRating: number; onSelect: (rating: number) => void; colors: AppColors; }) => {
    const isSelected = selectedRating === ratingValue;
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    return (
        <Pressable style={[styles.ratingBlock, isSelected && styles.ratingBlockSelected]} onPress={() => onSelect(ratingValue)}>
            <Text style={styles.ratingLabel}>{ratingValue}+</Text>
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <FontAwesome key={star} name="star" size={16} color={star <= ratingValue ? colors.accent : colors.starColorEmpty} />
                ))}
            </View>
        </Pressable>
    );
};

export default function FilterScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const tabBarHeight = useBottomTabBarHeight();
    const router = useRouter();
    const { filters, setFilters, resetFilters } = useFilterStore();
    
    const handlePriceChange = (field: 'min' | 'max', value: string) => { setFilters({ priceRange: { ...filters.priceRange, [field]: value } }); };
    const handleAmenityToggle = (amenity: string) => { const newAmenities = filters.amenities.includes(amenity) ? filters.amenities.filter(a => a !== amenity) : [...filters.amenities, amenity]; setFilters({ amenities: newAmenities }); };
    const handleRatingSelect = (star: number) => { const newRating = filters.rating === star ? 0 : star; setFilters({ rating: newRating }); };
    const handleFuelTypeToggle = (fuel: typeof ALL_PRODUCTS[number]) => { const newFuelType = filters.fuelType === fuel ? null : fuel; setFilters({ fuelType: newFuelType }); };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Filters</Text>
                    <Pressable onPress={() => resetFilters()}><Text style={styles.resetText}>Reset All</Text></Pressable>
                </View>
                <Text style={styles.label}>Sort By</Text>
                <View style={styles.chipContainer}>
                    {(['distance', 'last_update'] as const).map(sort => (
                        <Pressable key={sort} style={[styles.chip, filters.sortBy === sort && styles.chipSelected]} onPress={() => setFilters({ sortBy: sort })}>
                            <Text style={[styles.chipText, filters.sortBy === sort && styles.chipTextSelected]}>{sort.replace('_', ' ')}</Text>
                        </Pressable>
                    ))}
                </View>
                <Text style={styles.label}>Price Range</Text>
                <View style={styles.chipContainer}>
                    {ALL_PRODUCTS.map((fuel) => (
                        <Pressable key={fuel} style={[styles.chip, filters.fuelType === fuel && styles.chipSelected]} onPress={() => handleFuelTypeToggle(fuel)}>
                            <Text style={[styles.chipText, filters.fuelType === fuel && styles.chipTextSelected]}>{fuel}</Text>
                        </Pressable>
                    ))}
                </View>
                <View style={styles.priceRangeContainer}>
                    <TextInput style={styles.priceInput} placeholder="Min Price" placeholderTextColor={colors.placeholder} value={filters.priceRange.min} onChangeText={text => handlePriceChange('min', text)} keyboardType="numeric" />
                    <Text style={styles.priceSeparator}>–</Text>
                    <TextInput style={styles.priceInput} placeholder="Max Price" placeholderTextColor={colors.placeholder} value={filters.priceRange.max} onChangeText={text => handlePriceChange('max', text)} keyboardType="numeric" />
                </View>
                <Text style={styles.label}>Payment Method</Text>
                <View style={styles.chipContainer}>
                    {PAYMENT_METHODS.map((method) => (
                        <Pressable key={method} style={[styles.chip, filters.amenities.includes(method) && styles.chipSelected]} onPress={() => handleAmenityToggle(method)}>
                            <Text style={[styles.chipText, filters.amenities.includes(method) && styles.chipTextSelected]}>{method}</Text>
                        </Pressable>
                    ))}
                </View>
                <Text style={styles.label}>Ratings</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((rating) => (<RatingBlock key={rating} ratingValue={rating} selectedRating={filters.rating} onSelect={handleRatingSelect} colors={colors} />))}
                </ScrollView>
                <Text style={styles.label}>Amenities</Text>
                <View style={styles.amenityGridContainer}>
                    {AMENITIES.map((item) => {
                        const isSelected = filters.amenities.includes(item);
                        const iconColor = isSelected ? colors.primary : colors.textSecondary; 
                        const icon = amenityIcons[item] ? React.cloneElement(amenityIcons[item], { color: iconColor }) : <FontAwesome name="question-circle" size={32} color={iconColor} />;
                        return (<Pressable key={item} style={styles.amenityItem} onPress={() => handleAmenityToggle(item)}>{icon}<Text style={[styles.amenityText, isSelected && styles.amenityTextSelected]}>{item}</Text></Pressable>)
                    })}
                </View>
                <View style={styles.buttonContainer}><Pressable style={styles.applyButton} onPress={() => router.push('/search')}><Text style={styles.applyButtonText}>Apply Filters</Text></Pressable></View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: 20 },
    buttonContainer: { marginTop: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingTop: 10 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    resetText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: 25, marginBottom: 12 },
    applyButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
    applyButtonText: { color: colors.primaryText, fontSize: 16, fontWeight: 'bold' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.chipBackground, borderWidth: 1, borderColor: colors.border },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.chipText, fontWeight: '500', fontSize: 15, textTransform: 'capitalize' },
    chipTextSelected: { color: colors.chipTextSelected },
    priceRangeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 10 },
    priceInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlign: 'center', color: colors.text, backgroundColor: colors.card, fontSize: 16 },
    priceSeparator: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    ratingContainer: { flexDirection: 'row', gap: 15, paddingBottom: 5 },
    ratingBlock: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start', gap: 8, width: 96, backgroundColor: colors.card },
    ratingBlockSelected: { borderColor: colors.primary, backgroundColor: colors.chipBackground },
    ratingLabel: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    starRow: { flexDirection: 'row', gap: 4 },
    amenityGridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 15, columnGap: 10, marginTop: 10 },
    amenityItem: { alignItems: 'center', width: '30%', gap: 8 },
    amenityText: { color: colors.textSecondary, textAlign: 'center', fontSize: 12, fontWeight: '500', height: 30 },
    amenityTextSelected: { color: colors.primary, fontWeight: '700' },
});