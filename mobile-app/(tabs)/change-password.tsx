import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

const PasswordInput = ({ label, value, onChangeText, colors }: { label: string; value: string; onChangeText: (text: string) => void; colors: AppColors; }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    return (
        <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder={label} placeholderTextColor={colors.placeholder} value={value} onChangeText={onChangeText} secureTextEntry={!isPasswordVisible} autoCapitalize="none" />
            <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={24} color={colors.placeholder} />
            </Pressable>
        </View>
    );
};

export default function ChangePasswordScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const navigation = useNavigation();
    const [oldPassword, setOldPassword] = useState(''); // Note: Supabase doesn't require old password for update, but you might for your own logic.
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSavePassword = async () => {
        if (!newPassword || !confirmPassword) { Alert.alert('Error', 'Please enter and confirm your new password.'); return; }
        if (newPassword.length < 6) { Alert.alert('Error', 'New password must be at least 6 characters long.'); return; }
        if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match.'); return; }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            Alert.alert('Success', 'Your password has been changed successfully.', [{ text: 'OK', onPress: () => navigation?.goBack() }]);
        } catch (error: any) {
            Alert.alert('Failed to Change Password', error.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flexOne}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.formContainer}>
                    <PasswordInput label="New Password" value={newPassword} onChangeText={setNewPassword} colors={colors} />
                    <PasswordInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} colors={colors} />
                    <Pressable style={({ pressed }) => [styles.button, { opacity: pressed || isLoading ? 0.8 : 1 }]} onPress={handleSavePassword} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Save Changes</Text>}
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    flexOne: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { flexGrow: 1, justifyContent: 'center', padding: 16 },
    formContainer: {},
    inputContainer: { height: 60, borderWidth: 1, borderRadius: 8, paddingHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderColor: colors.border, backgroundColor: colors.card },
    input: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
    button: { height: 54, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24, backgroundColor: colors.primary },
    buttonText: { fontSize: 16, fontWeight: '600', color: colors.primaryText },
});