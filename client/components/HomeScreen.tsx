import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Image, ScrollView, TouchableOpacity, Animated, Keyboard, TouchableWithoutFeedback, Platform, Easing } from 'react-native';
import CustomText from './CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { profileService } from '../lib/profileService';
import RecentlyCookedSheet from './experimental/RecentlyCookedSheet';
import Favorites from './experimental/Favorites';
import ContextualSheet, { OriginRect } from './experimental/ContextualSheet';

// Recipe Card Component for Search Results
const RecipeSearchCard = ({ item, search, onPress }: { item: any; search: string; onPress: () => void }) => {
  const [imageError, setImageError] = useState(false);
  const title = item.title || 'Untitled Recipe';
  
  const renderHighlightedTitle = (text: string, searchTerm: string) => {
    if (!searchTerm) {
      return <CustomText style={styles.recipeCardTitle} numberOfLines={1}>{text}</CustomText>;
    }
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {parts.map((part, i) => {
          const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
          return (
            <CustomText
              key={i}
              style={isMatch ? [styles.recipeCardTitle, styles.highlightedText] : styles.recipeCardTitle}
            >
              {part}
            </CustomText>
          );
        })}
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.recipeCard}
      activeOpacity={0.9}
    >
      {item.image_url && !imageError ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.recipeCardImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.recipeCardImage, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="restaurant-outline" size={32} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.recipeCardContent}>
        <View style={{ marginBottom: 8 }}>
          {renderHighlightedTitle(title, search)}
        </View>
        <View style={styles.recipeCardMeta}>
          <View style={styles.recipeCardMetaItem}>
            <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
            <CustomText style={styles.recipeCardMetaText}>
              {item.time || item.prep_time || item.cooking_time || 'N/A'}
              {item.time || item.prep_time || item.cooking_time ? ' min' : ''}
            </CustomText>
          </View>
          <View style={styles.recipeCardMetaItem}>
            <Ionicons name="flame-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
            <CustomText style={styles.recipeCardMetaText}>
              {item.calories || item.calorie_count ? `${item.calories || item.calorie_count} cal` : 'N/A'}
            </CustomText>
          </View>
          <View style={styles.recipeCardMetaItem}>
            <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
            <CustomText style={styles.recipeCardMetaText}>
              {item.rating || item.average_rating || '4.5'}
            </CustomText>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.recipeCardArrow}
        onPress={(e) => {
          e.stopPropagation();
          onPress();
        }}
      >
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
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

  // Search functionality
  useEffect(() => {
    if (!search) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch(`https://familycooksclean.onrender.com/recipes/list?q=${encodeURIComponent(search)}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearching(false);
        })
        .catch(() => { setSearchResults([]); setSearching(false); });
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // Animate dropdown in/out
  useEffect(() => {
    if (searchTouched && search.length > 0) {
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 180,
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
    setSearchResults([]);
    Keyboard.dismiss();
  }

  const userName = profile?.name || 'there';

  return (
    <TouchableWithoutFeedback onPress={closeDropdown} accessible={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top']}>
        {/* Header always at the top, fills safe area */}
        <View style={styles.headerBg}>
          <View style={styles.headerRow}>
            <CustomText style={styles.logoText}>🍳</CustomText>
            <View style={{ flex: 1 }} />
            <Image
              source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../assets/images/avatar.png')}
              style={styles.avatar}
            />
          </View>
          <CustomText style={styles.greetingText}>Hello, {userName} 👋</CustomText>
          <CustomText style={styles.subGreeting}>What would you like to cook today?</CustomText>
        </View>

        {/* Main scrollable content */}
        <View style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
          {/* Floating Search Bar, overlaps header */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={22} color="#B0B0B0" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Ask or search for anything"
                placeholderTextColor="#B0B0B0"
                value={search}
                onChangeText={t => { setSearch(t); setSearchTouched(true); }}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => setSearchTouched(true)}
              />
            </View>
            {/* Results dropdown - hidden when showing full results */}
            {searchTouched && search.length > 0 && searchResults.length === 0 && !searching && (
              <View style={styles.resultsDropdown}>
                <CustomText style={{ textAlign: 'center', color: '#A0AEC0', marginTop: 12, marginBottom: 12, fontSize: 15 }}>
                  No results for '{search}'
                </CustomText>
              </View>
            )}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, marginTop: 24 }} showsVerticalScrollIndicator={false}>
            {/* Search Results Section */}
            {searchTouched && search.length > 0 && (
              <View style={styles.searchResultsSection}>
                <View style={styles.searchResultsHeader}>
                  <CustomText style={styles.searchResultsTitle}>Top Matches</CustomText>
                  {searchResults.length > 0 && (
                    <TouchableOpacity onPress={() => {
                      router.push({ pathname: '/recipes', params: { search } });
                      closeDropdown();
                    }}>
                      <CustomText style={styles.seeAllLink}>See all</CustomText>
                    </TouchableOpacity>
                  )}
                </View>

                {searching ? (
                  <View style={styles.searchLoadingContainer}>
                    <Animated.Image
                      source={require('../assets/images/fork-knife.png')}
                      style={{ width: 32, height: 32, tintColor: '#4CAF50', transform: [{ scale: pulseAnim }] }}
                    />
                    <CustomText style={styles.searchLoadingText}>Searching...</CustomText>
                  </View>
                ) : searchResults.length > 0 ? (
                  <View style={styles.searchResultsList}>
                    {searchResults.slice(0, 4).map((item, idx) => (
                      <RecipeSearchCard
                        key={item.id || item.title || idx}
                        item={item}
                        search={search}
                        onPress={() => {
                          router.push({ pathname: '/recipe-detail', params: { id: item.id } });
                          closeDropdown();
                        }}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            )}

            {/* Main Action Grid */}
            {(!searchTouched || search.length === 0) && (
              <View style={styles.gridContainer}>
              <TouchableOpacity style={[styles.gridCard, styles.gridCardGreen]} onPress={() => router.push('/chat')} activeOpacity={0.92}>
                <Ionicons name="sparkles" size={32} color="#fff" style={styles.gridIcon} />
                <CustomText style={styles.gridCardTitle}>Ask AI Chef</CustomText>
                <CustomText style={styles.gridCardDesc}>Get instant meal ideas</CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                ref={recentlyCookedTileRef}
                style={[styles.gridCard, styles.gridCardPurple]}
                activeOpacity={0.92}
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
              >
                <Ionicons name="flame" size={32} color="#fff" style={styles.gridIcon} />
                <CustomText style={styles.gridCardTitle}>Recently Cooked</CustomText>
                <CustomText style={styles.gridCardDesc}>{recentlyCooked.length} recipes</CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                ref={favoritesTileRef}
                style={[styles.gridCard, styles.gridCardYellow]}
                activeOpacity={0.92}
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
              >
                <Ionicons name="heart" size={32} color="#fff" style={styles.gridIcon} />
                <CustomText style={styles.gridCardTitle}>Favorites</CustomText>
                <CustomText style={styles.gridCardDesc}>{favorites.length} saved</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.gridCard, styles.gridCardBlue]} activeOpacity={0.92}>
                <Ionicons name="bulb" size={32} color="#fff" style={styles.gridIcon} />
                <CustomText style={styles.gridCardTitle}>Surprise Me</CustomText>
                <CustomText style={styles.gridCardDesc}>Random recipe idea</CustomText>
              </TouchableOpacity>
            </View>
            )}
          </ScrollView>
        </View>

        {/* ContextualSheet for Recently Cooked */}
        {(showRecentlyCooked && recentlyCookedOrigin && recentlyCookedOrigin.width > 0 && recentlyCookedOrigin.height > 0) && (
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
        {/* Only render ContextualSheet for Favorites if origin is valid */}
        {(showContextualFavorites && favoritesOrigin && favoritesOrigin.width > 0 && favoritesOrigin.height > 0) && (
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
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    backgroundColor: '#F3F0FF',
    paddingTop: Platform.OS === 'ios' ? 48 : 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#222',
    letterSpacing: 0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 12,
    backgroundColor: '#D1E7DD',
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#222',
    marginTop: 2,
    marginLeft: 2,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 8,
  },
  searchBarWrapper: {
    alignItems: 'center',
    marginTop: -28,
    marginBottom: 18,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 18,
    height: 54,
    width: '92%',
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#222',
    fontFamily: 'System',
    paddingVertical: 0,
  },
  resultsDropdown: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginTop: 8,
    width: '92%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  resultItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F6F9',
    backgroundColor: 'transparent',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 17,
    color: '#222',
    fontWeight: '500',
    marginLeft: 2,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 18,
    marginTop: 8,
  },
  gridCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 28,
    marginBottom: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCardGreen: {
    backgroundColor: '#B6E2D3',
  },
  gridCardPurple: {
    backgroundColor: '#D6D6F7',
  },
  gridCardYellow: {
    backgroundColor: '#FFF3C4',
  },
  gridCardBlue: {
    backgroundColor: '#C7E6FB',
  },
  gridIcon: {
    marginBottom: 12,
  },
  gridCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  gridCardDesc: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  searchResultsSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  searchLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  searchLoadingText: {
    color: '#4CAF50',
    marginTop: 12,
    fontWeight: '600',
    fontSize: 15,
  },
  searchResultsList: {
    // gap handled by marginBottom in recipeCard
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  recipeCardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  recipeCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  recipeCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 22,
  },
  highlightedText: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  recipeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
}); 