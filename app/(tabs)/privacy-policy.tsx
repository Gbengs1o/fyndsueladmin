import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AppColors = ReturnType<typeof useTheme>['colors'];

export default function PrivacyPolicyScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getThemedStyles(colors), [colors]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Last updated: October 26, 2023</Text>

            <Text style={styles.paragraph}>
                Welcome to FYND FUEL ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App").
            </Text>

            <Text style={styles.heading}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
                We may collect information about you in a variety of ways. The information we may collect via the App depends on the content and materials you use, and includes:
            </Text>

            <Text style={styles.subheading}>a) Personal and Account Data</Text>
            <Text style={styles.paragraph}>
                If you choose to create an account to use features like saving 'Favourite Stations', we collect personal information, such as your user ID and email address, provided through our authentication provider (Supabase Auth).
            </Text>

            <Text style={styles.subheading}>b) Location Data</Text>
            <Text style={styles.paragraph}>
                This is the core of our service. We request and collect precise, real-time location information from your mobile device to provide location-based services, such as:
            </Text>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Finding and displaying nearby fuel stations on the map.</Text>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Calculating the distance to each station.</Text>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Powering features to find stations in your current area.</Text>
            </View>
            <Text style={styles.paragraph}>
                You can change location access at any time in your device's settings. However, disabling location services will render the core features of the App unusable.
            </Text>

            <Text style={styles.subheading}>c) Camera and Photo Library Access</Text>
            <Text style={styles.paragraph}>
                We request access to your device's camera and photo library to allow you to:
            </Text>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Take photos of fuel stations to accompany your suggestions or reports.</Text>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Upload existing photos from your gallery for station submissions.</Text>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Update your profile picture.</Text>
            </View>
            <Text style={styles.paragraph}>
                We only access your camera or photos when you explicitly choose to perform these actions. The uploaded images are stored on our secure servers (Supabase Storage).
            </Text>

            <Text style={styles.subheading}>d) Usage Data</Text>
            <Text style={styles.paragraph}>
                We collect information about your activity in the App, specifically which fuel stations you mark as 'Favourite' and the price reports you submit. This helps personalize your experience and contributes to our community data.
            </Text>

            <Text style={styles.heading}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
                Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we use information collected about you via the App to:
            </Text>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Provide the core service of finding nearby fuel stations and their details.</Text>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Create and manage your account and your list of 'Favourite Stations'.</Text>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>Improve our database of fuel stations. When you search or sync, your location is used to query external sources (like Google Places API) for new or updated station information. This helps keep our data accurate for all users.</Text>
            </View>

            <Text style={styles.heading}>3. Disclosure of Your Information</Text>
            <Text style={styles.paragraph}>
                We do not sell your personal information. We may share information we have collected about you in certain situations:
            </Text>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>
                    <Text style={{ fontWeight: 'bold' }}>With Service Providers.</Text> We share data with our backend service provider, Supabase, which hosts our database, authentication, and serverless functions.
                </Text>
            </View>
            <View style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.paragraph, { flex: 1 }]}>
                    <Text style={{ fontWeight: 'bold' }}>For Data Enrichment.</Text> Your location coordinates are used to query third-party APIs like Google's to find station data. Your personal user information is not sent in this request.
                </Text>
            </View>

            <Text style={styles.heading}>4. Security of Your Information</Text>
            <Text style={styles.paragraph}>
                We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable.
            </Text>

            <Text style={styles.heading}>5. Contact Us</Text>
            <Text style={styles.paragraph}>
                If you have questions or comments about this Privacy Policy, please reach out to us using the contact details below:
            </Text>

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
        </ScrollView>
    );
};

const getThemedStyles = (colors: AppColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: colors.text,
    },
    lastUpdated: {
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 24,
        color: colors.textSecondary,
    },
    heading: {
        fontSize: 22,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 10,
        color: colors.text,
    },
    subheading: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 8,
        color: colors.text,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'justify',
        color: colors.text,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 5,
        marginLeft: 10,
    },
    bullet: {
        fontSize: 16,
        marginRight: 10,
        lineHeight: 24,
        color: colors.textSecondary,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginLeft: 10,
    },
    contactLink: {
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
        color: colors.text,
    }
});