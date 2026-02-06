import { Link, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import PhoneInput from 'react-native-phone-number-input';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type AppColors = ReturnType<typeof useTheme>['colors'];

const PhoneInputComponent = ({ phone, setPhone, colors }: { phone: string; setPhone: (text: string) => void; colors: AppColors }) => {
    return (
        <PhoneInput
            defaultValue={phone} defaultCode="NG" layout="first"
            onChangeFormattedText={(text) => setPhone(text)}
            containerStyle={{ ...styles.phoneInputContainer, backgroundColor: colors.card, borderColor: colors.border }}
            textContainerStyle={{ ...styles.phoneInputTextContainer, backgroundColor: colors.card }}
            codeTextStyle={{ color: colors.text }}
            textInputStyle={{ color: colors.text }}
            placeholder="Your mobile number"
        />
    );
};

export default function SignUpScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]); // Generate styles based on theme
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSignUp() {
        if (loading) return;
        if (!fullName || !email || !phone || !password) { return Alert.alert('Missing Information', 'Please fill out all fields.'); }
        if (password.length < 6) { return Alert.alert('Invalid Password', 'Password must be at least 6 characters.'); }
        if (password !== confirmPassword) { return Alert.alert('Passwords do not match.'); }

        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password: password,
            options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
        });

        if (error) {
            Alert.alert('Sign Up Failed', error.message);
        } else {
            Alert.alert('Success!', 'Your account has been created. Please check your email to verify your account before signing in.');
            // CORRECTED LINE: The path now correctly matches your file name `signIn.tsx`
            router.replace('/signIn');
        }
        setLoading(false);
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Sign up</Text>
                <TextInput style={styles.input} placeholder="Name" value={fullName} onChangeText={setFullName} placeholderTextColor={colors.placeholder} />
                <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.placeholder} />
                <PhoneInputComponent phone={phone} setPhone={setPhone} colors={colors} />
                <TextInput style={styles.input} placeholder="Enter Your Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={colors.placeholder} />
                <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor={colors.placeholder} />
                <Text style={styles.termsText}>Password must be at least 6 characters long.</Text>
                <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
                    {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Sign Up</Text>}
                </Pressable>

                <Link href="/signIn" asChild>
                    <Pressable>
                        <Text style={styles.footerText}>Already have an account? <Text style={styles.linkTextBold}>Sign in</Text></Text>
                    </Pressable>
                </Link>
            </ScrollView>
        </SafeAreaView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: 16, paddingVertical: 20 },
    title: { fontSize: 24, fontWeight: '500', color: colors.text, marginBottom: 30 },
    input: { width: '100%', height: 60, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 20, fontSize: 16, marginBottom: 20, backgroundColor: colors.card, color: colors.text },
    termsText: { fontSize: 12, color: colors.textSecondary, textAlign: 'left', width: '100%', marginBottom: 20, marginTop: -10 },
    button: { width: '100%', height: 54, backgroundColor: colors.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: '500' },
    footerText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: colors.textSecondary },
    linkTextBold: { color: colors.primary, fontWeight: 'bold' },
    separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
    separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
    separatorText: { marginHorizontal: 10, fontSize: 16, color: colors.textSecondary },
});

// These styles are passed directly to the PhoneInputComponent and don't need to be in the dynamic hook
const styles = {
    phoneInputContainer: { width: '100%', height: 60, borderWidth: 1, borderRadius: 8, marginBottom: 20 },
    phoneInputTextContainer: { borderRadius: 8, paddingVertical: 0 },
};