import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../../components/CustomText';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Heart, HeartIcon } from 'lucide-react-native';
import { profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';

const TAB_BAR_HEIGHT = 90;

const SEGMENTS: Array<{ id: 'all' | 'favorites'; label: string }> = [
    { id: 'all', label: 'All Recipes' },
    { id: 'favorites', label: 'Favorites' },
];

// Simple Search Bar Component - directly controlled like HomeScreen
// No memoization needed since it's outside the FlatList
const SearchBar = ({ 
    search, 
    onSearchChange, 
    placeholder 
}: { 
    search: string; 
    onSearchChange: (text: string) => void; 
    placeholder: string;
}) => {
    return (
        <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                    placeholder={placeholder}
                    style={styles.searchInput}
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={onSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {!!search && (
                    <TouchableOpacity onPress={() => onSearchChange('')}>
                        <Ionicons name="close-circle" size={18} color="#CBD5F5" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// Recipe Loading Skeleton Component
const RecipeLoadingSkeleton = () => {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;
    const shimmerAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        // Pulsing animation for icons
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
        <View style={styles.listContentContainer}>
            {[1, 2, 3, 4].map((i) => (
                <Animated.View key={i} style={[styles.skeletonRecipeCard, { opacity: shimmerOpacity }]}>
                    <View style={styles.skeletonRecipeCardBody}>
                        <Animated.View style={[styles.skeletonRecipeIcon, { transform: [{ scale: pulseAnim }] }]}>
                            <Ionicons name="fast-food-outline" size={22} color="#CBD5F5" />
                        </Animated.View>
                        <View style={styles.skeletonRecipeInfo}>
                            <Animated.View style={[styles.skeletonLine, styles.skeletonRecipeTitle, { opacity: shimmerOpacity }]} />
                            <Animated.View style={[styles.skeletonLine, styles.skeletonRecipeTitleShort, { opacity: shimmerOpacity }]} />
                            <View style={styles.skeletonRecipeMeta}>
                                <Animated.View style={[styles.skeletonLine, styles.skeletonRecipeMetaItem, { opacity: shimmerOpacity }]} />
                                <Animated.View style={[styles.skeletonLine, styles.skeletonRecipeIngredients, { opacity: shimmerOpacity }]} />
                            </View>
                            <View style={styles.skeletonRecipeTags}>
                                <Animated.View style={[styles.skeletonTag, { opacity: shimmerOpacity }]} />
                                <Animated.View style={[styles.skeletonTag, { opacity: shimmerOpacity }]} />
                            </View>
                        </View>
                    </View>
                    <Animated.View style={[styles.skeletonHeartButton, { opacity: shimmerOpacity }]} />
                </Animated.View>
            ))}
        </View>
    );
};

export default function RecipesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeSegment, setActiveSegment] = useState<'all' | 'favorites'>('all');
    const [allRecipes, setAllRecipes] = useState<any[]>([]);
    const [loadingAll, setLoadingAll] = useState(true);
    const [search, setSearch] = useState('');
    const [searchingAll, setSearchingAll] = useState(false);
    const fetchIdRef = useRef(0);
    const [favorited, setFavorited] = useState<{ [id: string]: boolean }>({});
    const [userId, setUserId] = useState<string | null>(null);
    const [favoriteRecipes, setFavoriteRecipes] = useState<any[]>([]);
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const [favoritesLoaded, setFavoritesLoaded] = useState(false);
    const [popularTagsData, setPopularTagsData] = useState<{ tag: string, count: number }[]>([]);
    const [popularTags, setPopularTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [profile, setProfile] = useState<{ avatar_url?: string | null } | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUserId(data.user.id);
                profileService.getProfile().then(setProfile).catch(() => setProfile(null));
            }
        });
    }, []);

    useEffect(() => {
        fetch('https://familycooksclean.onrender.com/recipes/tags/popular')
            .then(res => res.json())
            .then(data => {
                // Limit to top 3 most popular tags for the category filters
                if (Array.isArray(data)) {
                    const topTagsData = data.slice(0, 3);
                    setPopularTagsData(topTagsData);
                    const topTags = topTagsData.map((item: any) => item.tag || item);
                    setPopularTags(topTags);
                } else {
                    setPopularTagsData([]);
                    setPopularTags([]);
                }
            })
            .catch(() => {
                setPopularTagsData([]);
                setPopularTags([]);
            });
    }, []);

    const fetchAllRecipes = useCallback((searchTerm = '', tags: string[] = []) => {
        fetchIdRef.current += 1;
        const fetchId = fetchIdRef.current;
        let url = `https://familycooksclean.onrender.com/recipes/list?limit=100`;
        if (userId) {
            url += `&user_id=${userId}&filter_by_user=true`;
        }
        if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
        if (tags.length > 0) url += `&tags=${encodeURIComponent(tags.join(','))}`;

        if (!searchTerm && tags.length === 0) {
            setLoadingAll(true);
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (fetchId === fetchIdRef.current) {
                        setAllRecipes(Array.isArray(data) ? data : []);
                        if (Array.isArray(data)) {
                            const favMap: { [id: string]: boolean } = {};
                            data.forEach((r: any) => {
                                favMap[r.id] = !!r.is_favorited;
                            });
                            setFavorited(prev => ({ ...prev, ...favMap }));
                        }
                        setLoadingAll(false);
                        setSearchingAll(false);
                    }
                })
                .catch(() => {
                    if (fetchId === fetchIdRef.current) {
                        setLoadingAll(false);
                        setSearchingAll(false);
                    }
                });
            return;
        }
        setSearchingAll(true);
        const timeout = setTimeout(() => {
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (fetchId === fetchIdRef.current) {
                        setAllRecipes(Array.isArray(data) ? data : []);
                        if (Array.isArray(data)) {
                            const favMap: { [id: string]: boolean } = {};
                            data.forEach((r: any) => {
                                favMap[r.id] = !!r.is_favorited;
                            });
                            setFavorited(prev => ({ ...prev, ...favMap }));
                        }
                        setSearchingAll(false);
                        setLoadingAll(false);
                    }
                })
                .catch(() => {
                    if (fetchId === fetchIdRef.current) {
                        setSearchingAll(false);
                        setLoadingAll(false);
                    }
                });
        }, 400);
        return () => clearTimeout(timeout);
    }, [userId]);

    const fetchFavoriteRecipes = useCallback(async () => {
        if (!userId) return;
        setLoadingFavorites(true);
        try {
            const response = await fetch(`https://familycooksclean.onrender.com/recipes/favorites?user_id=${userId}`);
            const data = await response.json();
            const favoritesArray = Array.isArray(data) ? data : [];
            setFavoriteRecipes(favoritesArray);
            const favMap: { [id: string]: boolean } = {};
            favoritesArray.forEach((recipe: any) => {
                favMap[recipe.id] = true;
            });
            setFavorited(prev => ({ ...prev, ...favMap }));
            setFavoritesLoaded(true);
        } catch (error) {
            console.log('Failed to fetch favorites', error);
        } finally {
            setLoadingFavorites(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        if (activeSegment === 'all') {
            fetchAllRecipes(search, selectedCategories);
        }
    }, [activeSegment, search, selectedCategories, userId, fetchAllRecipes]);

    useEffect(() => {
        if (activeSegment === 'favorites') {
            if (selectedCategories.length > 0) {
                setSelectedCategories([]);
            }
            if (userId && !favoritesLoaded && !loadingFavorites) {
                fetchFavoriteRecipes();
            }
        }
    }, [activeSegment, userId, favoritesLoaded, loadingFavorites, fetchFavoriteRecipes, selectedCategories.length]);

    useFocusEffect(
        useCallback(() => {
            if (!userId) return;
            if (activeSegment === 'all') {
                fetchAllRecipes(search, selectedCategories);
            } else {
                fetchFavoriteRecipes();
            }
        }, [activeSegment, fetchAllRecipes, fetchFavoriteRecipes, search, selectedCategories, userId])
    );

    const handleToggleFavorite = async (recipeId: string) => {
        if (!userId) return;
        const currentlyFav = favorited[recipeId];
        setFavorited(fav => ({ ...fav, [recipeId]: !currentlyFav }));
        try {
            if (!currentlyFav) {
                const res = await fetch('https://familycooksclean.onrender.com/recipes/favorite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, recipe_id: recipeId }),
                });
                if (!res.ok) throw new Error('Failed to favorite');
            } else {
                const res = await fetch('https://familycooksclean.onrender.com/recipes/favorite', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, recipe_id: recipeId }),
                });
                if (!res.ok) throw new Error('Failed to unfavorite');
            }
            if (!currentlyFav) {
                const recipeToAdd =
                    allRecipes.find(r => r.id === recipeId) ||
                    favoriteRecipes.find(r => r.id === recipeId);
                if (recipeToAdd) {
                    setFavoriteRecipes(prev => {
                        if (prev.some(r => r.id === recipeId)) return prev;
                        return [...prev, recipeToAdd];
                    });
                }
            } else {
                setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
            }
        } catch (err) {
            setFavorited(fav => ({ ...fav, [recipeId]: currentlyFav }));
            alert('Failed to update favorite. Please try again.');
        }
    };

    function openAddRecipe() {
        router.push('/add-recipe');
    }

    const displayedFavorites = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        if (!normalized) return favoriteRecipes;
        return favoriteRecipes.filter(recipe =>
            recipe.title?.toLowerCase().includes(normalized)
        );
    }, [favoriteRecipes, search]);

    const getRecipeIconColor = (index: number) => {
        const colors = ['#FFE5D0', '#D1FAE5', '#E1D5FF', '#E6EEFF'];
        return colors[index % colors.length];
    };

    const getRecipeIcon = (title: string, index: number) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('pasta') || lowerTitle.includes('carbonara')) {
            return { name: 'restaurant-outline' as const, color: '#FFA94D' };
        } else if (lowerTitle.includes('salad') || lowerTitle.includes('garden')) {
            return { name: 'leaf-outline' as const, color: '#34D399' };
        } else if (lowerTitle.includes('cookie') || lowerTitle.includes('dessert') || lowerTitle.includes('chocolate')) {
            return { name: 'cafe-outline' as const, color: '#A78BFA' };
        } else if (lowerTitle.includes('fish') || lowerTitle.includes('salmon')) {
            return { name: 'fish-outline' as const, color: '#60A5FA' };
        }
        const defaultIcons = [
            { name: 'restaurant-outline' as const, color: '#FFA94D' },
            { name: 'leaf-outline' as const, color: '#34D399' },
            { name: 'cafe-outline' as const, color: '#A78BFA' },
            { name: 'fish-outline' as const, color: '#60A5FA' },
        ];
        return defaultIcons[index % defaultIcons.length];
    };

    const renderRecipeCard = useCallback(({ item, index }: { item: any; index: number }) => {
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
        const iconInfo = getRecipeIcon(item.title || '', index);
        const iconBgColor = getRecipeIconColor(index);
        
        return (
            <TouchableOpacity
                onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
                style={styles.recipeCardWrapper}
                activeOpacity={0.92}
            >
                <View style={styles.recipeCard}>
                    <View style={styles.recipeCardBody}>
                        <View style={[styles.recipeIcon, { backgroundColor: iconBgColor }]}>
                            <Ionicons name={iconInfo.name} size={22} color={iconInfo.color} />
                        </View>
                        <View style={styles.recipeInfo}>
                            <CustomText style={styles.recipeTitle}>{item.title}</CustomText>
                            <View style={styles.recipeMetaRow}>
                                <View style={styles.recipeMeta}>
                                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                                    <CustomText style={styles.recipeMetaText}>
                                        {item.time || '—'}
                                    </CustomText>
                                </View>
                                <View style={styles.recipeMeta}>
                                    <Ionicons name="list-outline" size={14} color="#9CA3AF" />
                                    <CustomText style={styles.recipeMetaText}>
                                        {item.ingredients?.length || 0} ingredients
                                    </CustomText>
                                </View>
                            </View>
                            {tags.length > 0 && (
                                <View style={styles.recipeTagRow}>
                                    {tags.map((tag: string) => (
                                        <View key={tag} style={styles.recipeTagChip}>
                                            <CustomText style={styles.recipeTagChipText}>{tag}</CustomText>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleToggleFavorite(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.heartButton}
                    >
                        {favorited[item.id] ? (
                            <HeartIcon color="#E4576A" size={24} />
                        ) : (
                            <Heart color="#CBD5F5" size={24} />
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }, [favorited, handleToggleFavorite, router]);

    // Get placeholder text
    const searchPlaceholder = activeSegment === 'favorites' ? 'Search favorites...' : 'Search recipes...';

    const renderAllEmpty = useCallback(() => (
        <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={42} color="#CBD5F5" />
            <CustomText style={styles.emptyStateTitle}>No recipes found</CustomText>
            <CustomText style={styles.emptyStateMessage}>
                Try adjusting your search or add a brand new dish to your collection.
            </CustomText>
        </View>
    ), []);

    const renderFavoritesEmpty = useCallback(() => (
        <View style={styles.emptyState}>
            <Ionicons name="heart-circle-outline" size={42} color="#F4B5C0" />
            <CustomText style={styles.emptyStateTitle}>Nothing saved yet</CustomText>
            <CustomText style={styles.emptyStateMessage}>
                Favorite recipes from the feed or search to build your personal cookbook.
            </CustomText>
        </View>
    ), []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header outside FlatList for stability */}
            <View style={styles.headerWrapper}>
                {/* Top Header with Title and Avatar */}
                <View style={styles.topHeader}>
                    <View style={styles.titleContainer}>
                        <CustomText style={styles.pageTitle}>Hello, Chef!</CustomText>
                        <CustomText style={styles.pageSubtitle}>What shall we cook today?</CustomText>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
                        ) : (
                            <View style={styles.headerAvatar}>
                                <Ionicons name="person" size={24} color="#9CA3AF" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroCardContent}>
                        <View>
                            <CustomText style={styles.heroCardTitle}>Create something delicious</CustomText>
                            <CustomText style={styles.heroCardSubtitle}>Share your recipe</CustomText>
                        </View>
                        <TouchableOpacity
                            style={styles.heroCardButton}
                            onPress={openAddRecipe}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add" size={18} color="#FFFFFF" />
                            <CustomText style={styles.heroCardButtonText}>Add recipe</CustomText>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search bar outside FlatList - directly controlled like HomeScreen */}
                <SearchBar
                    search={search}
                    onSearchChange={setSearch}
                    placeholder={searchPlaceholder}
                />

                {/* Main Tabs */}
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

                {activeSegment === 'all' ? (
                    <View style={styles.categoryContainer}>
                        <FlatList
                            data={['All', ...popularTags]}
                            keyExtractor={(item) => item}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryScrollContent}
                            renderItem={({ item: category }) => {
                                const isAll = category === 'All';
                                const isActive = isAll 
                                    ? selectedCategories.length === 0
                                    : selectedCategories.includes(category);
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.categoryChip,
                                            isActive && styles.categoryChipActive,
                                        ]}
                                        onPress={() => {
                                            if (isAll) {
                                                setSelectedCategories([]);
                                            } else {
                                                setSelectedCategories(prev => {
                                                    if (prev.includes(category)) {
                                                        return prev.filter(t => t !== category);
                                                    } else {
                                                        return [...prev, category];
                                                    }
                                                });
                                            }
                                        }}
                                    >
                                        <CustomText
                                            style={[
                                                styles.categoryText,
                                                isActive && styles.categoryTextActive,
                                            ]}
                                        >
                                            {category}
                                        </CustomText>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                ) : (
                    <View style={styles.favoritesHint}>
                        <Ionicons name="sparkles-outline" size={18} color="#256D85" style={{ marginRight: 8 }} />
                        <CustomText style={styles.favoritesHintText}>
                            Pro tip: Tag favorites from the recipe editor to group them here.
                        </CustomText>
                    </View>
                )}
            </View>

            {/* FlatList without header - just the recipe items */}
            <View style={{ flex: 1 }}>
                {activeSegment === 'all' ? (
                    <FlatList
                        data={allRecipes}
                        keyExtractor={item => item.id}
                        renderItem={({ item, index }) => renderRecipeCard({ item, index })}
                        ListEmptyComponent={() =>
                            (loadingAll && allRecipes.length === 0) || searchingAll
                                ? <RecipeLoadingSkeleton />
                                : renderAllEmpty()
                        }
                        contentContainerStyle={styles.listContentContainer}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <FlatList
                        data={displayedFavorites}
                        keyExtractor={item => item.id}
                        renderItem={({ item, index }) => renderRecipeCard({ item, index })}
                        ListEmptyComponent={() =>
                            loadingFavorites && !favoritesLoaded
                                ? <RecipeLoadingSkeleton />
                                : renderFavoritesEmpty()
                        }
                        contentContainerStyle={styles.listContentContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F5FB',
    },
    headerWrapper: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 8 : 4,
        paddingBottom: 10,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleContainer: {
        flex: 1,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    pageSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '400',
    },
    headerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroCard: {
        backgroundColor: '#E8EAF6',
        borderRadius: 20,
        padding: 18,
        marginBottom: 20,
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    heroCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    heroCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    heroCardSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '400',
    },
    heroCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#256D85',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    heroCardButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        borderRadius: 12,
        marginTop: 16,
        gap: 12,
    },
    segmentButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    segmentButtonActive: {
        backgroundColor: '#fff',
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    segmentLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    segmentLabelActive: {
        color: '#1F2937',
    },
    searchBarWrapper: {
        marginTop: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
        color: '#222',
        paddingVertical: 0,
        marginLeft: 10,
    },
    searchIcon: {
        marginRight: 4,
    },
    categoryContainer: {
        marginTop: 16,
        marginBottom: 4,
    },
    categoryScrollContent: {
        paddingVertical: 4,
        gap: 8,
    },
    categoryChip: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: '#256D85',
    },
    categoryText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
    categoryTextActive: {
        color: '#FFFFFF',
    },
    favoritesHint: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 12,
        backgroundColor: '#E6F4F1',
        borderRadius: 18,
        marginTop: 18,
    },
    favoritesHintText: {
        fontSize: 13,
        color: '#256D85',
        fontWeight: '600',
        flex: 1,
        lineHeight: 18,
    },
    // Recipe Loading Skeleton Styles
    skeletonRecipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 18,
        marginBottom: 14,
        shadowColor: 'rgba(15, 23, 42, 0.08)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#EEF2FF',
    },
    skeletonRecipeCardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    skeletonRecipeIcon: {
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: '#E2F9EE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 18,
        borderWidth: 2,
        borderColor: '#D1FAE5',
    },
    skeletonRecipeInfo: {
        flex: 1,
    },
    skeletonLine: {
        backgroundColor: '#E2E8F0',
        borderRadius: 6,
    },
    skeletonRecipeTitle: {
        width: '85%',
        height: 18,
        marginBottom: 8,
        borderRadius: 4,
    },
    skeletonRecipeTitleShort: {
        width: '60%',
        height: 18,
        marginBottom: 12,
        borderRadius: 4,
    },
    skeletonRecipeMeta: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 8,
    },
    skeletonRecipeMetaItem: {
        width: 70,
        height: 14,
        borderRadius: 4,
    },
    skeletonRecipeIngredients: {
        width: 100,
        height: 14,
        borderRadius: 4,
    },
    skeletonRecipeTags: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    skeletonTag: {
        width: 60,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
    },
    skeletonHeartButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E2E8F0',
    },
    listContentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 140,
    },
    recipeCardWrapper: {
        marginBottom: 14,
    },
    recipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 18,
        shadowColor: 'rgba(15, 23, 42, 0.08)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#EEF2FF',
    },
    recipeCardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    recipeIcon: {
        width: 54,
        height: 54,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    iconImage: {
        width: 28,
        height: 28,
        tintColor: '#1E293B',
    },
    recipeInfo: {
        flex: 1,
    },
    recipeTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
        lineHeight: 22,
    },
    recipeMetaRow: {
        marginBottom: 10,
    },
    recipeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    recipeMetaText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginLeft: 6,
        fontWeight: '400',
    },
    recipeTagRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    recipeTagChip: {
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 6,
        alignSelf: 'flex-start',
    },
    recipeTagChipText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    heartButton: {
        backgroundColor: '#EEF2FF',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyStateTitle: {
        fontSize: 19,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 18,
    },
    emptyStateMessage: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
    },
}); 