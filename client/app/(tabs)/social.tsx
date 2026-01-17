import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CustomText from '../../components/CustomText';
import { socialService } from '../../lib/socialService';
import { supabase } from '../../lib/supabase';
import { getRecipeIconConfig, getDifficultyLevel } from '../../utils/recipeIcons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FeedItem = {
  id: string;
  title: string;
  time?: string | null;
  tags?: string[] | null;
  ingredients?: string[] | null;
  created_at: string;
  user_id: string;
  is_favorited?: boolean; // Like (social signal)
  is_saved?: boolean; // Save to My Recipes
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
  follower_count?: number | null;
  recipes_count?: number | null;
  profession?: string | null;
};

const SEGMENTS: Array<{ id: 'for_you' | 'following' | 'trending'; label: string }> = [
  { id: 'for_you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
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
    backgroundColor: '#F3F4F6',
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
      <Ionicons name="person" size={size * 0.55} color="#9CA3AF" />
    </View>
  );
};

// Discover Loading Skeleton Component
const DiscoverLoadingSkeleton = () => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Pulsing animation for avatars
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer animation for skeleton lines
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Animated.View key={i} style={[styles.skeletonUserRow, { opacity: shimmerOpacity }]}>
          <View style={styles.skeletonUserInfo}>
            <Animated.View style={[styles.skeletonUserAvatar, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="person" size={32} color="#D1D5DB" />
            </Animated.View>
            <View style={styles.skeletonUserDetails}>
              <Animated.View style={[styles.skeletonLine, styles.skeletonUserName, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonUserHandle, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonUserStats, { opacity: shimmerOpacity }]} />
            </View>
          </View>
          <Animated.View style={[styles.skeletonFollowButton, { opacity: shimmerOpacity }]} />
        </Animated.View>
      ))}
    </View>
  );
};

