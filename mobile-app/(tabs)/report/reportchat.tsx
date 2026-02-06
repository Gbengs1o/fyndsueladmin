// File: app/(tabs)/report/reportchat.tsx
// All ../../ paths are now ../../../


import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

const MOOD_RATINGS = ['Very bad', 'Bad', 'Good', 'Better', 'Excellent'];
const EMOJI_RATINGS = ['😖', '😕', '😐', '😊', '😍'];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number { const R = 6371e3; const p1 = lat1 * Math.PI / 180; const p2 = lat2 * Math.PI / 180; const dp = (lat2 - lat1) * Math.PI / 180; const dl = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c; }

const StarRatingDisplay = ({ rating, colors }: { rating: number, colors: AppColors }) => {
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    return (
        <View style={styles.starRatingDisplayContainer}>
            <View style={styles.starsWrapper}>
                {Array.from({ length: 5 }).map((_, index) => (
                    <FontAwesome key={index} name={index < rating ? "star" : "star-o"} size={22} color={index < rating ? colors.accent : colors.disabled} />
                ))}
            </View>
            {rating > 0 && <Text style={styles.starRatingDisplayText}>{rating}.0/5</Text>}
        </View>
    );
};

export default function SubmitCommentScreen() {
    const { stationId, stationName, lat, lon } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);

    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!user || !stationId) { Alert.alert("Error", "User or Station ID is missing."); return; }
        if (rating === 0) { Alert.alert("Missing Rating", "Please select your experience to post a review."); return; }

        setLoading(true);
        try {
            const userLocation = await Location.getCurrentPositionAsync({});
            const distance = haversineDistance(userLocation.coords.latitude, userLocation.coords.longitude, parseFloat(lat as string), parseFloat(lon as string));
            if (distance > 500) { Alert.alert("Too Far Away", `You must be within 500 meters to submit a review. You are currently ~${Math.round(distance)}m away.`); setLoading(false); return; }

            const { error } = await supabase.from('price_reports').insert({ station_id: Number(stationId), user_id: user.id, fuel_type: 'PMS', price: null, rating: rating, notes: notes.trim() || null });
            if (error) throw error;

            // Create notifications for users who have this station as favourite with notifications enabled
            try {
                const { data: favouriteUsers, error: favError } = await supabase
                    .from('favourite_stations')
                    .select('user_id')
                    .eq('station_id', Number(stationId))
                    .eq('notifications_enabled', true);

                console.log('Favourite users for notifications:', favouriteUsers, 'Error:', favError);

                if (favouriteUsers && favouriteUsers.length > 0) {
                    const displayName = stationName || 'a station';
                    const message = `New review at ${displayName}: ${rating} star${rating !== 1 ? 's' : ''}${notes ? ` - "${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}"` : ''}`;

                    const notifications = favouriteUsers.map(fav => ({
                        user_id: fav.user_id,
                        station_id: Number(stationId),
                        message: message,
                        is_read: false,
                    }));

                    console.log('Creating notifications:', notifications);
                    const { data: insertedNotifs, error: notifError } = await supabase
                        .from('notifications')
                        .insert(notifications)
                        .select();

                    if (notifError) {
                        console.log('Notification insert error:', notifError);
                    } else {
                        console.log('Notifications created successfully!');

                        // Send push notifications to each user
                        if (insertedNotifs) {
                            for (const notif of insertedNotifs) {
                                try {
                                    await supabase.functions.invoke('send-push-notification', {
                                        body: {
                                            notification_id: notif.id,
                                            user_id: notif.user_id,
                                            station_id: notif.station_id,
                                            message: notif.message,
                                        }
                                    });
                                } catch (pushErr) {
                                    console.log('Push notification error:', pushErr);
                                }
                            }
                        }
                    }
                }
            } catch (notifError) {
                console.log('Notification creation error:', notifError);
            }

            Alert.alert("Review Posted!", "Thank you for sharing your experience!", [{ text: 'OK', onPress: () => router.back() }]);
        } catch (error: any) {
            Alert.alert("Submission Error", "Could not post your review. " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <Stack.Screen options={{ title: 'Post a Review', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.card }, headerTitleStyle: { color: colors.text } }} />
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <StarRatingDisplay rating={rating} colors={colors} />
                <View style={styles.commentInputWrapper}>
                    <TextInput style={styles.notesInput} placeholderTextColor={colors.placeholder} placeholder="Type your comment here..." value={notes} onChangeText={setNotes} multiline />
                </View>
                <View style={styles.cardContainer}>
                    <Text style={styles.cardTitle}>How was your overall experience?</Text>
                    <View style={styles.moodButtonContainer}>
                        {MOOD_RATINGS.map((mood, index) => {
                            const isSelected = rating === index + 1;
                            return (
                                <Pressable key={mood} style={[styles.moodButton, isSelected && styles.moodButtonSelected]} onPress={() => setRating(index + 1)}>
                                    <Text style={[styles.moodButtonText, isSelected && styles.moodButtonTextSelected]}>{mood}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
                <View style={styles.emojiSectionContainer}>
                    <View style={styles.handleIndicator} />
                    <Text style={styles.cardTitle}>How's your experience so far?</Text>
                    <Text style={styles.cardSubtitle}>We'd love to know!</Text>
                    <View style={styles.emojiContainer}>
                        {EMOJI_RATINGS.map((emoji, index) => {
                            const isSelected = rating === index + 1;
                            return (<Pressable key={emoji} onPress={() => setRating(index + 1)}><Text style={[styles.emoji, isSelected && styles.emojiSelected]}>{emoji}</Text></Pressable>)
                        })}
                    </View>
                </View>
                <View style={{ flex: 1 }} />
                <Pressable style={[styles.submitButton, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.submitButtonText}>Post</Text>}
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { flexGrow: 1, padding: 20, paddingBottom: 120 },
    starRatingDisplayContainer: { backgroundColor: colors.card, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: colors.border },
    starsWrapper: { flexDirection: 'row', gap: 8 },
    starRatingDisplayText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    commentInputWrapper: { backgroundColor: colors.card, borderRadius: 7, borderWidth: 1.5, borderColor: colors.primary, minHeight: 120, padding: 5, marginBottom: 20 },
    notesInput: { flex: 1, padding: 10, fontSize: 16, color: colors.text, textAlignVertical: 'top' },
    cardContainer: { backgroundColor: colors.card, borderRadius: 8, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
    moodButtonContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 },
    moodButton: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16 },
    moodButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    moodButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
    moodButtonTextSelected: { color: colors.primaryText },
    emojiSectionContainer: { alignItems: 'center', paddingVertical: 20 },
    handleIndicator: { width: 60, height: 5, borderRadius: 10, backgroundColor: colors.border, marginBottom: 20 },
    cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 25 },
    emojiContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    emoji: { fontSize: 40, opacity: 0.5 },
    emojiSelected: { opacity: 1, transform: [{ scale: 1.1 }] },
    submitButton: { backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 53, marginTop: 'auto' },
    submitButtonText: { color: colors.primaryText, fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { opacity: 0.7 },
});