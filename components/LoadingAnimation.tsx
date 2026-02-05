// File: components/LoadingAnimation.tsx
// A clean, fuel-themed loading animation that uses the app's theme colors

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import FyndFuelLogo from './icons/FyndFuelLogo';

interface LoadingAnimationProps {
    message?: string;
    size?: 'small' | 'medium' | 'large';
    variant?: 'default' | 'minimal' | 'fullscreen';
}

export default function LoadingAnimation({
    message = 'Loading...',
    size = 'medium',
    variant = 'default'
}: LoadingAnimationProps) {
    const { colors, theme } = useTheme();

    // Animation values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0.4)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    // Size configurations
    const sizeConfig = {
        small: { icon: 20, container: 44, text: 12 },
        medium: { icon: 28, container: 64, text: 14 },
        large: { icon: 36, container: 88, text: 15 },
    };

    const config = sizeConfig[size];

    useEffect(() => {
        // Gentle pulse animation
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        // Slow rotation
        const rotateAnimation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        // Text fade
        const fadeAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.4,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );

        // Entry animation
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
        }).start();

        pulseAnimation.start();
        rotateAnimation.start();
        fadeAnimation.start();

        return () => {
            pulseAnimation.stop();
            rotateAnimation.stop();
            fadeAnimation.stop();
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Minimal variant - just the icon
    if (variant === 'minimal') {
        return (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <FyndFuelLogo
                    size={config.icon}
                    color={colors.primary}
                />
            </Animated.View>
        );
    }

    // Fullscreen variant
    if (variant === 'fullscreen') {
        return (
            <View style={[styles.fullscreen, { backgroundColor: colors.background }]}>
                <Animated.View style={[styles.centerContainer, { transform: [{ scale: scaleAnim }] }]}>
                    {/* Simple circle with icon */}
                    <View
                        style={[
                            styles.iconCircle,
                            {
                                width: config.container,
                                height: config.container,
                                borderRadius: config.container / 2,
                                backgroundColor: colors.primary,
                            }
                        ]}
                    >
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <FyndFuelLogo
                                size={config.icon}
                                color="#ffffff"
                            />
                        </Animated.View>
                    </View>

                    {/* Loading text */}
                    <Animated.Text
                        style={[
                            styles.loadingText,
                            {
                                color: colors.text,
                                fontSize: config.text,
                                marginTop: 20,
                                opacity: fadeAnim,
                            }
                        ]}
                    >
                        {message}
                    </Animated.Text>
                </Animated.View>
            </View>
        );
    }

    // Default variant
    return (
        <View style={styles.container}>
            <Animated.View style={[styles.centerContainer, { transform: [{ scale: scaleAnim }] }]}>
                {/* Pulse ring */}
                <Animated.View
                    style={[
                        styles.pulseRing,
                        {
                            width: config.container + 16,
                            height: config.container + 16,
                            borderRadius: (config.container + 16) / 2,
                            backgroundColor: theme === 'dark'
                                ? 'rgba(147, 51, 234, 0.15)'
                                : 'rgba(92, 12, 167, 0.1)',
                            transform: [{ scale: pulseAnim }],
                        }
                    ]}
                />

                {/* Icon circle */}
                <View
                    style={[
                        styles.iconCircle,
                        {
                            width: config.container,
                            height: config.container,
                            borderRadius: config.container / 2,
                            backgroundColor: colors.primary,
                        }
                    ]}
                >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <FyndFuelLogo
                            size={config.icon}
                            color="#ffffff"
                        />
                    </Animated.View>
                </View>
            </Animated.View>

            {/* Loading text */}
            {message && (
                <Animated.Text
                    style={[
                        styles.messageText,
                        {
                            color: colors.textSecondary,
                            fontSize: config.text,
                            opacity: fadeAnim,
                        }
                    ]}
                >
                    {message}
                </Animated.Text>
            )}
        </View>
    );
}

// Simple inline loader for buttons
export function InlineLoader({ color, size = 20 }: { color?: string; size?: number }) {
    const { colors } = useTheme();
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialCommunityIcons name="loading" size={size} color={color || colors.primary} />
        </Animated.View>
    );
}

// Skeleton loader for content placeholders
export function SkeletonLoader({ width = '100%', height = 20, borderRadius = 8 }: { width?: number | string; height?: number; borderRadius?: number }) {
    const { theme } = useTheme();
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.6],
    });

    return (
        <Animated.View
            style={{
                width,
                height,
                borderRadius,
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                opacity,
            }}
        />
    );
}

// Dots loader
export function DotsLoader({ color, size = 6 }: { color?: string; size?: number }) {
    const { colors } = useTheme();
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createDotAnimation = (anim: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 300,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.delay(600 - delay),
                ])
            );
        };

        const anim1 = createDotAnimation(dot1, 0);
        const anim2 = createDotAnimation(dot2, 150);
        const anim3 = createDotAnimation(dot3, 300);

        anim1.start();
        anim2.start();
        anim3.start();

        return () => {
            anim1.stop();
            anim2.stop();
            anim3.stop();
        };
    }, []);

    const createDotStyle = (anim: Animated.Value) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color || colors.primary,
        marginHorizontal: size / 2,
        transform: [
            {
                scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.4],
                }),
            },
        ],
        opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
        }),
    });

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View style={createDotStyle(dot1)} />
            <Animated.View style={createDotStyle(dot2)} />
            <Animated.View style={createDotStyle(dot3)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    fullscreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute',
    },
    iconCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: { elevation: 6 },
        }),
    },
    loadingText: {
        fontWeight: '500',
    },
    messageText: {
        marginTop: 16,
        fontWeight: '500',
    },
});
