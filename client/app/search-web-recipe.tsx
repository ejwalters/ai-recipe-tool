import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';

export default function SearchWebRecipeScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    // Placeholder for web recipe results
    const webRecipes: { title: string; source: string; image: string }[] = [];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#444" />
                </TouchableOpacity>
                <CustomText style={styles.headerText}>Search the Web</CustomText>
            </View>
            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search for a recipe..."
                    placeholderTextColor="#A0A0A0"
                    value={search}
                    onChangeText={setSearch}
                />
                <Ionicons name="search" size={22} color="#A0A0A0" style={styles.searchIcon} />
            </View>
            {/* Results Placeholder */}
            <View style={styles.resultsContainer}>
                {webRecipes.length === 0 ? (
                    <CustomText style={styles.noResultsText}>No recipes yet. Try searching above!</CustomText>
                ) : (
                    <FlatList
                        data={webRecipes}
                        keyExtractor={(_, idx) => idx.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.recipeCard}>
                                <Image source={{ uri: item.image }} style={styles.recipeImage} />
                                <View style={styles.recipeInfo}>
                                    <CustomText style={styles.recipeTitle}>{item.title}</CustomText>
                                    <CustomText style={styles.recipeMeta}>{item.source}</CustomText>
                                </View>
                            </View>
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F6F9',
        paddingTop: 80,
        paddingHorizontal: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 18,
    },
    backButton: {
        marginRight: 8,
        padding: 4,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        marginRight: 32,
        color: '#444',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        marginHorizontal: 20,
        marginBottom: 18,
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    searchBar: {
        flex: 1,
        fontSize: 16,
        color: '#222',
    },
    searchIcon: {
        marginLeft: 8,
    },
    resultsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
    },
    noResultsText: {
        color: '#6C757D',
        fontSize: 16,
        marginTop: 32,
        textAlign: 'center',
    },
    recipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    recipeImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#E5E5E5',
        marginRight: 16,
    },
    recipeInfo: {
        flex: 1,
    },
    recipeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
        marginBottom: 2,
    },
    recipeMeta: {
        color: '#6C757D',
        fontSize: 13,
    },
    listContent: {
        paddingBottom: 40,
    },
}); 