// Feed Loading Skeleton Component
const FeedLoadingSkeleton = () => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Pulsing animation for avatars
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer animation for skeleton lines
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.listContent}>
      {[1, 2, 3, 4].map((i) => (
        <Animated.View key={i} style={[styles.skeletonFeedCard, { opacity: shimmerOpacity }]}>
          {/* Header with avatar and name */}
          <View style={styles.skeletonFeedHeader}>
            <Animated.View style={[styles.skeletonFeedAvatar, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="person" size={20} color="#CBD5F5" />
            </Animated.View>
            <View style={styles.skeletonFeedAuthorInfo}>
              <Animated.View style={[styles.skeletonLine, styles.skeletonFeedAuthorName, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonLine, styles.skeletonFeedTime, { opacity: shimmerOpacity }]} />
            </View>
          </View>

          {/* Recipe title */}
          <Animated.View style={[styles.skeletonLine, styles.skeletonFeedTitle, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonLine, styles.skeletonFeedTitleShort, { opacity: shimmerOpacity }]} />

          {/* Meta info */}
          <View style={styles.skeletonFeedMeta}>
            <Animated.View style={[styles.skeletonLine, styles.skeletonFeedMetaItem, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonLine, styles.skeletonFeedMetaItem, { opacity: shimmerOpacity }]} />
          </View>

          {/* Tags */}
          <View style={styles.skeletonTagsRow}>
            <Animated.View style={[styles.skeletonTag, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonTag, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonTag, { opacity: shimmerOpacity }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

export default function SocialScreen() {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<'for_you' | 'following' | 'trending'>('for_you');

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedOffset, setFeedOffset] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const feedLoadedRef = useRef(false); // Track if feed has been loaded at least once

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<UserResult[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSearchedRef = useRef(false); // Track if user has performed at least one search
  const suggestedLoadedRef = useRef(false); // Track if suggested creators have been loaded
  const searchInputRef = useRef<TextInput>(null);

  const loadFeed = useCallback(async (isInitial = false, offset = 0) => {
    setFeedError(null);
    const isRefreshing = feedRefreshing || (offset === 0 && !isInitial);
    const isLoadingMore = offset > 0;

    try {
      if (isLoadingMore) {
        setLoadingMoreFeed(true);
      } else if (!isRefreshing) {
        setLoadingFeed(true);
      }

      // Map segment to feed type
      const feedType = activeSegment === 'for_you' ? 'for_you' : 
                      activeSegment === 'following' ? 'following' : 
                      'trending';
      
      const response = await socialService.getFeed(40, offset, feedType);
      
      // Handle both old format (array) and new format (object with recipes array)
      let recipes: FeedItem[];
      let hasMore = false;
      
      if (Array.isArray(response)) {
        // Legacy format - just an array
        recipes = response;
        hasMore = false; // Can't know if there's more with old format
      } else {
        // New format with pagination metadata
        recipes = response?.recipes || [];
        hasMore = response?.has_more || false;
      }

      if (offset === 0) {
        // Initial load or refresh - replace all recipes
        setFeed(recipes);
        setFeedOffset(recipes.length);
      } else {
        // Load more - append to existing recipes
        setFeed(prev => {
          // Filter out duplicates (shouldn't happen, but safety check)
          const existingIds = new Set(prev.map(r => r.id));
          const newRecipes = recipes.filter(r => !existingIds.has(r.id));
          return [...prev, ...newRecipes];
        });
        setFeedOffset(prev => prev + recipes.length);
      }

      setFeedHasMore(hasMore);

      if (isInitial || !feedLoadedRef.current) {
        feedLoadedRef.current = true;
      }
    } catch (error: any) {
      console.log('[social] loadFeed error', error);
      setFeedError('Unable to load feed right now.');
    } finally {
      setLoadingFeed(false);
      setLoadingMoreFeed(false);
      setFeedRefreshing(false);
    }
  }, [feedRefreshing, activeSegment]);

  const handleRefreshFeed = useCallback(() => {
    setFeedRefreshing(true);
    setFeedOffset(0);
    setFeedHasMore(false);
    loadFeed(false, 0);
  }, [loadFeed]);

  const handleLoadMoreFeed = useCallback(() => {
    if (!loadingMoreFeed && !loadingFeed && feedHasMore) {
      loadFeed(false, feedOffset);
    }
  }, [loadingMoreFeed, loadingFeed, feedHasMore, feedOffset, loadFeed]);

  // Load feed when segment changes or on initial mount
  useEffect(() => {
    // Reset feed when switching segments
    if (activeSegment === 'for_you' || activeSegment === 'following' || activeSegment === 'trending') {
      feedLoadedRef.current = false;
      setFeed([]);
      setFeedOffset(0);
      loadFeed(true, 0);
    }
  }, [activeSegment, loadFeed]);

  // Don't reload on focus if feed is already loaded
  useFocusEffect(
    useCallback(() => {
      // Only reload on focus if feed hasn't been loaded yet
      // This prevents reloading when navigating back from recipe/profile
      if ((activeSegment === 'for_you' || activeSegment === 'following' || activeSegment === 'trending') && !feedLoadedRef.current) {
        loadFeed(true);
      }
    }, [activeSegment, loadFeed])
  );

  // Removed - handleRefreshFeed now directly calls loadFeed

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  // Search users when search term changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!showSearch || !searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      hasSearchedRef.current = false;
      return;
    }

    // Only show skeleton on the very first search
    // After that, keep showing previous results while searching (no skeleton on backspace/refinement)
    const isInitialSearch = !hasSearchedRef.current;
    if (isInitialSearch) {
      setSearching(true);
      setSearchResults([]); // Clear any stale results for initial search
    }
    setSearchError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await socialService.searchUsers(searchTerm);
        setSearchResults(Array.isArray(results) ? results : []);
        hasSearchedRef.current = true; // Mark that we've searched at least once
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
  }, [searchTerm, showSearch]);

  const handleFollowToggle = useCallback(async (user: UserResult) => {
    const optimisticValue = !user.is_following;
    
    // Update search results if user is in search results
    setSearchResults(prev =>
      prev.map(item =>
        item.id === user.id ? { ...item, is_following: optimisticValue } : item
      )
    );
    
    // Update suggested creators if user is in suggested creators
    setSuggestedCreators(prev =>
      prev.map(item =>
        item.id === user.id ? { ...item, is_following: optimisticValue } : item
      )
    );

    // Update follower count optimistically
    setSearchResults(prev =>
      prev.map(item =>
        item.id === user.id 
          ? { 
              ...item, 
              is_following: optimisticValue,
              follower_count: optimisticValue 
                ? (item.follower_count || 0) + 1 
                : Math.max((item.follower_count || 0) - 1, 0)
            } 
          : item
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
      
      // Revert search results
      setSearchResults(prev =>
        prev.map(item =>
          item.id === user.id ? { ...item, is_following: !optimisticValue } : item
        )
      );
      
      // Revert suggested creators
      setSuggestedCreators(prev =>
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

  const handleFeedSaveToggle = useCallback(async (recipe: FeedItem) => {
    if (!userId || !recipe.id) return;

    const wasSaved = recipe.is_saved || false;

    // Optimistic update
    setFeed(prev =>
      prev.map(item =>
        item.id === recipe.id
          ? {
              ...item,
              is_saved: !wasSaved,
            }
          : item
      )
    );

    try {
      // Bookmark = copy recipe to user's recipes
      const url = 'https://familycooksclean.onrender.com/recipes/bookmark';
      if (!wasSaved) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipe.id }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to bookmark recipe');
        }
      } else {
        // Unbookmark: Delete the user's copy of the recipe
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipe.id }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to unbookmark recipe');
        }
      }
    } catch (error: any) {
      console.log('[social] bookmark toggle error', error);
      Alert.alert('Action Failed', error.message || 'Please try again.');
      // Revert optimistic update
      setFeed(prev =>
        prev.map(item =>
          item.id === recipe.id
            ? {
                ...item,
                is_saved: wasSaved,
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
    ({ item, index }: { item: FeedItem; index: number }) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
      const iconConfig = getRecipeIconConfig(item.title || '', tags, index, item);
      const difficulty = getDifficultyLevel(item);
      
      return (
        <View style={styles.feedCard}>
          {/* Author Header */}
          <View style={styles.feedCardHeader}>
            <TouchableOpacity
              style={styles.authorBadge}
              activeOpacity={0.85}
              onPress={() => {
                if (item.author?.id) {
                  router.push({ pathname: '/user-profile', params: { user_id: item.author.id } });
                }
              }}
            >
              <UserAvatar avatarUrl={item.author?.avatar_url} size={40} />
              <View style={styles.authorInfo}>
                <CustomText style={styles.authorName}>
                  {item.author?.display_name || item.author?.username || 'Unknown Chef'}
                </CustomText>
                <CustomText style={styles.feedCardTimestamp}>
                  {formatRelativeTime(item.created_at)}
                </CustomText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={() => {}}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Recipe Icon Display */}
          <View style={[styles.recipeIconDisplay, { backgroundColor: iconConfig.backgroundColor }]}>
            {iconConfig.library === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons 
                name={iconConfig.name as any} 
                size={120} 
                color={iconConfig.iconColor} 
              />
            ) : (
              <Ionicons 
                name={iconConfig.name as any} 
                size={120} 
                color={iconConfig.iconColor} 
              />
            )}
          </View>

          {/* Recipe Title */}
          <CustomText style={styles.feedCardTitle} numberOfLines={2}>
            {item.title}
          </CustomText>

          {/* Recipe Metrics Row */}
          <View style={styles.feedCardMetricsRow}>
            {!!item.time && (
              <View style={styles.feedMetricItem}>
                <Ionicons name="time-outline" size={16} color="#10B981" />
                <CustomText style={styles.feedMetricText}>{item.time}</CustomText>
              </View>
            )}
            {ingredients.length > 0 && (
              <View style={styles.feedMetricItem}>
                <Ionicons name="list-outline" size={16} color="#F59E0B" />
                <CustomText style={styles.feedMetricText}>
                  {ingredients.length} {ingredients.length === 1 ? 'ing' : 'ing'}
                </CustomText>
              </View>
            )}
            <View style={styles.feedMetricItem}>
              <Ionicons name="trending-up-outline" size={16} color="#10B981" />
              <CustomText style={[styles.feedMetricText, { color: difficulty.color }]}>
                {difficulty.text}
              </CustomText>
            </View>
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.feedTagsRow}>
              {tags.slice(0, 3).map((tag, tagIndex) => {
                const tagColors = [
                  { bg: '#F0FDF4', text: '#16A34A' }, // Green
                  { bg: '#FEF3C7', text: '#D97706' }, // Orange/Amber
                  { bg: '#E0F2FE', text: '#0284C7' }, // Blue
                ];
                const tagColor = tagColors[tagIndex % tagColors.length];
                return (
                  <View key={tag} style={[styles.feedTagChip, { backgroundColor: tagColor.bg }]}>
                    <CustomText style={[styles.feedTagText, { color: tagColor.text }]}>{tag}</CustomText>
                  </View>
                );
              })}
              {tags.length > 3 && (
                <CustomText style={styles.moreTagsText}>+{tags.length - 3} more</CustomText>
              )}
            </View>
          )}

          {/* Engagement & Action Row */}
          <View style={styles.feedEngagementRow}>
            <View style={styles.feedEngagementLeft}>
              {/* Like Button (Heart) */}
              <TouchableOpacity
                style={styles.feedEngagementButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleFeedFavoriteToggle(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {item.is_favorited ? (
                  <Ionicons name="heart" size={20} color="#E4576A" />
                ) : (
                  <Ionicons name="heart-outline" size={20} color="#6B7280" />
                )}
                {(item.favorite_count || 0) > 0 && (
                  <CustomText style={styles.feedEngagementCount}>
                    {item.favorite_count}
                  </CustomText>
                )}
              </TouchableOpacity>
              
              {/* Save Button (Bookmark) */}
              <TouchableOpacity
                style={styles.feedEngagementButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleFeedSaveToggle(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {item.is_saved ? (
                  <Ionicons name="bookmark" size={20} color="#256D85" />
                ) : (
                  <Ionicons name="bookmark-outline" size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
            
            {/* Cook This Button */}
            <TouchableOpacity
              style={styles.cookThisButton}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
            >
              <CustomText style={styles.cookThisButtonText}>Cook This</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [router, handleFeedFavoriteToggle, handleFeedSaveToggle]
  );

  const feedEmptyComponent = useMemo(() => {
    if (loadingFeed) {
      return null;
    }
    if (feed.length === 0 && !feedError) {
      // User has 0 follows - show onboarding state
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-circle-outline" size={64} color="#9CA3AF" />
          <CustomText style={styles.emptyHeading}>Follow a few cooks to build your feed</CustomText>
          <CustomText style={styles.emptyText}>
            Discover amazing recipes from chefs you follow
          </CustomText>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setActiveSegment('discover')}
            activeOpacity={0.85}
          >
            <CustomText style={styles.emptyStateButtonText}>Find creators</CustomText>
          </TouchableOpacity>
        </View>
      );
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
  }, [feedError, loadingFeed, feed.length]);

  const renderUserRow = useCallback(
    ({ item }: { item: UserResult }) => {
      const formatNumber = (num: number | null | undefined) => {
        if (!num && num !== 0) return '0';
        if (num >= 1000) {
          return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
      };

      const displayName = item.display_name || item.username || 'New Chef';
      const username = item.username || 'chef';
      const profession = item.profession || null;
      const followerCount = formatNumber(item.follower_count);
      const recipeCount = formatNumber(item.recipes_count);

      return (
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/user-profile', params: { user_id: item.id } })}
        >
          <View style={styles.userInfo}>
            <UserAvatar avatarUrl={item.avatar_url} size={64} />
            <View style={styles.userDetails}>
              <CustomText style={styles.userName}>{displayName}</CustomText>
              <CustomText style={styles.userHandle}>
                @{username}{profession ? ` · ${profession}` : ''}
              </CustomText>
              <View style={styles.userStats}>
                <CustomText style={styles.userStatText}>
                  {followerCount} Followers
                </CustomText>
                <CustomText style={styles.userStatDivider}> · </CustomText>
                <CustomText style={styles.userStatText}>
                  {recipeCount} Recipes
                </CustomText>
              </View>
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
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.menuButton} activeOpacity={0.7}>
            <Ionicons name="menu" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <CustomText style={styles.headerTitle}>Recipe Feed</CustomText>
          </View>
          <TouchableOpacity 
            style={styles.searchIconButton} 
            activeOpacity={0.7}
            onPress={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                setSearchTerm('');
                setSearchResults([]);
              }
            }}
          >
            <Ionicons name={showSearch ? "close" : "search"} size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search chefs and food lovers..."
                placeholderTextColor="#9CA3AF"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.segmentContainer}>
          {SEGMENTS.map((segment, index) => {
            const isActive = segment.id === activeSegment;
            return (
              <TouchableOpacity
                key={segment.id}
                style={[
                  styles.segmentButton,
                  isActive && styles.segmentButtonActive,
                ]}
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

      {showSearch ? (
        <View style={styles.searchContainer}>
          {searching && searchResults.length === 0 ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <CustomText style={styles.searchLoadingText}>Searching...</CustomText>
            </View>
          ) : searchError ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
              <CustomText style={styles.emptyHeading}>Search Error</CustomText>
              <CustomText style={styles.emptyText}>{searchError}</CustomText>
            </View>
          ) : searchTerm.trim() && searchResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-add-outline" size={56} color="#9CA3AF" />
              <CustomText style={styles.emptyHeading}>No creators found</CustomText>
              <CustomText style={styles.emptyText}>Try a different search term</CustomText>
            </View>
          ) : searchTerm.trim() ? (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              renderItem={renderUserRow}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#9CA3AF" />
              <CustomText style={styles.emptyHeading}>Search for creators</CustomText>
              <CustomText style={styles.emptyText}>
                Find friends, family, or favorite creators to follow
              </CustomText>
            </View>
          )}
        </View>
      ) : (activeSegment === 'for_you' || activeSegment === 'following' || activeSegment === 'trending') ? (
        <View style={styles.feedContainer}>
          {loadingFeed && !feedLoadedRef.current ? (
            <FeedLoadingSkeleton />
          ) : (
            <FlatList
              data={feed}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => renderFeedItem({ item, index })}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={feedRefreshing}
                  onRefresh={handleRefreshFeed}
                  tintColor="#4F9E7A"
                />
              }
              ListEmptyComponent={feedEmptyComponent}
              onEndReached={handleLoadMoreFeed}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMoreFeed ? (
                  <View style={styles.feedFooter}>
                    <ActivityIndicator size="small" color="#4F9E7A" />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  searchIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    height: 56,
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'System',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  searchLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  searchLoadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    marginBottom: 16,
    gap: 12,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '400',
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    minWidth: 100,
  },
  segmentButtonActive: {
    backgroundColor: '#10B981',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 32,
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  feedCardTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  recipeIconDisplay: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
  },
  feedCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 26,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  feedCardMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  feedMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedMetricText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  feedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  feedTagChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  feedTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  feedEngagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedEngagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  feedEngagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedEngagementCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  cookThisButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cookThisButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  discoverContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  suggestedSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  userHandle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userStatText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  userStatDivider: {
    fontSize: 13,
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  followButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonActive: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  followButtonTextActive: {
    color: '#6B7280',
    fontWeight: '600',
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
  emptyStateButton: {
    marginTop: 24,
    backgroundColor: '#256D85',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  // Feed Loading Skeleton Styles
  skeletonFeedCard: {
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
  },
  skeletonFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonFeedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2F9EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D1FAE5',
    marginRight: 12,
  },
  skeletonFeedAuthorInfo: {
    flex: 1,
  },
  skeletonLine: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  skeletonFeedAuthorName: {
    width: 120,
    height: 16,
    marginBottom: 8,
  },
  skeletonFeedTime: {
    width: 80,
    height: 12,
  },
  skeletonFeedTitle: {
    width: '85%',
    height: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  skeletonFeedTitleShort: {
    width: '60%',
    height: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  skeletonFeedMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  skeletonFeedMetaItem: {
    width: 60,
    height: 14,
  },
  skeletonTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTag: {
    width: 70,
    height: 24,
    borderRadius: 12,
  },
  // Discover Loading Skeleton Styles
  skeletonUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  skeletonUserAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonUserDetails: {
    marginLeft: 16,
    flex: 1,
  },
  skeletonUserName: {
    width: 140,
    height: 17,
    marginBottom: 6,
    borderRadius: 4,
  },
  skeletonUserHandle: {
    width: 120,
    height: 14,
    marginBottom: 6,
    borderRadius: 4,
  },
  skeletonUserStats: {
    width: 100,
    height: 13,
    borderRadius: 4,
  },
  skeletonFollowButton: {
    width: 90,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
});


