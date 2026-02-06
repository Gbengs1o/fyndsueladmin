// File: app/(tabs)/leaderboard.tsx

import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import AdvertCard, { Advert } from '../../components/AdvertCard'; // Added AdvertCard
import { LetterAvatar } from '../../components/LetterAvatar'; // Assuming you have this component
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

// Type definitions for clarity and safety
type AppColors = ReturnType<typeof useTheme>['colors'];

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  report_count: number;
  rank_number: number;
}

// --- Sub-components for a cleaner main component ---

const PodiumItem = ({ user, rank, colors }: { user: LeaderboardEntry, rank: number, colors: AppColors }) => {
  const styles = useMemo(() => getThemedStyles(colors), [colors]);
  const isFirst = rank === 1;

  const rankStyles: Record<number, { bg: string, border: string }> = {
    1: { bg: colors.podiumGoldBg, border: colors.podiumGold },
    2: { bg: colors.podiumSilverBg, border: colors.podiumSilver },
    3: { bg: colors.podiumBronzeBg, border: colors.podiumBronze },
  };

  return (
    <View style={[styles.podiumItem, { marginTop: isFirst ? 0 : 30 }]}>
      <View>
        <LetterAvatar avatarUrl={user.avatar_url} name={user.full_name} size={isFirst ? 80 : 60} />
        <View style={[styles.rankBadge, { backgroundColor: rankStyles[rank].bg, borderColor: rankStyles[rank].border }]}>
          <Text style={styles.rankBadgeText}>{rank}</Text>
        </View>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{user.full_name}</Text>
      <Text style={styles.podiumScore}>{user.report_count} reports</Text>
    </View>
  );
};

const UserRankBanner = ({ user, colors }: { user: LeaderboardEntry, colors: AppColors }) => {
  const styles = useMemo(() => getThemedStyles(colors), [colors]);
  return (
    <View style={styles.userRankBanner}>
      <Text style={[styles.rank, { color: colors.primaryText }]}>{user.rank_number}</Text>
      <LetterAvatar avatarUrl={user.avatar_url} name={user.full_name} size={40} />
      <Text style={[styles.name, { color: colors.primaryText }]} numberOfLines={1}>Your Rank</Text>
      <Text style={[styles.score, { color: colors.primaryText }]}>{user.report_count} reports</Text>
    </View>
  );
};

// --- Main Leaderboard Screen Component ---

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getThemedStyles(colors), [colors]);
  const { user: currentUser } = useAuth();
  const isFocused = useIsFocused();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sponsoredAd, setSponsoredAd] = useState<Advert | null>(null);

  // Memoized function to fetch data from Supabase RPC
  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard');

      if (error) {
        // Throw the error to be caught by the catch block
        throw error;
      }

      setLeaderboard(data || []);

      // Also fetch one sponsored ad if enabled
      const { data: settingsData } = await supabase.from('app_settings').select('value').eq('key', 'global_ads_enabled').single();
      const areAdsEnabled = settingsData?.value ?? true;

      if (areAdsEnabled) {
        const { data: adsData } = await supabase
          .from('adverts')
          .select('*')
          .eq('is_active', true)
          .in('type', ['card', 'video']) // Prefer cards or video for feed
          .limit(3);

        if (adsData && adsData.length > 0) {
          const randomAd = adsData[Math.floor(Math.random() * adsData.length)];
          setSponsoredAd({
            ...randomAd,
            type: (['banner', 'card', 'native', 'video'].includes(randomAd.type) ? randomAd.type : 'card') as 'banner' | 'card' | 'native' | 'video'
          });
        }
      } else {
        setSponsoredAd(null);
      }

    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      Alert.alert('Error', 'Could not fetch leaderboard data. Please try again later.');
    }
  }, []);

  // Initial data load and re-fetch when the screen is focused
  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      fetchLeaderboard().finally(() => setIsLoading(false));
    }
  }, [isFocused, fetchLeaderboard]);

  // Handler for the pull-to-refresh action
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchLeaderboard();
    setIsRefreshing(false);
  }, [fetchLeaderboard]);

  // Memoize derived data to prevent re-calculations on every render
  const { topThree, restOfBoard, currentUserRank } = useMemo(() => {
    const topThree = leaderboard.slice(0, 3);
    const restOfBoard = leaderboard.slice(3);
    const currentUserRank = leaderboard.find(u => u.user_id === currentUser?.id);
    return { topThree, restOfBoard, currentUserRank };
  }, [leaderboard, currentUser?.id]);

  // Display a loading indicator on the very first load
  if (isLoading && leaderboard.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={restOfBoard}
        keyExtractor={(item) => item.user_id}
        style={{ width: '100%' }}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Ionicons name="trophy" size={40} color={colors.primary} />
              <Text style={styles.title}>Leaderboard</Text>
              <Text style={styles.subtitle}>Top contributors based on price reports submitted.</Text>
            </View>
            {topThree.length >= 3 && (
              <View style={styles.podiumContainer}>
                <PodiumItem user={topThree[1]} rank={2} colors={colors} />
                <PodiumItem user={topThree[0]} rank={1} colors={colors} />
                <PodiumItem user={topThree[2]} rank={3} colors={colors} />
              </View>
            )}
            <Text style={styles.listHeader}>All Ranks</Text>
          </>
        }
        renderItem={({ item, index }) => (
          <>
            <View style={[styles.listItem, item.user_id === currentUser?.id && { backgroundColor: colors.primaryOpaque }]}>
              <Text style={styles.rank}>{item.rank_number}</Text>
              <LetterAvatar avatarUrl={item.avatar_url} name={item.full_name} size={40} />
              <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
              <Text style={styles.score}>{item.report_count} reports</Text>
            </View>
            {/* Inject sponsored ad after the 3rd item in the list (Rank 6) */}
            {index === 2 && sponsoredAd && (
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <AdvertCard advert={sponsoredAd} />
              </View>
            )}
          </>
        )}
        ListEmptyComponent={
          leaderboard.length === 0 && !isLoading ? (
            <Text style={styles.emptyText}>The leaderboard is empty. Start reporting prices to get on the board!</Text>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />

      {currentUserRank && currentUserRank.rank_number > 3 && (
        <UserRankBanner user={currentUserRank} colors={colors} />
      )}
    </SafeAreaView>
  );
}

// Centralized styling function that depends on the theme
const getThemedStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingTop: 10, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 8, color: colors.text },
  subtitle: { fontSize: 14, marginTop: 4, textAlign: 'center', color: colors.textSecondary },
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 30, width: '100%' },
  podiumItem: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  rankBadge: { position: 'absolute', bottom: -5, right: -5, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  rankBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  podiumName: { marginTop: 10, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  podiumScore: { fontSize: 12, fontWeight: '500', color: colors.primary },
  listHeader: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 10, color: colors.text },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  rank: { fontSize: 16, fontWeight: 'bold', width: 40, textAlign: 'center', color: colors.textSecondary },
  name: { flex: 1, fontSize: 16, fontWeight: '500', marginLeft: 12, color: colors.text },
  score: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  userRankBanner: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, backgroundColor: colors.primary, borderTopColor: colors.border },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: colors.textSecondary, paddingHorizontal: 20 },
});