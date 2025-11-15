import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CustomText from '../../components/CustomText';
import { socialService } from '../../lib/socialService';
import { supabase } from '../../lib/supabase';

type FeedItem = {
  id: string;
  title: string;
  time?: string | null;
  tags?: string[] | null;
  ingredients?: string[] | null;
  created_at: string;
  user_id: string;
  is_favorited?: boolean;
  favorite_count?: number;
  author?: {
    id: string;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

type UserResult = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  is_following?: boolean;
};

const SEGMENTS: Array<{ id: 'feed' | 'discover'; label: string }> = [
  { id: 'feed', label: 'Feed' },
  { id: 'discover', label: 'Discover' },
];

// Avatar component with fallback
const UserAvatar = ({
  avatarUrl,
  size = 48,
  style,
}: {
  avatarUrl?: string | null;
  size?: number;
  style?: any;
}) => {
  const [imageError, setImageError] = React.useState(false);
  
  // Reset error state when avatarUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);
  
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#F0FDF4',
    borderWidth: 2.5,
    borderColor: '#D1FAE5',
    overflow: 'hidden' as const,
  };

  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[avatarStyle, style]}
        onError={() => setImageError(true)}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[avatarStyle, { alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name="person" size={size * 0.55} color="#4F9E7A" />
    </View>
  );
};

