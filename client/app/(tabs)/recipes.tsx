import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Text, Image, ActivityIndicator, Animated, Easing, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../../components/CustomText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Heart, HeartIcon } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const TAB_BAR_HEIGHT = 90;

function ForkKnifeLoading() {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    return (
        <View style={styles.loadingContainer}>
            <Animated.Image
                source={require('../../assets/images/fork-knife.png')}
                style={[styles.loadingIcon, { transform: [{ scale: pulseAnim }] }]}
                resizeMode="contain"
            />
            <CustomText style={styles.loadingText}>Searching recipes...</CustomText>
        </View>
    );
}

export default function RecipesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const fetchIdRef = useRef(0);
    const [favorited, setFavorited] = useState<{ [id: string]: boolean }>({});
    const [userId, setUserId] = useState<string | null>(null);
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

    const fetchRecipes = useCallback((searchTerm = '', tags: string[] = selectedTags) => {
        fetchIdRef.current += 1;
        const fetchId = fetchIdRef.current;
        let url = userId
            ? `https://familycooksclean.onrender.com/recipes/list?limit=20&user_id=${userId}`
            : 'https://familycooksclean.onrender.com/recipes/list?limit=20';
        if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
        if (tags.length > 0) url += `&tags=${encodeURIComponent(tags.join(','))}`;

        if (!searchTerm && tags.length === 0) {
            setLoading(true);
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (fetchId === fetchIdRef.current) {
                        setRecipes(data);
                        const favMap: { [id: string]: boolean } = {};
                        data.forEach((r: any) => {
                            if (r.is_favorited) {
                                favMap[r.id] = true;
                            }
                        });
                        setFavorited(favMap);
                        setLoading(false);
                        setSearching(false);
                    }
                })
                .catch(() => {
                    if (fetchId === fetchIdRef.current) {
                        setLoading(false);
                        setSearching(false);
                    }
                });
            return;
        }
        setSearching(true);
        const timeout = setTimeout(() => {
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (fetchId === fetchIdRef.current) {
                        setRecipes(data);
                        const favMap: { [id: string]: boolean } = {};
                        data.forEach((r: any) => {
                            if (r.is_favorited) {
                                favMap[r.id] = true;
                            }
                        });
                        setFavorited(favMap);
                        setSearching(false);
                        setLoading(false);
                    }
                })
                .catch(() => {
                    if (fetchId === fetchIdRef.current) {
                        setSearching(false);
                        setLoading(false);
                    }
                });
        }, 400);
        return () => clearTimeout(timeout);
    }, [userId, selectedTags]);

    useEffect(() => {
        fetchRecipes(search, selectedTags);
    }, [search, selectedTags, fetchRecipes]);

    useFocusEffect(
        useCallback(() => {
            fetchRecipes(search, selectedTags);
        }, [fetchRecipes, search, selectedTags])
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
        } catch (err) {
            setFavorited(fav => ({ ...fav, [recipeId]: currentlyFav }));
            alert('Failed to update favorite. Please try again.');
        }
    };

    function openAddRecipe() {
        router.push('/add-recipe');
    }

    return (
        <View style={styles.container}>
            {/* Modern Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <CustomText style={styles.headerText}>Recipe Search</CustomText>
                    <View style={{ width: 28 }} />
                </View>
                <CustomText style={styles.subHeaderText}>Discover delicious recipes</CustomText>
            </View>

            {/* Floating Search Bar */}
            <View style={styles.searchBarWrapper}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={22} color="#B0B0B0" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search recipes..."
                        style={styles.searchInput}
                        placeholderTextColor="#B0B0B0"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Helpful Prompt */}
            <View style={styles.promptContainer}>
                <CustomText style={styles.promptText}>
                    💡 Try searching for ingredients or meal types
                </CustomText>
            </View>

            {/* Modern Tag Pills */}
            <View style={styles.tagsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tagsScrollContent}
                >
                    {popularTags.map(({ tag }, idx) => (
                        <TouchableOpacity
                            key={tag}
                            style={[
                                styles.filterChip,
                                selectedTags.includes(tag) && styles.filterChipActive
                            ]}
                            onPress={() => {
                                setSelectedTags(selectedTags =>
                                    selectedTags.includes(tag)
                                        ? selectedTags.filter(t => t !== tag)
                                        : [...selectedTags, tag]
                                );
                            }}
                        >
                            <CustomText style={[
                                styles.filterText,
                                selectedTags.includes(tag) && styles.filterTextActive
                            ]}>
                                {tag}
                            </CustomText>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Recipes Section */}
            <View style={styles.recipesSection}>
                <CustomText style={styles.sectionTitle}>Recipes</CustomText>
                
                {((loading && recipes.length === 0) || searching) ? (
                    <ForkKnifeLoading />
                ) : (
                    <FlatList
                        data={recipes}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
                                style={styles.recipeCardWrapper}
                                activeOpacity={0.92}
                            >
                                <View style={styles.recipeCard}>
                                    <View style={styles.recipeIcon}>
                                        <Image
                                            source={require('../../assets/images/fork-knife.png')}
                                            style={styles.iconImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View style={styles.recipeInfo}>
                                        <CustomText style={styles.recipeTitle}>{item.title}</CustomText>
                                        <View style={styles.recipeMeta}>
                                            <Ionicons name="time-outline" size={16} color="#6B7280" />
                                            <CustomText style={styles.recipeMetaText}>{item.time}</CustomText>
                                        </View>
                                        <CustomText style={styles.recipeIngredients}>
                                            {item.ingredients?.length || 0} ingredients
                                        </CustomText>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleToggleFavorite(item.id)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={styles.heartButton}
                                    >
                                        {favorited[item.id] ? (
                                            <HeartIcon color="#E4576A" size={24} />
                                        ) : (
                                            <Heart color="#B0B0B0" size={24} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <CustomText style={styles.emptyStateText}>No recipes found</CustomText>
                                <CustomText style={styles.emptyStateSubtext}>Try adjusting your search or filters</CustomText>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Modern Floating Add Button */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + TAB_BAR_HEIGHT + 16 }]}
                accessibilityLabel="Add Recipe"
                onPress={openAddRecipe}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F7F7FA' 
    },
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
        justifyContent: 'center',
        marginBottom: 8,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#222',
        letterSpacing: 0.5,
    },
    headerText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#222',
        letterSpacing: -0.5,
        marginTop: 30,
    },
    subHeaderText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 8,
        marginBottom: 16,
    },
    searchBarWrapper: {
        alignItems: 'center',
        marginTop: -28,
        marginBottom: 20,
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
        shadowColor: '#000',
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
        marginLeft: 8,
    },
    searchIcon: {
        marginRight: 4,
    },
    promptContainer: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    promptText: {
        color: '#6B7280',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    tagsContainer: {
        marginBottom: 20,
    },
    tagsScrollContent: {
        paddingHorizontal: 24,
        alignItems: 'center',
        height: 40,
    },
    filterChip: {
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 6,
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
    recipesSection: {
        flex: 1,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#222',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    loadingIcon: {
        width: 44,
        height: 44,
        tintColor: '#6DA98C',
        marginBottom: 12,
    },
    loadingText: {
        color: '#6DA98C',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 100,
    },
    recipeCardWrapper: {
        marginBottom: 12,
    },
    recipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    recipeIcon: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#B6E2D3',
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
        marginBottom: 6,
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
    heartButton: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
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