import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import CustomText from '../components/CustomText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getRecipeIconConfig, IconConfig } from '../utils/recipeIcons';

// Helper to call backend
async function addRecipeToServer({ user_id, title, description, time, servings, tags, ingredients, steps, icon_library, icon_name, icon_bg_color, icon_color }: { user_id: string; title: string; description?: string; time: string; servings: string; tags: string[]; ingredients: string[]; steps: string[]; icon_library?: string; icon_name?: string; icon_bg_color?: string; icon_color?: string }) {
    const response = await fetch('https://familycooksclean.onrender.com/recipes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, title, description, time, servings, tags, ingredients, steps, icon_library, icon_name, icon_bg_color, icon_color }),
    });
    if (!response.ok) throw new Error('Failed to add recipe');
    return response.json();
}

// Helper to update recipe on backend
async function updateRecipeOnServer({ recipeId, user_id, title, description, time, servings, tags, ingredients, steps, icon_library, icon_name, icon_bg_color, icon_color }: { recipeId: string; user_id: string; title: string; description?: string; time: string; servings: string; tags: string[]; ingredients: string[]; steps: string[]; icon_library?: string; icon_name?: string; icon_bg_color?: string; icon_color?: string }) {
    const response = await fetch(`https://familycooksclean.onrender.com/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, title, description, time, servings, tags, ingredients, steps, icon_library, icon_name, icon_bg_color, icon_color }),
    });
    if (!response.ok) throw new Error('Failed to update recipe');
    return response.json();
}

// Popular icon options for selection
const POPULAR_ICONS: IconConfig[] = [
    { library: 'MaterialCommunityIcons', name: 'food-variant', backgroundColor: '#FFF8DC', iconColor: '#F4C430' },
    { library: 'MaterialCommunityIcons', name: 'food-drumstick', backgroundColor: '#FFE0E6', iconColor: '#E91E63' },
    { library: 'MaterialCommunityIcons', name: 'food-steak', backgroundColor: '#FFCDD2', iconColor: '#C62828' },
    { library: 'MaterialCommunityIcons', name: 'pizza', backgroundColor: '#FFE5D0', iconColor: '#FF5722' },
    { library: 'MaterialCommunityIcons', name: 'cupcake', backgroundColor: '#F3E5F5', iconColor: '#9C27B0' },
    { library: 'MaterialCommunityIcons', name: 'bread-slice', backgroundColor: '#FFF8DC', iconColor: '#FBC02D' },
    { library: 'MaterialCommunityIcons', name: 'ice-cream', backgroundColor: '#E1F5FE', iconColor: '#0288D1' },
    { library: 'MaterialCommunityIcons', name: 'coffee', backgroundColor: '#FFF3E0', iconColor: '#5D4037' },
    { library: 'MaterialCommunityIcons', name: 'food-croissant', backgroundColor: '#FFF8DC', iconColor: '#F4C430' },
    { library: 'MaterialCommunityIcons', name: 'fish', backgroundColor: '#E6EEFF', iconColor: '#2196F3' },
    { library: 'MaterialCommunityIcons', name: 'carrot', backgroundColor: '#E0F4E0', iconColor: '#66BB6A' },
    { library: 'MaterialCommunityIcons', name: 'chef-hat', backgroundColor: '#E5E7EB', iconColor: '#6B7280' },
];

export default function AddRecipeManualScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    
    // Edit mode state
    const isEditMode = params.editMode === 'true';
    const recipeId = params.recipeId as string;
    
    // Ref to track if we've already initialized
    const initializedRef = useRef(false);
    
    // Initialize state with empty values first
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [time, setTime] = useState('');
    const [servings, setServings] = useState('');
    const [ingredients, setIngredients] = useState(['']);
    const [steps, setSteps] = useState(['']);
    const [saving, setSaving] = useState(false);
    
    // Collapsible sections
    const [iconSectionExpanded, setIconSectionExpanded] = useState(false);
    const [tagsSectionExpanded, setTagsSectionExpanded] = useState(false);
    const [ingredientsExpanded, setIngredientsExpanded] = useState(true);
    const [instructionsExpanded, setInstructionsExpanded] = useState(true);
    
    // Icon selection
    const [selectedIcon, setSelectedIcon] = useState<IconConfig | null>(null);
    
    // Auto-select icon based on title/tags when they change
    useEffect(() => {
        if (title || tags.length > 0) {
            const autoIcon = getRecipeIconConfig(title, tags, 0);
            if (!selectedIcon) {
                setSelectedIcon(autoIcon);
            }
        }
    }, [title, tags]);
    
    // Initialize data only once when component mounts
    useEffect(() => {
        if (initializedRef.current) return;
        
        // Set initial values based on params
        if (isEditMode) {
            if (params.title) setTitle(params.title as string);
            if (params.description) setDescription(params.description as string);
            if (params.time) setTime(params.time as string);
            if (params.servings) setServings(params.servings as string);
            
            if (params.ingredients) {
                try {
                    const parsed = JSON.parse(params.ingredients as string);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setIngredients(parsed);
                    }
                } catch (error) {
                    console.error('Error parsing ingredients:', error);
                }
            }
            
            if (params.steps) {
                try {
                    const parsed = JSON.parse(params.steps as string);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSteps(parsed);
                    }
                } catch (error) {
                    console.error('Error parsing steps:', error);
                }
            }
            
            if (params.tags) {
                try {
                    const parsed = JSON.parse(params.tags as string);
                    if (Array.isArray(parsed)) {
                        setTags(parsed);
                    }
                } catch (error) {
                    console.error('Error parsing tags:', error);
                }
            }
            
            // Set icon from params if available
            if (params.icon_library && params.icon_name) {
                setSelectedIcon({
                    library: params.icon_library as 'MaterialCommunityIcons' | 'Ionicons',
                    name: params.icon_name as string,
                    backgroundColor: (params.icon_bg_color as string) || '#F3F4F6',
                    iconColor: (params.icon_color as string) || '#9CA3AF',
                });
            }
        } else {
            // Handle extracted data from photo
            if (params.extractedTitle) setTitle(params.extractedTitle as string);
            if (params.extractedDescription) setDescription(params.extractedDescription as string);
            if (params.extractedTime) setTime(params.extractedTime as string);
            if (params.extractedServings) setServings(params.extractedServings as string);
            
            if (params.extractedIngredients) {
                try {
                    const parsed = JSON.parse(params.extractedIngredients as string);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setIngredients(parsed);
                    }
                } catch (error) {
                    console.error('Error parsing extracted ingredients:', error);
                }
            }
            
            if (params.extractedSteps) {
                try {
                    const parsed = JSON.parse(params.extractedSteps as string);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSteps(parsed);
                    }
                } catch (error) {
                    console.error('Error parsing extracted steps:', error);
                }
            }
            
            if (params.extractedTags) {
                try {
                    const parsed = JSON.parse(params.extractedTags as string);
                    if (Array.isArray(parsed)) {
                        setTags(parsed);
                    }
                } catch (error) {
                    console.error('Error parsing extracted tags:', error);
                }
            }
        }
        
        initializedRef.current = true;
    }, []); // Empty dependency array - only run once
    
    function addTag() {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
            setNewTag('');
        }
    }

    function removeTag(tagToRemove: string) {
        setTags(tags.filter(tag => tag !== tagToRemove));
    }

    function addIngredient() {
        setIngredients([...ingredients, '']);
    }

    function removeIngredient(idx: number) {
        const filtered = ingredients.filter((_, i) => i !== idx);
        setIngredients(filtered.length > 0 ? filtered : ['']);
    }

    function updateIngredient(idx: number, value: string) {
        const updated = [...ingredients];
        updated[idx] = value;
        setIngredients(updated);
    }

    function addStep() {
        setSteps([...steps, '']);
    }

    function removeStep(idx: number) {
        const filtered = steps.filter((_, i) => i !== idx);
        setSteps(filtered.length > 0 ? filtered : ['']);
    }

    function updateStep(idx: number, value: string) {
        const updated = [...steps];
        updated[idx] = value;
        setSteps(updated);
    }

    async function handleSaveRecipe() {
        setSaving(true);
        try {
            const { data } = await supabase.auth.getUser();
            const user_id = data?.user?.id;
            if (!user_id) {
                Alert.alert('Error', 'You must be logged in to save a recipe.');
                setSaving(false);
                return;
            }
            
            const ingredientsArr = ingredients.map(i => i.trim()).filter(Boolean);
            const stepsArr = steps.map(s => s.trim()).filter(Boolean);
            
            if (!title || ingredientsArr.length === 0 || stepsArr.length === 0) {
                Alert.alert('Error', 'Please fill out the recipe name, at least one ingredient, and one step.');
                setSaving(false);
                return;
            }
            
            const iconData = selectedIcon || getRecipeIconConfig(title, tags, 0);
            
            const recipeData: any = {
                user_id,
                title,
                description: description.trim() || undefined,
                time,
                servings,
                tags: tags,
                ingredients: ingredientsArr,
                steps: stepsArr,
                icon_library: iconData.library,
                icon_name: iconData.name,
                icon_bg_color: iconData.backgroundColor,
                icon_color: iconData.iconColor,
            };
            
            if (isEditMode) {
                // Update existing recipe
                await updateRecipeOnServer({ recipeId, ...recipeData });
                
                // Navigate back to the updated recipe
                router.replace({
                    pathname: '/recipe-detail',
                    params: { id: recipeId }
                });
            } else {
                // Add new recipe
                await addRecipeToServer(recipeData);
                
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || `Failed to ${isEditMode ? 'update' : 'add'} recipe`);
        } finally {
            setSaving(false);
        }
    }

    const currentIcon = selectedIcon || getRecipeIconConfig(title, tags, 0);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <CustomText style={styles.headerTitle}>Add Recipe</CustomText>
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#1F2937" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Recipe Details Section */}
                <View style={styles.card}>
                    <CustomText style={styles.cardTitle}>Recipe Details</CustomText>
                    
                    <TextInput 
                        style={styles.input} 
                        placeholder="Recipe Name"
                        placeholderTextColor="#9CA3AF" 
                        value={title} 
                        onChangeText={setTitle}
                    />
                    
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        placeholder="Brief description..."
                        placeholderTextColor="#9CA3AF" 
                        value={description} 
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                    />
                    
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <CustomText style={styles.label}>Cook Time (mins)</CustomText>
                            <TextInput 
                                style={styles.input} 
                                placeholder="30"
                                placeholderTextColor="#9CA3AF" 
                                keyboardType="number-pad" 
                                value={time} 
                                onChangeText={(val) => {
                                    // Only allow numeric input
                                    const numericValue = val.replace(/[^0-9]/g, '');
                                    setTime(numericValue);
                                }}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <CustomText style={styles.label}>Servings</CustomText>
                            <TextInput 
                                style={styles.input} 
                                placeholder="4"
                                placeholderTextColor="#9CA3AF" 
                                keyboardType="number-pad" 
                                value={servings} 
                                onChangeText={(val) => {
                                    // Only allow numeric input
                                    const numericValue = val.replace(/[^0-9]/g, '');
                                    setServings(numericValue);
                                }}
                            />
                        </View>
                    </View>
                </View>

                {/* Recipe Icon Section */}
                <View style={styles.card}>
                    <TouchableOpacity 
                        style={styles.cardHeader}
                        onPress={() => setIconSectionExpanded(!iconSectionExpanded)}
                        activeOpacity={0.7}
                    >
                        <CustomText style={styles.cardTitle}>Recipe Icon</CustomText>
                        <Ionicons 
                            name={iconSectionExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#9CA3AF" 
                        />
                    </TouchableOpacity>
                    
                    {iconSectionExpanded && (
                        <View style={styles.iconSelector}>
                            <FlatList
                                data={POPULAR_ICONS}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.iconScrollContent}
                                keyExtractor={(item, index) => `icon-${index}`}
                                renderItem={({ item, index }) => {
                                    const isSelected = selectedIcon ? 
                                        (selectedIcon.name === item.name && selectedIcon.library === item.library) :
                                        (currentIcon.name === item.name && currentIcon.library === item.library);
                                    
                                    return (
                                        <TouchableOpacity
                                            style={styles.iconOption}
                                            onPress={() => setSelectedIcon(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.iconOptionCircle, 
                                                { 
                                                    backgroundColor: item.backgroundColor,
                                                    borderWidth: isSelected ? 3 : 1,
                                                    borderColor: isSelected ? '#6DA98C' : '#E5E7EB',
                                                }
                                            ]}>
                                                {item.library === 'MaterialCommunityIcons' ? (
                                                    <MaterialCommunityIcons 
                                                        name={item.name as any} 
                                                        size={32} 
                                                        color={isSelected ? item.iconColor : '#D1D5DB'} 
                                                    />
                                                ) : (
                                                    <Ionicons 
                                                        name={item.name as any} 
                                                        size={32} 
                                                        color={isSelected ? item.iconColor : '#D1D5DB'} 
                                                    />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    )}
                </View>

                {/* Tags Section */}
                <View style={styles.card}>
                    <TouchableOpacity 
                        style={styles.cardHeader}
                        onPress={() => setTagsSectionExpanded(!tagsSectionExpanded)}
                        activeOpacity={0.7}
                    >
                        <CustomText style={styles.cardTitle}>Tags</CustomText>
                        <Ionicons 
                            name={tagsSectionExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#9CA3AF" 
                        />
                    </TouchableOpacity>
                    
                    {tagsSectionExpanded && (
                        <View style={styles.tagsContainer}>
                            {tags.length > 0 && (
                                <View style={styles.tagsList}>
                                    {tags.map((tag, index) => (
                                        <View key={index} style={styles.tagChip}>
                                            <CustomText style={styles.tagText}>{tag}</CustomText>
                                            <TouchableOpacity onPress={() => removeTag(tag)}>
                                                <Ionicons name="close-circle" size={16} color="#6B7280" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                            <View style={styles.tagInputRow}>
                                <TextInput
                                    style={styles.tagInput}
                                    placeholder="Add tag (press Enter)"
                                    placeholderTextColor="#9CA3AF"
                                    value={newTag}
                                    onChangeText={setNewTag}
                                    onSubmitEditing={addTag}
                                    returnKeyType="done"
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Ingredients Section */}
                <View style={styles.card}>
                    <TouchableOpacity 
                        style={styles.cardHeader}
                        onPress={() => setIngredientsExpanded(!ingredientsExpanded)}
                        activeOpacity={0.7}
                    >
                        <CustomText style={styles.cardTitle}>Ingredients</CustomText>
                        <Ionicons 
                            name={ingredientsExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#9CA3AF" 
                        />
                    </TouchableOpacity>
                    
                    {ingredientsExpanded && (
                        <View>
                            {ingredients.map((ing, idx) => (
                                <View key={idx} style={styles.ingredientItem}>
                                    <TextInput
                                        style={styles.ingredientInput}
                                        placeholder="Add ingredient"
                                        placeholderTextColor="#9CA3AF"
                                        value={ing}
                                        onChangeText={val => updateIngredient(idx, val)}
                                        blurOnSubmit={false}
                                    />
                                    {ingredients.length > 1 && (
                                        <TouchableOpacity 
                                            style={styles.removeItemButton}
                                            onPress={() => removeIngredient(idx)}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            
                            <TouchableOpacity style={styles.addButtonRow} onPress={addIngredient} activeOpacity={0.8}>
                                <View style={styles.addButtonIcon}>
                                    <Ionicons name="add" size={20} color="#6DA98C" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Instructions Section */}
                <View style={styles.card}>
                    <TouchableOpacity 
                        style={styles.cardHeader}
                        onPress={() => setInstructionsExpanded(!instructionsExpanded)}
                        activeOpacity={0.7}
                    >
                        <CustomText style={styles.cardTitle}>Instructions</CustomText>
                        <Ionicons 
                            name={instructionsExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#9CA3AF" 
                        />
                    </TouchableOpacity>
                    
                    {instructionsExpanded && (
                        <View>
                            {steps.map((step, idx) => (
                                <View key={idx} style={styles.stepItem}>
                                    <View style={styles.stepNumber}>
                                        <CustomText style={styles.stepNumberText}>{idx + 1}</CustomText>
                                    </View>
                                    <TextInput
                                        style={styles.stepInput}
                                        placeholder="Add instruction step"
                                        placeholderTextColor="#9CA3AF"
                                        value={step}
                                        onChangeText={val => updateStep(idx, val)}
                                        multiline
                                        blurOnSubmit={false}
                                    />
                                    {steps.length > 1 && (
                                        <TouchableOpacity 
                                            style={styles.removeItemButton}
                                            onPress={() => removeStep(idx)}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            
                            <TouchableOpacity style={styles.addButtonRow} onPress={addStep} activeOpacity={0.8}>
                                <View style={styles.addButtonIcon}>
                                    <Ionicons name="add" size={20} color="#6DA98C" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                    onPress={handleSaveRecipe} 
                    disabled={saving}
                    activeOpacity={0.9}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <CustomText style={styles.saveButtonText}>Save Recipe</CustomText>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#F3F0FF',
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: -0.3,
    },
    menuButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: -0.2,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 12,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 6,
    },
    iconSelector: {
        marginTop: 12,
        paddingVertical: 8,
    },
    iconScrollContent: {
        paddingRight: 20,
        gap: 12,
    },
    iconOption: {
        marginRight: 12,
    },
    iconOptionCircle: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagsContainer: {
        marginTop: 8,
    },
    tagsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
        gap: 8,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 6,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
    },
    tagInputRow: {
        marginTop: 8,
    },
    tagInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    ingredientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    ingredientInput: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    stepNumberText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    stepInput: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 44,
        textAlignVertical: 'top',
    },
    removeItemButton: {
        padding: 4,
        marginTop: 2,
    },
    addButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    addButtonIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        borderWidth: 2,
        borderColor: '#6DA98C',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
