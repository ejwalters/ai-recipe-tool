import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CustomText from '../CustomText';
import { getRecipeIconConfig } from '../../utils/recipeIcons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Recipe {
    name: string;
    time?: string;
    tags?: string[];
    ingredients?: string[];
    steps?: string[];
}

interface RecipeDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    chatId: string;
    initialRecipes?: Recipe[];
}

export default function RecipeDetailsModal({ visible, onClose, chatId, initialRecipes = [] }: RecipeDetailsModalProps) {
    const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
    const [loading, setLoading] = useState(true);
    const slideAnim = useRef(new Animated.Value(screenHeight)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Fetch full recipe data from chat messages
            fetchFullRecipes();
            // Animate in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Animate out
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: screenHeight,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const fetchFullRecipes = async () => {
        if (!chatId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`https://familycooksclean.onrender.com/ai/messages?chat_id=${chatId}`);
            const messages = await res.json();
            
            // Extract full recipe data from messages
            const fullRecipes: Recipe[] = [];
            messages.forEach((msg: any) => {
                try {
                    const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
                    if (content && content.is_recipe && content.recipes && Array.isArray(content.recipes)) {
                        content.recipes.forEach((recipe: any) => {
                            if (recipe.name) {
                                fullRecipes.push({
                                    name: recipe.name,
                                    time: recipe.time || '',
                                    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
                                    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
                                    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
                                });
                            }
                        });
                    }
                } catch (e) {
                    // Not JSON, skip
                }
            });

            // Use initial recipes if available and no full recipes found
            if (fullRecipes.length > 0) {
                setRecipes(fullRecipes);
            } else if (initialRecipes.length > 0) {
                setRecipes(initialRecipes);
            }
        } catch (err) {
            console.error('Error fetching recipes:', err);
            if (initialRecipes.length > 0) {
                setRecipes(initialRecipes);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: screenHeight,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View 
                    style={[styles.backdrop, { opacity: backdropOpacity }]}
                >
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={handleClose}
                    />
                </Animated.View>

                {/* Modal Content */}
                <Animated.View 
                    style={[
                        styles.modalContent,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <CustomText style={styles.headerTitle}>
                                    {recipes.length} Recipe{recipes.length > 1 ? 's' : ''}
                                </CustomText>
                                <CustomText style={styles.headerSubtitle}>
                                    From this conversation
                                </CustomText>
                            </View>
                            <TouchableOpacity 
                                onPress={handleClose}
                                style={styles.closeButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#256D85" />
                                <CustomText style={styles.loadingText}>Loading recipes...</CustomText>
                            </View>
                        ) : (
                            <ScrollView 
                                style={styles.scrollView}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {recipes.map((recipe, index) => {
                                    const iconConfig = getRecipeIconConfig(
                                        recipe.name || '',
                                        recipe.tags || [],
                                        index,
                                        recipe
                                    );

                                    return (
                                        <View key={index} style={styles.recipeCard}>
                                            {/* Recipe Header */}
                                            <View style={styles.recipeHeader}>
                                                <View style={[styles.recipeIcon, { backgroundColor: iconConfig.backgroundColor }]}>
                                                    {iconConfig.library === 'MaterialCommunityIcons' ? (
                                                        <MaterialCommunityIcons 
                                                            name={iconConfig.name as any} 
                                                            size={32} 
                                                            color={iconConfig.iconColor} 
                                                        />
                                                    ) : (
                                                        <Ionicons 
                                                            name={iconConfig.name as any} 
                                                            size={32} 
                                                            color={iconConfig.iconColor} 
                                                        />
                                                    )}
                                                </View>
                                                <View style={styles.recipeHeaderInfo}>
                                                    <CustomText style={styles.recipeName} numberOfLines={2}>
                                                        {recipe.name}
                                                    </CustomText>
                                                    {recipe.time && (
                                                        <View style={styles.recipeMeta}>
                                                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                                                            <CustomText style={styles.recipeMetaText}>{recipe.time}</CustomText>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>

                                            {/* Tags */}
                                            {recipe.tags && recipe.tags.length > 0 && (
                                                <View style={styles.tagsRow}>
                                                    {recipe.tags.slice(0, 4).map((tag, tagIdx) => (
                                                        <View key={tagIdx} style={styles.tagChip}>
                                                            <CustomText style={styles.tagText}>{tag}</CustomText>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {/* Ingredients */}
                                            {recipe.ingredients && recipe.ingredients.length > 0 && (
                                                <View style={styles.section}>
                                                    <View style={styles.sectionHeader}>
                                                        <Ionicons name="list-outline" size={18} color="#256D85" />
                                                        <CustomText style={styles.sectionTitle}>Ingredients</CustomText>
                                                    </View>
                                                    <View style={styles.list}>
                                                        {recipe.ingredients.map((ingredient, ingIdx) => (
                                                            <View key={ingIdx} style={styles.listItem}>
                                                                <View style={styles.bullet} />
                                                                <CustomText style={styles.listItemText}>{ingredient}</CustomText>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )}

                                            {/* Steps */}
                                            {recipe.steps && recipe.steps.length > 0 && (
                                                <View style={styles.section}>
                                                    <View style={styles.sectionHeader}>
                                                        <Ionicons name="footsteps-outline" size={18} color="#256D85" />
                                                        <CustomText style={styles.sectionTitle}>Instructions</CustomText>
                                                    </View>
                                                    <View style={styles.list}>
                                                        {recipe.steps.map((step, stepIdx) => (
                                                            <View key={stepIdx} style={styles.stepItem}>
                                                                <View style={styles.stepNumber}>
                                                                    <CustomText style={styles.stepNumberText}>{stepIdx + 1}</CustomText>
                                                                </View>
                                                                <CustomText style={styles.stepText}>{step}</CustomText>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )}

                                            {index < recipes.length - 1 && <View style={styles.divider} />}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: screenHeight * 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerLeft: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '400',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 32,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    recipeCard: {
        marginBottom: 24,
    },
    recipeHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    recipeIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    recipeHeaderInfo: {
        flex: 1,
    },
    recipeName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
        lineHeight: 26,
    },
    recipeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    recipeMetaText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 20,
    },
    tagChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    list: {
        gap: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#256D85',
        marginTop: 7,
    },
    listItemText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E5F3EC',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#256D85',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginTop: 24,
    },
});
