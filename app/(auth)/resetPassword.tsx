// app/(auth)/resetPassword.tsx

import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TextInput, Pressable, Text, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors), [colors]);
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (loading) return;
    if (!password || !confirmPassword) { Alert.alert('Password Required', 'Please enter and confirm your new password.'); return; }
    if (password !== confirmPassword) { Alert.alert('Passwords do not match', 'Please ensure both passwords are the same.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password Updated', 'Your password has been successfully updated. Please sign in.', [{ text: 'OK', onPress: () => router.replace('/(auth)/signIn') }]);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>You're almost done. Enter your new password below.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholderTextColor={colors.placeholder}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholderTextColor={colors.placeholder}
      />
      
      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleResetPassword} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Update Password</Text>}
      </Pressable>
    </View>
  );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: colors.text },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 40, textAlign: 'center', paddingHorizontal: 10 },
    input: { width: '100%', height: 50, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, marginBottom: 15, color: colors.text },
    button: { width: '100%', paddingVertical: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row', backgroundColor: colors.primary },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.primaryText, fontSize: 18, fontWeight: 'bold' },
});