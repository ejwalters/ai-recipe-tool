import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import { socialService } from '../lib/socialService';
import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://familycooksclean.onrender.com';

type UserProfile = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  followers_count?: number;
  following_count?: number;
  recipes_count?: number;
  is_following?: boolean;
};

type Recipe = {
  id: string;
  title: string;
  time?: string | null;
  tags?: string[] | null;
  created_at: string;
  is_favorited?: boolean;
};

const UserAvatar = ({
  avatarUrl,
  size = 80,
}: {
  avatarUrl?: string | null;
  size?: number;
}) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#F0FDF4',
    borderWidth: 3,
    borderColor: '#D1FAE5',
    overflow: 'hidden' as const,
  };

  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={avatarStyle}
        onError={() => setImageError(true)}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[avatarStyle, { alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="person" size={size * 0.55} color="#4F9E7A" />
    </View>
  );
};

// Profile Loading Skeleton Component
const ProfileLoadingSkeleton = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing animation for avatar
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} disabled>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <CustomText style={styles.headerTitle}>Profile</CustomText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Skeleton */}
        <View style={styles.profileHeader}>
          <Animated.View style={[styles.skeletonAvatar, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="person" size={48} color="#CBD5F5" />
          </Animated.View>
          <View style={styles.profileInfo}>
            <Animated.View style={[styles.skeletonLine, styles.skeletonName, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonLine, styles.skeletonHandle, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonLine, styles.skeletonBio, { opacity: shimmerOpacity }]} />
          </View>
        </View>

        {/* Stats Row Skeleton */}
        <View style={styles.statsRow}>
          {[1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <Animated.View style={[styles.skeletonLine, styles.skeletonStatValue, { opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.skeletonLine, styles.skeletonStatLabel, { opacity: shimmerOpacity }]} />
              </View>
              {i < 3 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Follow Button Skeleton */}
        <Animated.View style={[styles.skeletonFollowButton, { opacity: shimmerOpacity }]} />

        {/* Tabs Skeleton */}
        <View style={styles.tabsContainer}>
          <Animated.View style={[styles.skeletonTab, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonTab, { opacity: shimmerOpacity }]} />
        </View>

        {/* Recipe Cards Skeleton */}
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => (
            <Animated.View key={i} style={[styles.skeletonRecipeCard, { opacity: shimmerOpacity }]}>
              <View style={styles.skeletonRecipeHeader}>
                <Animated.View style={[styles.skeletonLine, styles.skeletonRecipeTitle, { opacity: shimmerOpacity }]} />
              </View>
              <Animated.View style={[styles.skeletonLine, styles.skeletonRecipeMeta, { opacity: shimmerOpacity }]} />
              <View style={styles.skeletonTagsRow}>
                <Animated.View style={[styles.skeletonTag, { opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.skeletonTag, { opacity: shimmerOpacity }]} />
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.user_id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'favorites'>('recipes');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.back();
        return;
      }

      // Fetch profile with stats
      const response = await fetch(`${API_BASE_URL}/social/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load profile');

      const profileData = await response.json();
      setProfile(profileData);

      // Fetch recipes
      const recipesRes = await fetch(`${API_BASE_URL}/social/profile/${userId}/recipes`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        setRecipes(Array.isArray(recipesData) ? recipesData : []);
      }

      // Fetch favorites
      const favoritesRes = await fetch(`${API_BASE_URL}/social/profile/${userId}/favorites`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (favoritesRes.ok) {
        const favoritesData = await favoritesRes.json();
        setFavorites(Array.isArray(favoritesData) ? favoritesData : []);
      }
    } catch (error) {
      console.error('[user-profile] Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const handleFollowToggle = async () => {
    if (!profile || !currentUserId) return;

    const wasFollowing = profile.is_following;
    setProfile(prev => prev ? { ...prev, is_following: !prev.is_following } : null);

    try {
      if (wasFollowing) {
        await socialService.unfollowUser(profile.id);
        setProfile(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
      } else {
        await socialService.followUser(profile.id);
        setProfile(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
      }
    } catch (error) {
      console.error('[user-profile] Follow toggle error:', error);
      setProfile(prev => prev ? { ...prev, is_following: wasFollowing } : null);
    }
  };

  const renderRecipeCard = useCallback(
    ({ item }: { item: Recipe }) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      return (
        <TouchableOpacity
          style={styles.recipeCard}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
        >
          <View style={styles.recipeCardHeader}>
            <CustomText style={styles.recipeTitle} numberOfLines={2}>
              {item.title}
            </CustomText>
            {item.is_favorited && (
              <Ionicons name="heart" size={18} color="#E4576A" style={{ marginLeft: 8 }} />
            )}
          </View>
          {item.time && (
            <View style={styles.recipeMeta}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <CustomText style={styles.recipeMetaText}>{item.time}</CustomText>
            </View>
          )}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <CustomText style={styles.tagText}>{tag}</CustomText>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [router]
  );

  if (loading) {
    return <ProfileLoadingSkeleton />;
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <CustomText style={styles.headerTitle}>Profile</CustomText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#9CA3AF" />
          <CustomText style={styles.emptyText}>Profile not found</CustomText>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUserId === userId;
  const displayRecipes = activeTab === 'recipes' ? recipes : favorites;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <CustomText style={styles.headerTitle}>Profile</CustomText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F9E7A" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <UserAvatar avatarUrl={profile.avatar_url} size={96} />
          <View style={styles.profileInfo}>
            <CustomText style={styles.displayName}>
              {profile.display_name || profile.username || 'New Chef'}
            </CustomText>
            <CustomText style={styles.username}>@{profile.username || 'chef'}</CustomText>
            {profile.bio && (
              <CustomText style={styles.bio}>{profile.bio}</CustomText>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <CustomText style={styles.statValue}>{profile.recipes_count || 0}</CustomText>
            <CustomText style={styles.statLabel}>Recipes</CustomText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CustomText style={styles.statValue}>{profile.followers_count || 0}</CustomText>
            <CustomText style={styles.statLabel}>Followers</CustomText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CustomText style={styles.statValue}>{profile.following_count || 0}</CustomText>
            <CustomText style={styles.statLabel}>Following</CustomText>
          </View>
        </View>

        {/* Follow Button (if not own profile) */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followButton, profile.is_following && styles.followButtonActive]}
            onPress={handleFollowToggle}
            activeOpacity={0.85}
          >
            <CustomText
              style={[styles.followButtonText, profile.is_following && styles.followButtonTextActive]}
            >
              {profile.is_following ? 'Following' : 'Follow'}
            </CustomText>
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recipes' && styles.tabActive]}
            onPress={() => setActiveTab('recipes')}
            activeOpacity={0.85}
          >
            <CustomText style={[styles.tabLabel, activeTab === 'recipes' && styles.tabLabelActive]}>
              Recipes
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}
            activeOpacity={0.85}
          >
            <CustomText style={[styles.tabLabel, activeTab === 'favorites' && styles.tabLabelActive]}>
              Favorites
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Recipes/Favorites List */}
        {displayRecipes.length > 0 ? (
          <FlatList
            data={displayRecipes}
            renderItem={renderRecipeCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyListContainer}>
            <Ionicons
              name={activeTab === 'recipes' ? 'restaurant-outline' : 'heart-outline'}
              size={48}
              color="#CBD5F5"
            />
            <CustomText style={styles.emptyListText}>
              {activeTab === 'recipes'
                ? 'No recipes yet'
                : 'No favorite recipes yet'}
            </CustomText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  followButton: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#4F9E7A',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  followButtonTextActive: {
    color: '#2F855A',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: '#4F9E7A',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  recipeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recipeTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 24,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recipeMetaText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#F0F9F4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#2F855A',
    fontWeight: '600',
  },
  emptyListContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyListText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  // Loading Skeleton Styles
  skeletonAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E2F9EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#D1FAE5',
  },
  skeletonLine: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  skeletonName: {
    width: 180,
    height: 24,
    marginBottom: 8,
    borderRadius: 6,
  },
  skeletonHandle: {
    width: 120,
    height: 16,
    marginBottom: 12,
    borderRadius: 4,
  },
  skeletonBio: {
    width: 280,
    height: 16,
    borderRadius: 4,
  },
  skeletonStatValue: {
    width: 30,
    height: 22,
    marginBottom: 6,
    borderRadius: 4,
  },
  skeletonStatLabel: {
    width: 60,
    height: 13,
    borderRadius: 4,
  },
  skeletonFollowButton: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    height: 48,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  skeletonTab: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  skeletonRecipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  skeletonRecipeHeader: {
    marginBottom: 12,
  },
  skeletonRecipeTitle: {
    width: '80%',
    height: 20,
    marginBottom: 8,
    borderRadius: 4,
  },
  skeletonRecipeMeta: {
    width: 100,
    height: 14,
    marginBottom: 12,
    borderRadius: 4,
  },
  skeletonTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTag: {
    width: 70,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
});

