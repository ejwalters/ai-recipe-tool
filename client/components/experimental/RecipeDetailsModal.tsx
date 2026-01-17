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

    // Reset recipes when modal opens with new chatId
    useEffect(() => {
        if (visible && chatId) {
            setRecipes(initialRecipes);
        }
    }, [visible, chatId, initialRecipes]);

    useEffect(() => {
        if (visible) {
            // Reset animation value
            slideAnim.setValue(screenHeight);
            backdropOpacity.setValue(0);
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
    }, [visible, slideAnim, backdropOpacity]);

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
                        { 
                            transform: [{ translateY: slideAnim }],
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                        }
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
                                        <View key={index} style={styles.recipeItem}>
                                            {/* Recipe Icon */}
                                            <View style={[styles.recipeItemIcon, { backgroundColor: iconConfig.backgroundColor }]}>
                                                {iconConfig.library === 'MaterialCommunityIcons' ? (
                                                    <MaterialCommunityIcons 
                                                        name={iconConfig.name as any} 
                                                        size={24} 
                                                        color={iconConfig.iconColor} 
                                                    />
                                                ) : (
                                                    <Ionicons 
                                                        name={iconConfig.name as any} 
                                                        size={24} 
                                                        color={iconConfig.iconColor} 
                                                    />
                                                )}
                                            </View>
                                            
                                            {/* Recipe Info */}
                                            <View style={styles.recipeItemInfo}>
                                                <CustomText style={styles.recipeItemName} numberOfLines={2}>
                                                    {recipe.name}
                                                </CustomText>
                                                <View style={styles.recipeItemMeta}>
                                                    {recipe.time && (
                                                        <View style={styles.recipeMetaRow}>
                                                            <Ionicons name="time-outline" size={12} color="#6B7280" />
                                                            <CustomText style={styles.recipeMetaText}>{recipe.time}</CustomText>
                                                        </View>
                                                    )}
                                                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                                                        <View style={styles.recipeMetaRow}>
                                                            <Ionicons name="list-outline" size={12} color="#6B7280" />
                                                            <CustomText style={styles.recipeMetaText}>
                                                                {recipe.ingredients.length} ingredient{recipe.ingredients.length > 1 ? 's' : ''}
                                                            </CustomText>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
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
        maxHeight: screenHeight * 0.5,
        width: '100%',
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
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerLeft: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 13,
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
        paddingTop: 12,
        paddingBottom: 24,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    recipeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    recipeItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    recipeItemInfo: {
        flex: 1,
    },
    recipeItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
        lineHeight: 22,
    },
    recipeItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    recipeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    recipeMetaText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '400',
    },
});
