
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedView = Animated.createAnimatedComponent(View);

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const LOGO_SIZE = 300;
const SHADOW_WIDTH = 180;
const SHADOW_HEIGHT = 20;

export default function AnimatedSplashScreen({ onAnimationFinish }: { onAnimationFinish?: () => void }) {
    // Animation Values
    const containerOpacity = useSharedValue(0);
    const containerScale = useSharedValue(0.5);

    const floatY = useSharedValue(0);

    const shadowScale = useSharedValue(1);
    const shadowOpacity = useSharedValue(1);

    const strokeDashoffset = useSharedValue(12000);
    const fillOpacity = useSharedValue(0);
    const strokeWidth = useSharedValue(20);

    useEffect(() => {
        // 1. Container Fade In
        containerOpacity.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) });
        containerScale.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) });

        // 2. Floating Animation (Infinite)
        floatY.value = withRepeat(
            withSequence(
                withTiming(-30, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        // 3. Shadow Pulse (Infinite)
        shadowScale.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
        shadowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        // 4. SVG Drawing
        strokeDashoffset.value = withDelay(
            300,
            withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        );

        // 5. Fill and Stroke Fade
        // Starts at 2.2s (2200ms)
        fillOpacity.value = withDelay(
            2200,
            withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) })
        );
        strokeWidth.value = withDelay(
            2200,
            withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }, (finished) => {
                if (finished && onAnimationFinish) {
                    // You might want to delay slightly so the user sees the final logo
                    runOnJS(onAnimationFinish)();
                }
            })
        );

    }, []);

    // Animated Styles
    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        transform: [{ scale: containerScale.value }],
    }));

    const floatStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatY.value }],
    }));

    const shadowContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: shadowScale.value }],
        opacity: shadowOpacity.value
    }));

    const animatedPathProps = useAnimatedProps(() => ({
        strokeDashoffset: strokeDashoffset.value,
        fillOpacity: fillOpacity.value,
        strokeWidth: strokeWidth.value,
    }));

    return (
        <View style={styles.container}>
            <AnimatedView style={[styles.loaderContainer, containerStyle]}>

                {/* Floating Logo */}
                <AnimatedView style={[styles.floatingLogo, floatStyle]}>
                    <Svg viewBox="0 0 3599.99 3599.99" width="100%" height="100%">
                        {/* Gradient Definition for Shadow? No, Shadow is separate div in CSS. keeping paths here. */}
                        <G id="FyndFuel_Logo">
                            <AnimatedPath
                                id="outer-shape"
                                d="M2080.09 1779.17l-399.8 431.48c-250.48,-267.45 -647.12,-598.63 -611.66,-987.72 42.49,-229.11 165.69,-378.48 337.95,-458.04 561.87,-259.46 1219.06,330.74 673.5,1014.27zm-656.23 -1219.88c-245.02,77.89 -424.48,252.2 -507.11,478.69 -48.21,140.04 -56.07,235.01 -35.54,392.65 40.4,237.64 194,415.22 323.13,523.46l-257.78 276.33c34.95,76.41 652.87,766.45 733.73,853.57l219.09 -242.71c32.92,-39.63 30.13,-36.82 72.2,-80.94l279.66 -334.14c202.17,-246.37 407.12,-386.76 467.12,-755.49 109.61,-704.46 -616.95,-1326.82 -1294.51,-1111.43zm-223.41 1667.67l136.93 -116.6 342.91 383.01c32.5,-18.62 6.75,0.2 32.47,-24.41 312.09,-347.83 743.69,-685.12 782.67,-1177.8 258.26,442.89 -432.16,1075.64 -696.59,1381.85 -56.88,62.01 -61.41,56.62 -97.19,125.29l-501.21 -571.34z"
                                fill="#5C0CA7"
                                stroke="#5C0CA7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray={12000}
                                animatedProps={animatedPathProps}
                            />
                            <AnimatedPath
                                id="inner-shape"
                                d="M1449.09 1008.46c-18.41,3.83 -30.31,13.3 -37.68,26.18 -9.49,16.58 -8.05,34.82 -8.04,56.5l0 516.83c0,67.18 -5.06,71.46 58.22,71.45 86.84,-0 173.68,0 260.52,0 80.83,0 73.56,12.57 73.56,-119.77 0,-21.31 -6.59,-46.76 16.7,-48.37 58.39,-4.06 29.61,47.51 44.69,85.65 27.67,70 122.86,72.35 154.58,6.44 12.65,-26.28 8.21,-87.5 8.21,-121.46 0,-86.83 -0.12,-173.68 0,-260.52 0.07,-50.76 -9.26,-66.76 -38.52,-89.04 -24.37,-18.56 -49.78,-37.3 -74.46,-55.8 -11.8,-8.84 -26.63,-21.22 -44.9,-7.36 -14.64,11.11 -12.3,34.4 1.22,44.74 48.54,37.14 44.42,21.59 44.41,86.44 0,49.08 1.87,69.32 42.41,85.22 18.8,7.37 13.7,19.38 13.7,51.34l0 195.39c0,21.44 3.96,43.51 -9.41,55.7 -14.79,13.5 -36.91,6.43 -43.33,-7.14 -14.73,-31.11 12.65,-58.7 -27.84,-100.32 -44.1,-45.33 -85.7,-6.33 -87.52,-42.65 -2.06,-41.12 0.06,-88.56 0.06,-130.39 0,-36.4 2.59,-238.31 -1.56,-257.02 -10.62,-47.85 -57.65,-43.44 -86.7,-43.44 -36.99,0 -239.44,-2.54 -258.31,1.38zm10.42 74.27l0 184.88c0,15.96 5.06,19.51 20.99,19.51l239.51 0c15.48,0 19.51,-4.03 19.51,-19.51l0 -184.88c0,-15.5 -4.01,-19.51 -19.51,-19.51l-240.04 0c-14.87,0 -20.46,4.2 -20.46,19.51z"
                                fill="#5C0CA7"
                                stroke="#5C0CA7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray={12000}
                                animatedProps={animatedPathProps}
                            />
                        </G>
                    </Svg>
                </AnimatedView>

                {/* Shadow */}
                <AnimatedView style={[styles.shadow, shadowContainerStyle]}>
                    <Svg height="100%" width="100%" viewBox="0 0 180 20">
                        <Defs>
                            <RadialGradient
                                id="shadowGrad"
                                cx="50%"
                                cy="50%"
                                rx="50%"
                                ry="50%"
                                fx="50%"
                                fy="50%"
                                gradientUnits="userSpaceOnUse"
                            >
                                <Stop offset="0" stopColor="rgba(92, 12, 167, 0.4)" stopOpacity="1" />
                                <Stop offset="0.7" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
                                <Stop offset="1" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Ellipse cx="90" cy="10" rx="90" ry="10" fill="url(#shadowGrad)" />
                    </Svg>
                </AnimatedView>

            </AnimatedView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        // We handle scale and opacity via animated styles
    },
    floatingLogo: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        zIndex: 10,
    },
    shadow: {
        width: SHADOW_WIDTH,
        height: SHADOW_HEIGHT,
        marginTop: -30,
        zIndex: 1,
    },
});
