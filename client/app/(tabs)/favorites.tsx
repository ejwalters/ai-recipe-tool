import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, Animated, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../../components/CustomText';
import { useRouter } from 'expo-router';
import { Heart, HeartIcon } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

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
            <CustomText style={styles.loadingText}>Searching favorites...</CustomText>
        </View>
    );
}

export default function FavoritesScreen() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [filteredFavorites, setFilteredFavorites] = useState<any[]>([]);
    const [popularTags, setPopularTags] = useState<{ tag: string, count: number }[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Fetch user ID on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setUserId(data.user.id);
        });
    }, []);

    // Fetch popular tags
    useEffect(() => {
        fetch('https://familycooksclean.onrender.com/recipes/tags/popular')
            .then(res => res.json())
            .then(data => setPopularTags(data))
            .catch(() => setPopularTags([]));
    }, []);

    // Fetch favorites function (now supports tags)
    const fetchFavorites = React.useCallback(() => {
        if (!userId) {
            setFavorites([]);
            setFilteredFavorites([]);
            return;
        }
        let url = `https://familycooksclean.onrender.com/recipes/favorites?user_id=${userId}`;
        if (selectedTags.length > 0) {
            url += `&tags=${encodeURIComponent(selectedTags.join(','))}`;
        }
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setFavorites(data);
                setFilteredFavorites(data);
            })
            .catch(() => {
                setFavorites([]);
                setFilteredFavorites([]);
            });
    }, [userId, selectedTags]);

    // Fetch favorites from backend
    useEffect(() => {
        fetchFavorites();
    }, [userId, fetchFavorites]);

    // Force reload favorites when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            fetchFavorites();
        }, [fetchFavorites])
    );

    // Search effect (filter favorites)
    useEffect(() => {
        if (search === '') {
            setFilteredFavorites(favorites || []);
            setSearching(false);
            return;
        }
        setSearching(true);
        const timeout = setTimeout(() => {
            const favoritesArray = Array.isArray(favorites) ? favorites : [];
            const filtered = favoritesArray.filter(r =>
                r.title.toLowerCase().includes(search.toLowerCase())
            );
            setFilteredFavorites(filtered);
            setSearching(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, favorites]);

    // Handler for heart icon (unfavorite from favorites list)
    const handleToggleFavorite = async (recipeId: string) => {
        if (!userId) return;
        try {
            const res = await fetch('https://familycooksclean.onrender.com/recipes/favorite', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, recipe_id: recipeId }),
            });
            if (!res.ok) throw new Error('Failed to unfavorite');
            setFavorites(prev => prev.filter(r => r.id !== recipeId));
            setFilteredFavorites(prev => prev.filter(r => r.id !== recipeId));
        } catch (err) {
            alert('Failed to remove favorite. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            {/* Modern Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <CustomText style={styles.headerText}>My Favorites</CustomText>
                </View>
                <CustomText style={styles.subHeaderText}>Your saved recipes</CustomText>
            </View>

            {/* Floating Search Bar */}
            <View style={styles.searchBarWrapper}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={22} color="#B0B0B0" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search favorites..."
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
                    💡 Filter your favorites by tags or search by name
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

            {/* Favorites Section */}
            <View style={styles.favoritesSection}>
                <CustomText style={styles.sectionTitle}>Favorites</CustomText>
                
                {searching ? (
                    <ForkKnifeLoading />
                ) : (
                    <FlatList
                        data={filteredFavorites}
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
                                        <HeartIcon color="#E4576A" size={24} />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <CustomText style={styles.emptyStateText}>No favorites found</CustomText>
                                <CustomText style={styles.emptyStateSubtext}>
                                    {search || selectedTags.length > 0 
                                        ? 'Try adjusting your search or filters' 
                                        : 'Start saving recipes to see them here'
                                    }
                                </CustomText>
                            </View>
                        }
                    />
                )}
            </View>
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
    favoritesSection: {
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
}); 