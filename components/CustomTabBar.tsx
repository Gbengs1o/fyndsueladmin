// File: components/CustomTabBar.tsx
// Enhanced Tab Bar with smooth animations

import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import FyndFuelLogo from './icons/FyndFuelLogo';

type AppColors = ReturnType<typeof useTheme>['colors'];

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors, theme), [colors, theme]);

  // Animation for the central button
  const centralButtonScale = useRef(new Animated.Value(1)).current;
  const centralButtonRotate = useRef(new Animated.Value(0)).current;

  const getTabConfig = (routeName: string, isFocused: boolean) => {
    const color = isFocused ? colors.primary : colors.tabIconDefault;
    switch (routeName) {
      case 'home':
        return {
          icon: isFocused ? 'home' : 'home-outline',
          label: 'Home',
          color
        };
      case 'favourite':
        return {
          icon: isFocused ? 'heart' : 'heart-outline',
          label: 'Saved',
          color: isFocused ? '#EF4444' : colors.tabIconDefault
        };
      case 'leaderboard':
        return {
          icon: isFocused ? 'trophy' : 'trophy-outline',
          label: 'Ranks',
          color: isFocused ? '#F59E0B' : colors.tabIconDefault
        };
      case 'settings':
        return {
          icon: isFocused ? 'settings' : 'settings-outline',
          label: 'Settings',
          color
        };
      default:
        return null;
    }
  };

  const handleCentralPress = () => {
    // Animate button
    Animated.sequence([
      Animated.parallel([
        Animated.spring(centralButtonScale, {
          toValue: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(centralButtonRotate, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(centralButtonScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(centralButtonRotate, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    navigation.navigate('search');
  };

  const rotate = centralButtonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  // Get visible tabs (excluding search which is the central button)
  const visibleTabs = state.routes.filter(route =>
    ['home', 'favourite', 'leaderboard', 'settings'].includes(route.name)
  );

  // Split tabs into left and right groups
  const leftTabs = visibleTabs.slice(0, 2);
  const rightTabs = visibleTabs.slice(2, 4);

  const renderTab = (route: typeof state.routes[0], index: number) => {
    const isFocused = state.routes[state.index]?.name === route.name;
    const config = getTabConfig(route.name, isFocused);
    if (!config) return null;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TabButton
        key={route.key}
        isFocused={isFocused}
        icon={config.icon}
        label={config.label}
        color={config.color}
        onPress={onPress}
        colors={colors}
        theme={theme}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        {/* Notch cutout */}
        <View style={styles.notchContainer}>
          <View style={styles.notchCutout} />
        </View>
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabsContainer}>
        {/* Left tabs */}
        <View style={styles.tabGroup}>
          {leftTabs.map(renderTab)}
        </View>

        {/* Spacer for central button */}
        <View style={styles.centralSpacer} />

        {/* Right tabs */}
        <View style={styles.tabGroup}>
          {rightTabs.map(renderTab)}
        </View>
      </View>

      {/* Central Button */}
      <Pressable
        style={styles.centralButtonWrapper}
        onPress={handleCentralPress}
      >
        <Animated.View
          style={[
            styles.centralButton,
            {
              transform: [
                { scale: centralButtonScale },
                { rotate: rotate }
              ]
            }
          ]}
        >
          <FyndFuelLogo size={28} color="#fff" />
        </Animated.View>
        <Text style={styles.centralLabel}>Find Gas</Text>
      </Pressable>
    </View>
  );
};

// Individual Tab Button Component with animation
interface TabButtonProps {
  isFocused: boolean;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  colors: AppColors;
  theme: string;
}

const TabButton = ({ isFocused, icon, label, color, onPress, colors, theme }: TabButtonProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles => [tabStyles.button]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {/* Active indicator */}
        <Animated.View
          style={[
            tabStyles.activeIndicator,
            {
              opacity: opacityAnim,
              backgroundColor: color + '20',
            }
          ]}
        />
        <Ionicons name={icon as any} size={22} color={color} />
        <Text style={[tabStyles.label, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const tabStyles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

const getThemedStyles = (colors: AppColors, theme: string) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 16 },
    }),
  },
  notchContainer: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 20,
    alignItems: 'center',
  },
  notchCutout: {
    width: 80,
    height: 20,
    backgroundColor: colors.card,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  tabsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
  },
  centralSpacer: {
    width: 80,
  },
  centralButtonWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 22,
    alignItems: 'center',
  },
  centralButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  centralLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    color: colors.primary,
  },
});