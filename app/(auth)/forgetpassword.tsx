// app/(auth)/forgotPassword.tsx

import { Link, useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TextInput, Pressable, Text, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors), [colors]);
  const router = useRouter();
  const [stage, setStage] = useState('enterEmail'); 
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendRecoveryCode() {
    Keyboard.dismiss();
    if (loading || !email) { Alert.alert('Email Required', 'Please enter your email address.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check Your Email', 'A 6-digit recovery code has been sent.');
      setStage('enterCode');
    }
    setLoading(false);
  }

  async function verifyRecoveryCode() {
    Keyboard.dismiss();
    if (loading || !token) { Alert.alert('Code Required', 'Please enter the 6-digit code.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'recovery' });
    if (error) {
        Alert.alert('Error', error.message || 'The code is invalid or has expired.');
    } else {
        router.push('/(auth)/resetPassword');
    }
    setLoading(false);
  }

  if (stage === 'enterEmail') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive a 6-digit recovery code.</Text>
        <TextInput style={styles.input} placeholder="your.email@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.placeholder} />
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={sendRecoveryCode} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Send Code</Text>}
        </Pressable>
        <Link href="/(auth)/signin" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Back to <Text style={{fontWeight: 'bold'}}>Sign In</Text></Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>A 6-digit code was sent to {email}. Enter it below to continue.</Text>
        <TextInput style={styles.input} placeholder="123456" value={token} onChangeText={setToken} keyboardType="number-pad" placeholderTextColor={colors.placeholder}/>
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={verifyRecoveryCode} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Verify Code</Text>}
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => setStage('enterEmail')}>
            <Text style={styles.linkText}>Use a different email</Text>
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
  linkButton: { marginTop: 20, padding: 10 },
  linkText: { color: colors.primary, fontSize: 16 },
});