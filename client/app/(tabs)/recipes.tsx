import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../../components/CustomText';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Heart, HeartIcon } from 'lucide-react-native';
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
    const [popularTags, setPopularTags] = useState<{ tag: string, count: number }[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setUserId(data.user.id);
        });
    }, []);

    useEffect(() => {
        fetch('https://familycooksclean.onrender.com/recipes/tags/popular')
            .then(res => res.json())
            .then(data => setPopularTags(data))
            .catch(() => setPopularTags([]));
    }, []);

    const fetchAllRecipes = useCallback((searchTerm = '', tags: string[] = []) => {
        fetchIdRef.current += 1;
        const fetchId = fetchIdRef.current;
        let url = `https://familycooksclean.onrender.com/recipes/list?limit=20`;
        if (userId) {
            url += `&user_id=${userId}`;
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
            fetchAllRecipes(search, selectedTags);
        }
    }, [activeSegment, search, selectedTags, userId, fetchAllRecipes]);

    useEffect(() => {
        if (activeSegment === 'favorites') {
            if (selectedTags.length > 0) {
                setSelectedTags([]);
            }
            if (userId && !favoritesLoaded && !loadingFavorites) {
                fetchFavoriteRecipes();
            }
        }
    }, [activeSegment, userId, favoritesLoaded, loadingFavorites, fetchFavoriteRecipes, selectedTags.length]);

    useFocusEffect(
        useCallback(() => {
            if (!userId) return;
            if (activeSegment === 'all') {
                fetchAllRecipes(search, selectedTags);
            } else {
                fetchFavoriteRecipes();
            }
        }, [activeSegment, fetchAllRecipes, fetchFavoriteRecipes, search, selectedTags, userId])
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

    const renderRecipeCard = useCallback(({ item }: { item: any }) => {
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 2) : [];
        return (
            <TouchableOpacity
                onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
                style={styles.recipeCardWrapper}
                activeOpacity={0.92}
            >
                <View style={styles.recipeCard}>
                    <View style={styles.recipeCardBody}>
                        <View style={styles.recipeIcon}>
                            <Ionicons name="fast-food-outline" size={22} color="#256D85" />
                        </View>
                        <View style={styles.recipeInfo}>
                            <CustomText style={styles.recipeTitle}>{item.title}</CustomText>
                            <View style={styles.recipeMeta}>
                                <Ionicons name="time-outline" size={16} color="#64748B" />
                                <CustomText style={styles.recipeMetaText}>
                                    {item.time || '—'}
                                </CustomText>
                            </View>
                            <CustomText style={styles.recipeIngredients}>
                                {item.ingredients?.length || 0} ingredients
                            </CustomText>
                            {tags.length > 0 && (
                                <View style={styles.recipeTagRow}>
                                    {tags.map(tag => (
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
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <Ionicons
                            name={activeSegment === 'favorites' ? 'heart-outline' : 'restaurant-outline'}
                            size={24}
                            color="#FFFFFF"
                        />
                    </View>
                    <CustomText style={styles.heroTitle}>
                        {activeSegment === 'favorites' ? 'Saved & Savored' : 'Discover & Create'}
                    </CustomText>
                    <CustomText style={styles.heroSubtitle}>
                        {activeSegment === 'favorites'
                            ? 'Keep your go-to dishes close and beautifully organized.'
                            : 'Search for new ideas or filter by the flavors you crave today.'}
                    </CustomText>
                    <TouchableOpacity
                        style={styles.heroButton}
                        onPress={openAddRecipe}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                        <CustomText style={styles.heroButtonText}>Add new recipe</CustomText>
                    </TouchableOpacity>
                </View>

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

                {/* Search bar outside FlatList - directly controlled like HomeScreen */}
                <SearchBar
                    search={search}
                    onSearchChange={setSearch}
                    placeholder={searchPlaceholder}
                />

                {activeSegment === 'all' ? (
                    <View style={styles.tagsContainer}>
                        <CustomText style={styles.tagsPrompt}>Tap a tag to refine your search</CustomText>
                        <FlatList
                            data={popularTags}
                            keyExtractor={({ tag }) => tag}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tagsScrollContent}
                            renderItem={({ item: { tag } }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        selectedTags.includes(tag) && styles.filterChipActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedTags(prev =>
                                            prev.includes(tag)
                                                ? prev.filter(t => t !== tag)
                                                : [...prev, tag]
                                        );
                                    }}
                                >
                                    <CustomText
                                        style={[
                                            styles.filterText,
                                            selectedTags.includes(tag) && styles.filterTextActive,
                                        ]}
                                    >
                                        {tag}
                                    </CustomText>
                                </TouchableOpacity>
                            )}
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
                        renderItem={renderRecipeCard}
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
                        renderItem={renderRecipeCard}
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

            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + TAB_BAR_HEIGHT + 16 }]}
                accessibilityLabel="Add Recipe"
                onPress={openAddRecipe}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
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
        paddingTop: Platform.OS === 'ios' ? 12 : 4,
        paddingBottom: 12,
    },
    heroCard: {
        backgroundColor: '#256D85',
        borderRadius: 28,
        padding: 16,
        shadowColor: 'rgba(89, 147, 170, 0.35)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    heroIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
        letterSpacing: -0.4,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 19,
        marginBottom: 12,
    },
    heroButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        gap: 8,
    },
    heroButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#E5EBF8',
        borderRadius: 24,
        padding: 4,
        marginTop: 20,
    },
    segmentButton: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
        color: '#64748B',
    },
    segmentLabelActive: {
        color: '#256D85',
    },
    searchBarWrapper: {
        marginTop: 18,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 18,
        height: 52,
        shadowColor: 'rgba(15, 23, 42, 0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
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
    tagsContainer: {
        marginTop: 22,
    },
    tagsPrompt: {
        color: '#6B7280',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
    },
    tagsScrollContent: {
        paddingVertical: 8,
        gap: 10,
    },
    filterChip: {
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterChipActive: {
        backgroundColor: '#B6E2D3',
        borderColor: '#B6E2D3',
    },
    filterText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#1E293B',
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
        borderRadius: 16,
        backgroundColor: '#E6F4F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 18,
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
    recipeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    recipeMetaText: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 6,
        fontWeight: '500',
    },
    recipeIngredients: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    recipeTagRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    recipeTagChip: {
        backgroundColor: '#F0F9F4',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    recipeTagChipText: {
        fontSize: 12,
        color: '#2F855A',
        fontWeight: '600',
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
    fab: {
        position: 'absolute',
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6DA98C',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
    },
}); 