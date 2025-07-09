import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, Animated, ScrollView } from 'react-native';
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
        <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 24 }}>
            <Animated.Image
                source={require('../../assets/images/fork-knife.png')}
                style={{ width: 44, height: 44, tintColor: '#8CBEC7', transform: [{ scale: pulseAnim }] }}
                resizeMode="contain"
            />
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
            {/* Header */}
            <View style={styles.header}>
                <CustomText style={styles.headerText}>My Favorites</CustomText>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
                <TextInput
                    placeholder="Search Recipes"
                    style={styles.searchBar}
                    placeholderTextColor="#A0A0A0"
                    value={search}
                    onChangeText={setSearch}
                />
                <Ionicons name="search" size={22} style={styles.searchIcon} />
            </View>

            {/* Prompt */}
            <CustomText style={styles.prompt}>
                Not sure what to search? Try a prompt like : 'Dinner using ground chicken and spinach'
            </CustomText>

            {/* Dynamic Tag Pills */}
            <View style={{ marginBottom: 8 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'center', height: 43 }}
                >
                    {popularTags.map(({ tag }, idx) => (
                        <TouchableOpacity
                            key={tag}
                            style={[
                                styles.filterChip,
                                idx === 0 && { marginLeft: 0 },
                                idx === popularTags.length - 1 && { marginRight: 0 },
                                selectedTags.includes(tag) && { backgroundColor: '#E2B36A' }
                            ]}
                            onPress={() => {
                                setSelectedTags(selectedTags =>
                                    selectedTags.includes(tag)
                                        ? selectedTags.filter(t => t !== tag)
                                        : [...selectedTags, tag]
                                );
                            }}
                        >
                            <CustomText style={styles.filterText}>{tag}</CustomText>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Recipes Title */}
            <CustomText style={styles.sectionTitle}>Recipes</CustomText>

            {/* Recipes List */}
            {searching ? (
                <ForkKnifeLoading />
            ) : (
                <FlatList
                    data={filteredFavorites}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}>
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
                                        <Ionicons name="time-outline" size={14} color="#6C757D" />
                                        <CustomText style={styles.recipeMetaText}>{item.time}</CustomText>
                                    </View>
                                    <CustomText style={styles.recipeIngredients}>
                                        {item.ingredients?.length || 0} Ingredients
                                    </CustomText>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleToggleFavorite(item.id)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <HeartIcon color="#E4576A" size={24} style={styles.heartIcon} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<CustomText style={{ textAlign: 'center', marginTop: 40 }}>No recipes found.</CustomText>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F6F9', paddingHorizontal: 16, paddingTop: 80 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    headerText: { fontSize: 24, fontWeight: '700', flex: 1, textAlign: 'center' },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        marginBottom: 8,
        height: 44,
    },
    searchBar: { flex: 1, fontSize: 16, color: '#333' },
    searchIcon: { color: '#A0A0A0' },
    prompt: { color: '#6C757D', fontSize: 13, marginVertical: 8, textAlign: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    listContent: { paddingBottom: 80 },
    recipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    recipeIcon: {
        width: 74,
        height: 72,
        borderRadius: 20,
        backgroundColor: '#7BA892',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    recipeInfo: { flex: 1 },
    recipeTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    recipeMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    recipeMetaText: { fontSize: 13, color: '#6C757D', marginLeft: 4 },
    recipeIngredients: { fontSize: 13, color: '#6C757D' },
    iconImage: {
        width: 32,
        height: 32,
        tintColor: '#fff',
    },
    heartIcon: {
        width: 24,
        height: 24,
    },
    filterChip: {
        backgroundColor: '#7BA892',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        height: 35,
        minHeight: 35,
        maxHeight: 35,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    filterText: { color: '#fff', fontSize: 15, fontWeight: '600' },
}); 