export default function SocialScreen() {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<'feed' | 'discover'>('feed');

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadFeed = useCallback(async () => {
    setFeedError(null);
    try {
      if (!feedRefreshing) {
        setLoadingFeed(true);
      }
      const results = await socialService.getFeed(40);
      setFeed(Array.isArray(results) ? results : []);
    } catch (error: any) {
      console.log('[social] loadFeed error', error);
      setFeedError('Unable to load feed right now.');
    } finally {
      setLoadingFeed(false);
      setFeedRefreshing(false);
    }
  }, [feedRefreshing]);

  const handleRefreshFeed = useCallback(() => {
    setFeedRefreshing(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeSegment === 'feed') {
        loadFeed();
      }
    }, [activeSegment, loadFeed])
  );

  useEffect(() => {
    if (feedRefreshing) {
      loadFeed();
    }
  }, [feedRefreshing, loadFeed]);

  useEffect(() => {
    if (activeSegment !== 'discover') {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await socialService.searchUsers(searchTerm);
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (error: any) {
        console.log('[social] search error', error);
        setSearchError('Unable to search users right now.');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, activeSegment]);

  const handleFollowToggle = useCallback(async (user: UserResult) => {
    const optimisticValue = !user.is_following;
    setSearchResults(prev =>
      prev.map(item =>
        item.id === user.id ? { ...item, is_following: optimisticValue } : item
      )
    );

    try {
      if (optimisticValue) {
        await socialService.followUser(user.id);
      } else {
        await socialService.unfollowUser(user.id);
      }
    } catch (error: any) {
      console.log('[social] follow toggle error', error);
      Alert.alert('Action Failed', 'Please try again.');
      setSearchResults(prev =>
        prev.map(item =>
          item.id === user.id ? { ...item, is_following: !optimisticValue } : item
        )
      );
    }
  }, []);

  const handleFeedFavoriteToggle = useCallback(async (recipe: FeedItem) => {
    if (!userId || !recipe.id) return;

    const wasFavorited = recipe.is_favorited || false;
    const currentFavoriteCount = recipe.favorite_count || 0;

    // Optimistic update
    setFeed(prev =>
      prev.map(item =>
        item.id === recipe.id
          ? {
              ...item,
              is_favorited: !wasFavorited,
              favorite_count: wasFavorited
                ? Math.max(0, currentFavoriteCount - 1)
                : currentFavoriteCount + 1,
            }
          : item
      )
    );

    try {
      const url = 'https://familycooksclean.onrender.com/recipes/favorite';
      if (!wasFavorited) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipe.id }),
        });
        if (!res.ok) throw new Error('Failed to favorite');
      } else {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipe.id }),
        });
        if (!res.ok) throw new Error('Failed to unfavorite');
      }
    } catch (error: any) {
      console.log('[social] favorite toggle error', error);
      Alert.alert('Action Failed', 'Please try again.');
      // Revert optimistic update
      setFeed(prev =>
        prev.map(item =>
          item.id === recipe.id
            ? {
                ...item,
                is_favorited: wasFavorited,
                favorite_count: currentFavoriteCount,
              }
            : item
        )
      );
    }
  }, [userId]);

  // Format relative time (e.g., "2h ago", "3d ago")
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
      
      return (
        <TouchableOpacity
          style={styles.feedCard}
          activeOpacity={0.88}
          onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
        >
          {/* Author Header */}
          <View style={styles.feedCardHeader}>
            <TouchableOpacity
              style={styles.authorBadge}
              activeOpacity={0.85}
              onPress={(e) => {
                e.stopPropagation();
                if (item.author?.id) {
                  router.push({ pathname: '/user-profile', params: { user_id: item.author.id } });
                }
              }}
            >
              <UserAvatar avatarUrl={item.author?.avatar_url} size={44} />
              <View style={styles.authorInfo}>
                <CustomText style={styles.authorName}>
                  {item.author?.display_name || item.author?.username || 'Unknown Chef'}
                </CustomText>
                <View style={styles.authorMetaRow}>
                  <CustomText style={styles.authorHandle}>
                    @{item.author?.username || 'chef'}
                  </CustomText>
                  <CustomText style={styles.feedCardTimestamp}>
                    • {formatRelativeTime(item.created_at)}
                  </CustomText>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Recipe Title */}
          <CustomText style={styles.feedCardTitle} numberOfLines={2}>
            {item.title}
          </CustomText>

          {/* Recipe Metadata Row */}
          <View style={styles.feedCardMetaRow}>
            {!!item.time && (
              <View style={styles.feedMetaChip}>
                <Ionicons name="time-outline" size={14} color="#64748B" />
                <CustomText style={styles.feedMetaChipText}>{item.time}</CustomText>
              </View>
            )}
            {ingredients.length > 0 && (
              <View style={styles.feedMetaChip}>
                <Ionicons name="list-outline" size={14} color="#64748B" />
                <CustomText style={styles.feedMetaChipText}>
                  {ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                </CustomText>
              </View>
            )}
            {(item.favorite_count || 0) > 0 && (
              <View style={styles.feedMetaChip}>
                <Ionicons name="heart" size={14} color="#E4576A" />
                <CustomText style={[styles.feedMetaChipText, styles.favoriteCountText]}>
                  {item.favorite_count}
                </CustomText>
              </View>
            )}
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.feedTagsRow}>
              {tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.feedTagChip}>
                  <CustomText style={styles.feedTagText}>{tag}</CustomText>
                </View>
              ))}
              {tags.length > 3 && (
                <CustomText style={styles.moreTagsText}>+{tags.length - 3} more</CustomText>
              )}
            </View>
          )}

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.feedFavoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleFeedFavoriteToggle(item);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {item.is_favorited ? (
              <Ionicons name="heart" size={22} color="#E4576A" />
            ) : (
              <Ionicons name="heart-outline" size={22} color="#94A3B8" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [router, handleFeedFavoriteToggle]
  );

  const feedEmptyComponent = useMemo(() => {
    if (loadingFeed) {
      return null;
    }
    const message = feedError
      ? feedError
      : 'Follow some cooks to start building your feed.';
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-circle-outline" size={56} color="#9CA3AF" />
        <CustomText style={styles.emptyHeading}>No recipes yet</CustomText>
        <CustomText style={styles.emptyText}>{message}</CustomText>
      </View>
    );
  }, [feedError, loadingFeed]);

  const renderUserRow = useCallback(
    ({ item }: { item: UserResult }) => {
      return (
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/user-profile', params: { user_id: item.id } })}
        >
          <View style={styles.userInfo}>
            <UserAvatar avatarUrl={item.avatar_url} size={56} />
            <View style={styles.userDetails}>
              <CustomText style={styles.userName}>
                {item.display_name || item.username || 'New Chef'}
              </CustomText>
              <CustomText style={styles.userHandle}>@{item.username || 'chef'}</CustomText>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.followButton, item.is_following && styles.followButtonActive]}
            onPress={(e) => {
              e.stopPropagation();
              handleFollowToggle(item);
            }}
            activeOpacity={0.85}
          >
            <CustomText
              style={[
                styles.followButtonText,
                item.is_following && styles.followButtonTextActive,
              ]}
            >
              {item.is_following ? 'Following' : 'Follow'}
            </CustomText>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handleFollowToggle, router]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <CustomText style={styles.headerTitle}>Community Kitchen</CustomText>
        <CustomText style={styles.headerSubtitle}>
          Follow friends, swap favorites, and see what’s cooking.
        </CustomText>
        <View style={styles.segmentContainer}>
          {SEGMENTS.map(segment => {
            const isActive = segment.id === activeSegment;
            return (
              <TouchableOpacity
                key={segment.id}
                style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                onPress={() => setActiveSegment(segment.id)}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}
                >
                  {segment.label}
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeSegment === 'feed' ? (
        <View style={styles.feedContainer}>
          {loadingFeed ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F9E7A" />
            </View>
          ) : (
            <FlatList
              data={feed}
              keyExtractor={item => item.id}
              renderItem={renderFeedItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={feedRefreshing}
                  onRefresh={handleRefreshFeed}
                  tintColor="#4F9E7A"
                />
              }
              ListEmptyComponent={feedEmptyComponent}
            />
          )}
        </View>
      ) : (
        <View style={styles.discoverContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Find friends by name or username"
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {!!searchTerm && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color="#CBD5F5" />
              </TouchableOpacity>
            )}
          </View>

          {searchError && (
            <CustomText style={styles.errorText}>{searchError}</CustomText>
          )}

          {searchTerm.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-circle-outline" size={56} color="#9CA3AF" />
              <CustomText style={styles.emptyHeading}>Start exploring</CustomText>
              <CustomText style={styles.emptyText}>
                Search for friends, family, or favorite creators to follow.
              </CustomText>
            </View>
          ) : searching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F9E7A" />
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              renderItem={renderUserRow}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="person-add-outline" size={48} color="#9CA3AF" />
                  <CustomText style={styles.emptyHeading}>No matches yet</CustomText>
                  <CustomText style={styles.emptyText}>
                    Try a different name or invite friends to join.
                  </CustomText>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#101828',
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#475467',
    lineHeight: 20,
  },
  segmentContainer: {
    marginTop: 20,
    flexDirection: 'row',
    backgroundColor: '#E5EBF8',
    borderRadius: 24,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentLabelActive: {
    color: '#256D85',
  },
  feedContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  listContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    position: 'relative',
  },
  feedCardHeader: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 14,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  authorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorHandle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  feedCardTimestamp: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
  },
  feedCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  feedCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  feedMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  feedMetaChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  metaChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  favoriteCountText: {
    color: '#E4576A',
  },
  feedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  feedTagChip: {
    backgroundColor: '#F0F9F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  feedTagText: {
    fontSize: 12,
    color: '#2F855A',
    fontWeight: '700',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  feedFavoriteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  discoverContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 52,
    gap: 12,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  userHandle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  followButton: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: '#4F9E7A',
    shadowColor: 'rgba(79, 158, 122, 0.25)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  followButtonActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#4F9E7A',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  followButtonTextActive: {
    color: '#2F855A',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyHeading: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
});


