// File: components/home/SubtleActivityIndicator.tsx
// Simple, clean loading indicator for map overlays

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import FyndFuelLogo from '../icons/FyndFuelLogo';

interface SubtleActivityIndicatorProps {
    visible: boolean;
}

export default function SubtleActivityIndicator({ visible }: SubtleActivityIndicatorProps) {
    const { colors } = useTheme();

    const spinAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();

            const spinAnimation = Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            spinAnimation.start();

            return () => spinAnimation.stop();
        } else {
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const styles = useMemo(() => StyleSheet.create({
        container: {
            position: 'absolute',
            top: 130,
            alignSelf: 'center',
            zIndex: 100,
        },
        circle: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                },
                android: { elevation: 4 },
            }),
        },
    }), [colors]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: scaleAnim,
                }
            ]}
        >
            <View style={styles.circle}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <FyndFuelLogo size={22} color="#ffffff" />
                </Animated.View>
            </View>
        </Animated.View>
    );
}