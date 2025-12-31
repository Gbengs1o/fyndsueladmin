// File: components/home/InitialLoadingScreen.tsx
// Premium loading screen with animated fuel pump

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import LoadingAnimation from '../LoadingAnimation';

interface InitialLoadingScreenProps {
    message?: string;
}

export default function InitialLoadingScreen({ message = 'Loading...' }: InitialLoadingScreenProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
            <LoadingAnimation
                message={message}
                size="large"
                variant="fullscreen"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
});