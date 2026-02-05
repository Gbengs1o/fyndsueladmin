// File: app/submit-report.tsx

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function SubmitReportModal() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const { user } = useAuth();

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Photos permission required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5
        });

        if (!result.canceled) setSelectedImage(result.assets[0]);
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
        if (!name || !latitude || !longitude) {
            Alert.alert("Validation Error", "Station Name, Latitude, and Longitude are required.");
            return;
        }
        setIsLoading(true);
        try {
            let imageUrl = null;
            if (selectedImage) {
                imageUrl = await uploadImage();
            }

            const { error: insertError } = await supabase.from('stations').insert({
                name,
                brand: brand || null,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                image_url: imageUrl
            });

            if (insertError) throw insertError;

            Alert.alert("Success", "New station has been added!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to submit.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <Text style={styles.title}>Add a New Station</Text>
            <TextInput style={styles.input} placeholder="Station Name (e.g., Conoil - Garki)" placeholderTextColor={colors.placeholder} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Brand (e.g., Conoil) (Optional)" placeholderTextColor={colors.placeholder} value={brand} onChangeText={setBrand} />
            <View style={styles.coordsContainer}>
                <TextInput style={[styles.input, styles.coordInput]} placeholder="Latitude" placeholderTextColor={colors.placeholder} value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
                <TextInput style={[styles.input, styles.coordInput]} placeholder="Longitude" placeholderTextColor={colors.placeholder} value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
            </View>

            <Pressable style={styles.imagePicker} onPress={handlePickImage} disabled={isLoading}>
                {selectedImage ? (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                        <Pressable style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                            <Ionicons name="close-circle" size={24} color={colors.destructive} />
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                        <Text style={styles.imagePlaceholderText}>Add Station Photo (Optional)</Text>
                    </View>
                )}
            </Pressable>

            <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Add Station</Text>}
            </Pressable>
        </KeyboardAvoidingView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: colors.background },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: colors.text },
    input: { backgroundColor: colors.card, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border, color: colors.text },
    coordsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    coordInput: { flex: 1, marginHorizontal: 5 },
    imagePicker: {
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        height: 120,
        marginBottom: 20,
        overflow: 'hidden',
    },
    imagePreviewContainer: { flex: 1, position: 'relative' },
    imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    removeImage: { position: 'absolute', top: 5, right: 5, backgroundColor: colors.card, borderRadius: 12 },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 5 },
    imagePlaceholderText: { fontSize: 13, color: colors.textSecondary },
    submitButton: { backgroundColor: colors.success, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});