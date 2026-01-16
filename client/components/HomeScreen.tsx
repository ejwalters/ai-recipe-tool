import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Image, ScrollView, TouchableOpacity, Animated, Keyboard, TouchableWithoutFeedback, Platform, Easing, Dimensions, FlatList } from 'react-native';
import CustomText from './CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { profileService } from '../lib/profileService';
import RecentlyCookedSheet from './experimental/RecentlyCookedSheet';
import Favorites from './experimental/Favorites';
import FriendsCookedSheet from './experimental/FriendsCookedSheet';
import FriendsPopover from './experimental/FriendsPopover';
import ContextualSheet, { OriginRect } from './experimental/ContextualSheet';
import { getRecipeIconConfig, getDifficultyLevel } from '../utils/recipeIcons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38; // Compact tiles for recently cooked

// Recipe Card Component for Search Results - Enhanced
const RecipeSearchCard = ({ item, search, onPress, index = 0, onFriendsPress }: { item: any; search: string; onPress: () => void; index?: number; onFriendsPress?: (friends: any[], recipeTitle: string, ref: any) => void }) => {
  const iconConfig = getRecipeIconConfig(item.title || '', item.tags || [], index, item);
  
  // Real friends cooked data (from backend)
  const friendsCooked = item.friends_cooked || [];
  const friendsCookedCount = item.friends_cooked_count || 0;
  const title = item.title || 'Untitled Recipe';
  const [friendsSectionPressed, setFriendsSectionPressed] = React.useState(false);
  const friendsSectionRef = React.useRef<View>(null);
  
  // Render highlighted title - allow 2 lines for better readability
  const renderHighlightedTitle = (text: string, searchTerm: string) => {
    if (!searchTerm) {
      return (
        <CustomText style={styles.verticalFavoriteTitle} numberOfLines={2} ellipsizeMode="tail">
          {text}
        </CustomText>
      );
    }
    // For highlighted search results, use nested Text components for highlighting
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <CustomText style={styles.verticalFavoriteTitle} numberOfLines={2} ellipsizeMode="tail">
        {parts.map((part, i) => {
          const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
          return (
            <CustomText
              key={i}
              style={isMatch ? { color: '#256D85', fontWeight: '700' } : {}}
            >
              {part}
            </CustomText>
          );
        })}
      </CustomText>
    );
  };

  return (
    <TouchableOpacity
      onPress={() => {
        if (!friendsSectionPressed) {
          onPress();
        }
        setFriendsSectionPressed(false);
      }}
      style={styles.verticalFavoriteCard}
      activeOpacity={0.9}
    >
      <View style={[styles.verticalFavoriteIconSquare, { backgroundColor: iconConfig.backgroundColor }]}>
        {iconConfig.library === 'MaterialCommunityIcons' ? (
          <MaterialCommunityIcons name={iconConfig.name as any} size={28} color={iconConfig.iconColor} />
        ) : (
          <Ionicons name={iconConfig.name as any} size={28} color={iconConfig.iconColor} />
        )}
      </View>
      <View style={styles.verticalFavoriteContent}>
        {renderHighlightedTitle(title, search)}
        <View style={styles.verticalFavoriteMeta}>
          {item.time && (
            <View style={styles.verticalFavoriteMetaItem}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <CustomText style={styles.verticalFavoriteMetaText}>{item.time} min</CustomText>
            </View>
          )}
        </View>
        {/* Real friends cooked data - Tappable */}
        {friendsCookedCount > 0 && (
          <View
            ref={friendsSectionRef}
            collapsable={false}
            style={styles.friendsCookedWrapper}
          >
            <TouchableOpacity
              onPressIn={() => setFriendsSectionPressed(true)}
              onPress={() => {
                if (onFriendsPress && friendsCookedCount > 0) {
                  // Measure the wrapper View to get exact position
                  if (friendsSectionRef.current) {
                    friendsSectionRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                      onFriendsPress(friendsCooked, title, { x, y, width, height });
                    });
                  } else {
                    // Fallback: use approximate position
                    onFriendsPress(friendsCooked, title, { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2, width: 200, height: 40 });
                  }
                }
                setFriendsSectionPressed(false);
              }}
              activeOpacity={0.7}
              style={styles.friendsCooked}
            >
            <View style={styles.friendAvatars}>
              {friendsCooked.slice(0, 3).map((friend: any, idx: number) => (
                friend.avatar_url ? (
                  <Image
                    key={friend.id || idx}
                    source={{ uri: friend.avatar_url }}
                    style={[styles.friendAvatar, styles.friendAvatarImage, { marginLeft: idx > 0 ? -8 : 0 }]}
                  />
                ) : (
                  <View
                    key={friend.id || idx}
                    style={[styles.friendAvatar, styles.friendAvatarPlaceholder, { marginLeft: idx > 0 ? -8 : 0 }]}
                  >
                    <CustomText style={styles.friendAvatarInitial}>
                      {friend.display_name?.charAt(0).toUpperCase() || '?'}
                    </CustomText>
                  </View>
                )
              ))}
            </View>
            <CustomText style={styles.friendsCookedText}>
              +{friendsCookedCount} {friendsCookedCount === 1 ? 'friend cooked' : 'friends cooked'}
            </CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Horizontal Recipe Card Component (Recently Cooked style - colored square with icon)
const HorizontalRecipeCard = ({ item, onPress, index = 0 }: { item: any; onPress: () => void; index?: number }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconConfig = getRecipeIconConfig(item.title || '', item.tags || [], index, item);
  const isFavorited = item.is_favorited || false;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: CARD_WIDTH }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.horizontalRecipeCardNew}
        activeOpacity={0.95}
      >
        <View style={[styles.horizontalRecipeIconSquare, { backgroundColor: iconConfig.backgroundColor }]}>
          {iconConfig.library === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons name={iconConfig.name as any} size={40} color={iconConfig.iconColor} />
          ) : (
            <Ionicons name={iconConfig.name as any} size={40} color={iconConfig.iconColor} />
          )}
          {isFavorited && (
            <View style={styles.favoriteBadge}>
              <Ionicons name="heart" size={12} color="#EF4444" />
            </View>
          )}
        </View>
        <View style={styles.horizontalRecipeContentNew}>
          <CustomText style={styles.horizontalRecipeTitleNew} numberOfLines={2}>
            {item.title || 'Untitled Recipe'}
          </CustomText>
          <View style={styles.horizontalRecipeMetaNew}>
            {item.time && (
              <View style={styles.horizontalRecipeMetaItemNew}>
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <CustomText style={styles.horizontalRecipeMetaTextNew}>{item.time} min</CustomText>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Vertical Favorite Recipe Card (for Your Favorites section)
const VerticalFavoriteCard = ({ item, onPress, index = 0, onFriendsPress }: { item: any; onPress: () => void; index?: number; onFriendsPress?: (friends: any[], recipeTitle: string, ref: any) => void }) => {
  const iconConfig = getRecipeIconConfig(item.title || '', item.tags || [], index, item);
  
  // Real friends cooked data (from backend)
  const friendsCooked = item.friends_cooked || [];
  const friendsCookedCount = item.friends_cooked_count || 0;
  
  const [friendsSectionPressed, setFriendsSectionPressed] = React.useState(false);
  const friendsSectionRef = React.useRef<View>(null);

  return (
    <TouchableOpacity
      onPress={() => {
        if (!friendsSectionPressed) {
          onPress();
        }
        setFriendsSectionPressed(false);
      }}
      style={styles.verticalFavoriteCard}
      activeOpacity={0.9}
    >
      <View style={[styles.verticalFavoriteIconSquare, { backgroundColor: iconConfig.backgroundColor }]}>
        {iconConfig.library === 'MaterialCommunityIcons' ? (
          <MaterialCommunityIcons name={iconConfig.name as any} size={28} color={iconConfig.iconColor} />
        ) : (
          <Ionicons name={iconConfig.name as any} size={28} color={iconConfig.iconColor} />
        )}
      </View>
      <View style={styles.verticalFavoriteContent}>
        <CustomText style={styles.verticalFavoriteTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.title || 'Untitled Recipe'}
        </CustomText>
        <View style={styles.verticalFavoriteMeta}>
          {item.time && (
            <View style={styles.verticalFavoriteMetaItem}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <CustomText style={styles.verticalFavoriteMetaText}>{item.time} min</CustomText>
            </View>
          )}
        </View>
        {/* Real friends cooked data - Tappable */}
        {friendsCookedCount > 0 && (
          <View
            ref={friendsSectionRef}
            collapsable={false}
            style={styles.friendsCookedWrapper}
          >
            <TouchableOpacity
              onPressIn={() => setFriendsSectionPressed(true)}
              onPress={() => {
                if (onFriendsPress && friendsCookedCount > 0) {
                  // Measure the wrapper View to get exact position
                  if (friendsSectionRef.current) {
                    friendsSectionRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                      onFriendsPress(friendsCooked, item.title || 'Untitled Recipe', { x, y, width, height });
                    });
                  } else {
                    // Fallback
                    onFriendsPress(friendsCooked, item.title || 'Untitled Recipe', { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2, width: 200, height: 40 });
                  }
                }
                setFriendsSectionPressed(false);
              }}
              activeOpacity={0.7}
              style={styles.friendsCooked}
            >
              <View style={styles.friendAvatars}>
                {friendsCooked.slice(0, 3).map((friend: any, idx: number) => (
                  friend.avatar_url ? (
                    <Image
                      key={friend.id || idx}
                      source={{ uri: friend.avatar_url }}
                      style={[styles.friendAvatar, styles.friendAvatarImage, { marginLeft: idx > 0 ? -8 : 0 }]}
                    />
                  ) : (
                    <View
                      key={friend.id || idx}
                      style={[styles.friendAvatar, styles.friendAvatarPlaceholder, { marginLeft: idx > 0 ? -8 : 0 }]}
                    >
                      <CustomText style={styles.friendAvatarInitial}>
                        {friend.display_name?.charAt(0).toUpperCase() || '?'}
                      </CustomText>
                    </View>
                  )
                ))}
              </View>
              <CustomText style={styles.friendsCookedText}>
                +{friendsCookedCount} {friendsCookedCount === 1 ? 'friend cooked' : 'friends cooked'}
              </CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// AI Chef Assistant Card Component
const AIChefCard = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.aiChefCard}
      activeOpacity={0.9}
    >
      <View style={styles.aiChefIconContainer}>
        <Ionicons name="sparkles" size={28} color="#256D85" />
      </View>
      <View style={styles.aiChefContent}>
        <CustomText style={styles.aiChefTitle}>AI Chef Assistant</CustomText>
        <CustomText style={styles.aiChefDesc}>Get personalized recipe ideas</CustomText>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchBarScale = useRef(new Animated.Value(1)).current;
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentlyCooked, setRecentlyCooked] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ avatar_url?: string; name?: string } | null>(null);

  // Modal state for Recently Cooked
  const [showRecentlyCooked, setShowRecentlyCooked] = React.useState(false);
  const [showFavorites, setShowFavorites] = React.useState(false);
  const [showContextualFavorites, setShowContextualFavorites] = React.useState(false);
  const [favoritesOrigin, setFavoritesOrigin] = React.useState<OriginRect | null>(null);
  const favoritesTileRef = React.useRef<any>(null);
  const [recentlyCookedOrigin, setRecentlyCookedOrigin] = React.useState<OriginRect | null>(null);
  const recentlyCookedTileRef = React.useRef<any>(null);
  const modalAnim = React.useRef(new Animated.Value(0)).current;
  
  // Modal state for Friends Cooked
  const [showFriendsCooked, setShowFriendsCooked] = React.useState(false);
  const [friendsCookedOrigin, setFriendsCookedOrigin] = React.useState<OriginRect | null>(null);
  const [friendsCookedData, setFriendsCookedData] = React.useState<{ friends: any[]; recipeTitle?: string } | null>(null);

  // Fetch user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  // Fetch profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await profileService.getProfile();
        setProfile(profileData);
      } catch (e) {
        console.log('HomeScreen profile load error:', e);
      }
    };
    loadProfile();
  }, []);

  // Fetch favorites function
  const fetchFavorites = () => {
    console.log('Fetching favorites for userId:', userId);
    if (!userId) return;
    fetch(`https://familycooksclean.onrender.com/recipes/favorites?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        console.log('Raw favorites response:', data);
        const favoritesArray = Array.isArray(data) ? data : [];
        setFavorites(favoritesArray);
      })
      .catch((err) => {
        console.error('Error fetching favorites:', err);
        setFavorites([]);
      });
  };

  // Fetch recently cooked function
  const fetchRecentlyCooked = () => {
    if (!userId) return;
    fetch(`https://familycooksclean.onrender.com/recipes/recently-cooked?user_id=${userId}&limit=5`)
      .then(res => res.json())
      .then(data => {
        const recentlyCookedArray = Array.isArray(data) ? data : [];
        setRecentlyCooked(recentlyCookedArray);
      })
      .catch((err) => {
        console.error('Error fetching recently cooked:', err);
        setRecentlyCooked([]);
      });
  };


  // Fetch data on mount and when userId changes
  useEffect(() => {
    fetchFavorites();
    fetchRecentlyCooked();
  }, [userId]);

  // Force reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites();
      fetchRecentlyCooked();
    }, [userId])
  );

  // Handler for friends cooked press
  const handleFriendsCookedPress = (friends: any[], recipeTitle: string, origin: OriginRect) => {
    setFriendsCookedData({ friends, recipeTitle });
    setFriendsCookedOrigin(origin);
    setShowFriendsCooked(true);
  };

  // Search functionality
  useEffect(() => {
    if (!search) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      const url = userId 
        ? `https://familycooksclean.onrender.com/recipes/list?q=${encodeURIComponent(search)}&user_id=${userId}`
        : `https://familycooksclean.onrender.com/recipes/list?q=${encodeURIComponent(search)}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearching(false);
        })
        .catch(() => { setSearchResults([]); setSearching(false); });
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, userId]);

  // Animate search bar focus
  useEffect(() => {
    Animated.spring(searchBarScale, {
      toValue: searchFocused ? 1.02 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [searchFocused]);

  // Animate dropdown in/out
  useEffect(() => {
    if (searchTouched && search.length > 0) {
      Animated.spring(dropdownAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [searchTouched, search]);

  // Pulsing animation for fork-knife
  useEffect(() => {
    if (searching) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [searching]);

  // Animate modal in/out
  React.useEffect(() => {
    if (showRecentlyCooked) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.exp),
        useNativeDriver: true,
      }).start();
    }
  }, [showRecentlyCooked]);

  function closeDropdown() {
    setSearch('');
    setSearchTouched(false);
    setSearchFocused(false);
    setSearchResults([]);
    Keyboard.dismiss();
  }

  const userName = profile?.name?.split(' ')[0] || 'there';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <TouchableWithoutFeedback onPress={closeDropdown} accessible={false}>
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 0, backgroundColor: '#F3F0FF' }} edges={['top']}>
          {/* Enhanced Header */}
          <View style={[styles.headerBg, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
            <View style={styles.headerRow}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBadge}>
                  <CustomText style={styles.logoText}>🍳</CustomText>
                </View>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <View style={styles.avatarContainer}>
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <CustomText style={styles.avatarInitial}>
                        {userName.charAt(0).toUpperCase()}
                      </CustomText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.greetingContainer}>
              <CustomText style={styles.greetingTime}>{greeting}</CustomText>
              <CustomText style={styles.greetingText}>{userName}!</CustomText>
            </View>
          </View>
        </SafeAreaView>

        {/* Main Content */}
        <View style={styles.contentWrapper}>
          {/* Enhanced Search Bar */}
          <Animated.View 
            style={[
              styles.searchBarWrapper,
              { transform: [{ scale: searchBarScale }] }
            ]}
          >
            <View style={[
              styles.searchBar,
              searchFocused && styles.searchBarFocused
            ]}>
              <Ionicons 
                name="search" 
                size={22} 
                color={searchFocused ? "#256D85" : "#9CA3AF"} 
                style={{ marginRight: 12 }} 
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search recipes, ingredients, or ask AI..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={t => { setSearch(t); setSearchTouched(true); }}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => {
                  setSearchTouched(true);
                  setSearchFocused(true);
                }}
                onBlur={() => setSearchFocused(false)}
              />
              {search.length > 0 && (
                <TouchableOpacity 
                  onPress={closeDropdown}
                  style={styles.searchClear}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 120 }]}
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEventThrottle={16}
          >
            {/* Search Results */}
            {searchTouched && search.length > 0 && (
              <View style={styles.searchResultsSection}>
                <View style={styles.searchResultsHeader}>
                  <CustomText style={styles.searchResultsTitle}>
                    {searching ? 'Searching...' : searchResults.length > 0 ? 'Top Results' : 'No Results'}
                  </CustomText>
                  {searchResults.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => {
                        router.push({ pathname: '/recipes', params: { search } });
                        closeDropdown();
                      }}
                      activeOpacity={0.7}
                    >
                      <CustomText style={styles.seeAllLink}>See all</CustomText>
                    </TouchableOpacity>
                  )}
                </View>

                {searching ? (
                  <View style={styles.searchLoadingContainer}>
                    <Animated.Image
                      source={require('../assets/images/fork-knife.png')}
                      style={{ 
                        width: 36, 
                        height: 36, 
                        tintColor: '#256D85', 
                        transform: [{ scale: pulseAnim }] 
                      }}
                    />
                    <CustomText style={styles.searchLoadingText}>Finding recipes...</CustomText>
                  </View>
                ) : (
                  <View style={styles.searchResultsList}>
                    {/* AI Recipe Creation Card - Always shown when searching */}
                    <TouchableOpacity
                      style={styles.aiRecipeCard}
                      onPress={() => {
                        router.push({ 
                          pathname: '/chat', 
                          params: { initialMessage: encodeURIComponent(`Create a recipe with ${search}`) }
                        });
                        closeDropdown();
                      }}
                      activeOpacity={0.9}
                    >
                      <View style={styles.aiRecipeIconContainer}>
                        <Ionicons name="sparkles" size={28} color="#256D85" />
                      </View>
                      <View style={styles.aiRecipeContent}>
                        <CustomText style={styles.aiRecipeTitle}>Create AI Recipe</CustomText>
                        <CustomText style={styles.aiRecipeSubtitle}>Generate a recipe with "{search}"</CustomText>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Recipe Results */}
                    {searchResults.length > 0 && (
                      <View style={styles.verticalFavoritesList}>
                        {searchResults.slice(0, 4).map((item, idx) => (
                          <RecipeSearchCard
                            key={item.id || item.title || idx}
                            item={item}
                            search={search}
                            index={idx}
                            onPress={() => {
                              router.push({ pathname: '/recipe-detail', params: { id: item.id } });
                              closeDropdown();
                            }}
                            onFriendsPress={handleFriendsCookedPress}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Main Content - New Layout */}
            {(!searchTouched || search.length === 0) && (
              <>
                {/* AI Chef Assistant Card */}
                <View style={styles.sectionContainer}>
                  <AIChefCard onPress={() => router.push('/chat')} />
                </View>

                {/* Recently Cooked - Horizontal Scroll */}
                {recentlyCooked.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <CustomText style={styles.sectionTitle}>Recently Cooked</CustomText>
                      <TouchableOpacity
                        ref={recentlyCookedTileRef}
                        onPress={() => {
                          if (recentlyCookedTileRef.current) {
                            recentlyCookedTileRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                              setRecentlyCookedOrigin({ x, y, width, height });
                              setShowRecentlyCooked(true);
                              setShowContextualFavorites(false);
                              setShowFavorites(false);
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <CustomText style={styles.seeAllLink}>See All</CustomText>
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={recentlyCooked.slice(0, 10)}
                      renderItem={({ item, index }) => (
                        <HorizontalRecipeCard
                          item={item}
                          index={index}
                          onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
                        />
                      )}
                      keyExtractor={(item, index) => item.id || index.toString()}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalListContent}
                      ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                    />
                  </View>
                )}

                {/* Your Favorites - Vertical List */}
                {favorites.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <CustomText style={styles.sectionTitle}>Your Favorites</CustomText>
                      <TouchableOpacity
                        ref={favoritesTileRef}
                        onPress={() => {
                          if (favoritesTileRef.current) {
                            favoritesTileRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                              setFavoritesOrigin({ x, y, width, height });
                              setShowContextualFavorites(true);
                              setShowFavorites(false);
                              setShowRecentlyCooked(false);
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <CustomText style={styles.seeAllLink}>See All</CustomText>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.verticalFavoritesList}>
                      {favorites.slice(0, 3).map((item, index) => (
                        <VerticalFavoriteCard
                          key={item.id || index}
                          item={item}
                          index={index}
                          onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
                          onFriendsPress={handleFriendsCookedPress}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Quick Actions */}
                <View style={styles.quickActionsSection}>
                  <View style={styles.quickActionsTitleContainer}>
                    <CustomText style={styles.sectionTitle}>Quick Actions</CustomText>
                  </View>
                  <View style={styles.quickActionsContainer}>
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => router.push('/add-recipe-photo')}
                      activeOpacity={0.9}
                    >
                      <View style={styles.quickActionIconCircle}>
                        <Ionicons name="camera" size={24} color="#256D85" />
                      </View>
                      <CustomText style={styles.quickActionText}>Scan Recipe</CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => router.push('/add-recipe-manual')}
                      activeOpacity={0.9}
                    >
                      <View style={styles.quickActionIconCircle}>
                        <Ionicons name="create-outline" size={24} color="#256D85" />
                      </View>
                      <CustomText style={styles.quickActionText}>Add Manually</CustomText>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* Modals */}
        {(showRecentlyCooked && recentlyCookedOrigin && recentlyCookedOrigin.width > 0) && (
          <ContextualSheet
            visible={showRecentlyCooked}
            onClose={() => setShowRecentlyCooked(false)}
            origin={recentlyCookedOrigin}
          >
            <RecentlyCookedSheet
              recipes={recentlyCooked}
              router={router}
              onClose={() => setShowRecentlyCooked(false)}
            />
          </ContextualSheet>
        )}
        {(showContextualFavorites && favoritesOrigin && favoritesOrigin.width > 0) && (
          <ContextualSheet
            visible={showContextualFavorites}
            onClose={() => setShowContextualFavorites(false)}
            origin={favoritesOrigin}
          >
            <Favorites
              onClose={() => setShowContextualFavorites(false)}
              recipes={favorites}
              router={router}
            />
          </ContextualSheet>
        )}
        {showFriendsCooked && friendsCookedData && friendsCookedOrigin && (
          <FriendsPopover
            visible={showFriendsCooked}
            friends={friendsCookedData.friends}
            recipeTitle={friendsCookedData.recipeTitle}
            router={router}
            onClose={() => setShowFriendsCooked(false)}
            origin={friendsCookedOrigin}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBg: {
    backgroundColor: '#F3F0FF',
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#256D85',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  logoText: {
    fontSize: 24,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: '#256D85',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  greetingContainer: {
    marginTop: 4,
  },
  greetingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 22,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  searchBarWrapper: {
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 24,
    paddingHorizontal: 24,
    zIndex: 10,
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
  searchBarFocused: {
    borderColor: '#256D85',
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'System',
    paddingVertical: 0,
  },
  searchClear: {
    padding: 4,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0, // Set dynamically based on tab bar height
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  gridCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    height: 180,
    borderRadius: 24,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  gridCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gridCardContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  gridCardGreen: {
    backgroundColor: '#6DA98C',
  },
  gridCardPurple: {
    backgroundColor: '#9B87F5',
  },
  gridCardYellow: {
    backgroundColor: '#F4C430',
  },
  gridCardBlue: {
    backgroundColor: '#4A90E2',
  },
  gridCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  gridCardDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 18,
  },
  searchResultsSection: {
    paddingHorizontal: 0,
    marginTop: 8,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  searchResultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  seeAllLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#256D85',
  },
  searchLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  searchLoadingText: {
    color: '#256D85',
    marginTop: 16,
    fontWeight: '600',
    fontSize: 16,
  },
  searchResultsList: {
    gap: 12,
    paddingHorizontal: 0,
  },
  aiRecipeCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    marginHorizontal: 24,
    shadowColor: '#256D85',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  aiRecipeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#256D85',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  aiRecipeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  aiRecipeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  aiRecipeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 20,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  recipeCardImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 16,
  },
  recipeCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  recipeCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 24,
    marginBottom: 8,
  },
  highlightedText: {
    color: '#256D85',
    fontWeight: '700',
  },
  recipeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recipeCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  recipeCardMetaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  recipeCardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptySearchState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptySearchText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  // Sections
  sectionContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  quickActionsSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  quickActionsTitleContainer: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  // Horizontal Recipe Cards
  horizontalListContent: {
    paddingHorizontal: 24,
  },
  horizontalRecipeCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  horizontalRecipeImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  horizontalRecipeImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalRecipeContent: {
    padding: 16,
  },
  horizontalRecipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  horizontalRecipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  horizontalRecipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  horizontalRecipeMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  // AI Chef Card
  aiChefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  aiChefIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  aiChefContent: {
    flex: 1,
  },
  aiChefTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  aiChefDesc: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Horizontal Recipe Card (New - with colored square icon)
  horizontalRecipeCardNew: {
    width: CARD_WIDTH,
  },
  horizontalRecipeIconSquare: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  horizontalRecipeContentNew: {
    paddingHorizontal: 4,
  },
  horizontalRecipeTitleNew: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  horizontalRecipeMetaNew: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalRecipeMetaItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  horizontalRecipeMetaTextNew: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 3,
  },
  // Vertical Favorite Card
  verticalFavoriteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  verticalFavoriteIconSquare: {
    width: 70,
    height: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  verticalFavoriteContent: {
    flex: 1,
  },
  verticalFavoriteTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
    maxWidth: '100%',
  },
  verticalFavoriteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verticalFavoriteMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  verticalFavoriteMetaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  friendsCookedWrapper: {
    alignSelf: 'flex-start',
  },
  friendsCooked: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendAvatarImage: {
    backgroundColor: '#F3F4F6',
  },
  friendAvatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarInitial: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  friendsCookedText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  verticalFavoritesList: {
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 12,
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  quickActionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
}); 