import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function ContactUsScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Get in Touch</Text>
                <Text style={styles.addressText}>Have a question or a suggestion? We'd love to hear from you. Please reach out via email or phone.</Text>
                
                {/* Email Contact Action */}
                <Pressable style={styles.contactRow} onPress={() => Linking.openURL('mailto:Hello@smahile.com')}>
                    <Ionicons name="mail" size={20} color={colors.textSecondary} />
                    <Text style={styles.contactLink}>Hello@smahile.com</Text>
                </Pressable>

                {/* Phone Contact Action */}
                <Pressable style={styles.contactRow} onPress={() => Linking.openURL('tel:+2349055566889')}>
                    <Ionicons name="call" size={20} color={colors.textSecondary} />
                    <Text style={styles.contactLink}>+2349055566889</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: colors.text },
    addressText: { fontSize: 14, lineHeight: 22, marginBottom: 16, color: colors.textSecondary },
    contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    contactLink: { fontSize: 16, marginLeft: 12, fontWeight: '500', color: colors.text },
});