import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function SignInScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        if (!email || !password) { Alert.alert('Error', 'Please enter both email and password.'); return; }
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // router.replace('/(tabs)/home'); // Handled by RootLayout
        } catch (error: any) {
            Alert.alert('Sign In Failed', error.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoiding}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>Sign in</Text>
                    <View style={styles.inputContainer}>
                        <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor={colors.placeholder} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                    </View>
                    <View style={styles.inputContainer}>
                        <TextInput style={styles.input} placeholder="Enter Your Password" placeholderTextColor={colors.placeholder} value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} />
                        <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                            <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={24} color={colors.placeholder} />
                        </Pressable>
                    </View>
                    <Link href="/(auth)/forgetpassword" asChild>
                        <Pressable><Text style={styles.forgotPassword}>Forgot password?</Text></Pressable>
                    </Link>
                    <Pressable style={({ pressed }) => [styles.button, { opacity: pressed || isLoading ? 0.8 : 1 }]} onPress={handleSignIn} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Sign In</Text>}
                    </Pressable>
                    <Text style={styles.footerText}>
                        Don’t have an account?{' '}
                        <Link href="/(auth)/signup" asChild>
                            <Pressable><Text style={styles.linkText}>Sign Up</Text></Pressable>
                        </Link>
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    keyboardAvoiding: { flex: 1 },
    container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
    title: { fontSize: 24, fontWeight: '500', color: colors.text, marginBottom: 30 },
    inputContainer: { height: 60, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 20, marginBottom: 10, backgroundColor: colors.card },
    input: { flex: 1, fontSize: 16, color: colors.text },
    forgotPassword: { fontSize: 14, color: colors.primary, textAlign: 'right', marginBottom: 20, paddingVertical: 5 },
    button: { height: 54, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginTop: 10 },
    buttonText: { fontSize: 16, fontWeight: '500', color: colors.primaryText },
    separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
    separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
    separatorText: { marginHorizontal: 10, fontSize: 16, color: colors.textSecondary },
    footerText: { fontSize: 16, color: colors.text, textAlign: 'center' },
    linkText: { fontSize: 16, color: colors.primary, fontWeight: 'bold' },
});