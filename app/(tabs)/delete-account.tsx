import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function DeleteAccountScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);
    const { signOut } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const performDeletion = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.functions.invoke('delete-user');
            if (error) throw error;
            Alert.alert('Account Deleted', 'Your account and all associated data have been successfully removed.');
            await signOut();
        } catch (error: any) {
            Alert.alert('Deletion Failed', error.message || 'Could not delete your account. Please try again or contact support.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePress = () => {
        Alert.alert(
            'Are you absolutely sure?',
            'This action cannot be undone. All your data, including favourite stations and profile information, will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Account', style: 'destructive', onPress: performDeletion },
            ],
            { cancelable: true }
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.content}>
                    <Text style={styles.warningText}>
                        Are you sure you want to delete your account? Please read how account deletion will affect you.
                    </Text>
                    <Text style={[styles.warningText, { marginTop: 16 }]}>
                        Deleting your account removes all personal information from our database. Your email becomes permanently reserved, and the same email cannot be used to register a new account.
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    <Pressable
                        style={({ pressed }) => [ styles.button, { opacity: pressed || isLoading ? 0.8 : 1 } ]}
                        onPress={handleDeletePress}
                        disabled={isLoading}
                    >
                        {isLoading ? <ActivityIndicator color={colors.destructiveText} /> : <Text style={styles.buttonText}>Delete</Text>}
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 15,
    },
    content: {
        marginBottom: 40,
    },
    warningText: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        fontWeight: '400',
        color: colors.textSecondary,
    },
    buttonContainer: {},
    button: {
        height: 54,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.destructive,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.destructiveText,
    },
});