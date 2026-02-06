// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';

import { CustomTabBar } from '../../components/CustomTabBar';
import { GlobalHeader } from '../../components/GlobalHeader';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        header: () => <GlobalHeader />,
        headerShown: true,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="favourite" />
      <Tabs.Screen name="search" />
      {/* rewards.tsx is missing, so we remove this tab */}
      {/* <Tabs.Screen name="rewards" /> */}
      <Tabs.Screen name="settings" />

      {/* This screen is for the station detail page */}
      <Tabs.Screen
        name="station/[id]"
        options={{ href: null }}
      />

      {/* --- THIS IS THE CORRECTED CODE --- */}
      {/* Remove the ../ because the files are now direct children */}
      <Tabs.Screen
        name="report/submit"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="report/reportchat"
        options={{ href: null }}
      />
    </Tabs>
  );
}