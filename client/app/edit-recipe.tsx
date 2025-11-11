import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { supabase } from '../lib/supabase';
import { recipeStore } from '../lib/recipeStore';

// Helper to update recipe on backend
async function updateRecipeOnServer({ recipeId, user_id, title, time, tags, ingredients, steps }: { recipeId: string; user_id: string; title: string; time: string; tags: string[]; ingredients: string[]; steps: string[] }) {
    const response = await fetch(`https://familycooksclean.onrender.com/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, title, time, tags, ingredients, steps }),
    });
    if (!response.ok) throw new Error('Failed to update recipe');
    return response.json();
}

export default function EditRecipeScreen() {
    const router = useRouter();
    
    const [title, setTitle] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [time, setTime] = useState('');
    const [servings, setServings] = useState('');
    const [ingredients, setIngredients] = useState(['']);
    const [steps, setSteps] = useState(['']);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [recipeId, setRecipeId] = useState('');

    // Load recipe data from global store on mount
    useEffect(() => {
        const recipe = recipeStore.getEditRecipe();
        
        if (!recipe) {
            Alert.alert('Error', 'No recipe data found');
            router.back();
            return;
        }
        
        setRecipeId(recipe.id);
        setTitle(recipe.title || '');
        setTime(recipe.time || '');
        setServings(recipe.servings || '');
        setIngredients(Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? recipe.ingredients : ['']);
        setSteps(Array.isArray(recipe.steps) && recipe.steps.length > 0 ? recipe.steps : ['']);
        setTags(Array.isArray(recipe.tags) ? recipe.tags : []);
        setLoading(false);
    }, []);

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
        if (ingredients.length > 1) {
            setIngredients(ingredients.filter((_, i) => i !== idx));
        }
    }

    function updateIngredient(idx: number, value: string) {
        const newIngredients = [...ingredients];
        newIngredients[idx] = value;
        setIngredients(newIngredients);
    }

    function addStep() {
        setSteps([...steps, '']);
    }

    function removeStep(idx: number) {
        if (steps.length > 1) {
            setSteps(steps.filter((_, i) => i !== idx));
        }
    }

    function updateStep(idx: number, value: string) {
        const newSteps = [...steps];
        newSteps[idx] = value;
        setSteps(newSteps);
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
            
            await updateRecipeOnServer({
                recipeId,
                user_id,
                title,
                time,
                tags: tags,
                ingredients: ingredientsArr,
                steps: stepsArr,
            });
            
            // Clear the store and navigate back to the updated recipe
            recipeStore.clearEditRecipe();
            router.replace({
                pathname: '/recipe-detail',
                params: { id: recipeId }
            });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update recipe');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6DA98C" />
                <CustomText style={styles.loadingText}>Loading recipe...</CustomText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={26} color="#222" />
                    </TouchableOpacity>
                    <CustomText style={styles.logoText}>🍳</CustomText>
                    <View style={{ flex: 1 }} />
                </View>
                <CustomText style={styles.headerText}>Edit Recipe</CustomText>
                <CustomText style={styles.subHeader}>Make changes to your recipe</CustomText>
                <View style={styles.extractedIndicator}>
                    <Ionicons name="create-outline" size={16} color="#6DA98C" />
                    <CustomText style={styles.extractedText}>Editing existing recipe</CustomText>
                </View>
            </View>

            {/* Content */}
            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Recipe Name Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="restaurant-outline" size={20} color="#6DA98C" />
                        <CustomText style={styles.sectionTitle}>Recipe Name</CustomText>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Enter your recipe name" 
                        placeholderTextColor="#B0B0B0" 
                        value={title} 
                        onChangeText={setTitle}
                    />
                </View>

                {/* Basic Info Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={20} color="#6DA98C" />
                        <CustomText style={styles.sectionTitle}>Basic Information</CustomText>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Cook time (min)" 
                                placeholderTextColor="#B0B0B0" 
                                keyboardType="numeric" 
                                value={time} 
                                onChangeText={setTime}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Servings" 
                                placeholderTextColor="#B0B0B0" 
                                keyboardType="numeric" 
                                value={servings} 
                                onChangeText={setServings}
                            />
                        </View>
                    </View>
                    
                    {/* Tags */}
                    <View style={styles.tagsSection}>
                        <View style={styles.tagsContainer}>
                            {tags.map((tag, index) => (
                                <View key={index} style={styles.tagChip}>
                                    <CustomText style={styles.tagText}>{tag}</CustomText>
                                    <TouchableOpacity onPress={() => removeTag(tag)}>
                                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <View style={styles.newTagRow}>
                            <Ionicons name="pricetag-outline" size={18} color="#6DA98C" style={styles.newTagIcon} />
                            <TextInput
                                style={styles.newTagInput}
                                placeholder="Add a tag"
                                placeholderTextColor="#9CA3AF"
                                value={newTag}
                                onChangeText={setNewTag}
                                onSubmitEditing={addTag}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                style={[styles.newTagButton, !newTag.trim() && styles.newTagButtonDisabled]}
                                onPress={addTag}
                                disabled={!newTag.trim()}
                            >
                                <Ionicons name="add" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <CustomText style={styles.tagHelper}>Press return or tap add to save the tag</CustomText>
                    </View>
                </View>

                {/* Ingredients Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="list-outline" size={20} color="#6DA98C" />
                        <CustomText style={styles.sectionTitle}>Ingredients</CustomText>
                    </View>
                    {ingredients.map((ingredient, idx) => (
                        <View key={idx} style={styles.inputRow}>
                            <TextInput 
                                style={[styles.input, styles.flexInput]} 
                                placeholder={`Ingredient ${idx + 1}`} 
                                placeholderTextColor="#B0B0B0" 
                                value={ingredient} 
                                onChangeText={(value) => updateIngredient(idx, value)}
                            />
                            {ingredients.length > 1 && (
                                <TouchableOpacity 
                                    style={styles.removeButton} 
                                    onPress={() => removeIngredient(idx)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
                        <Ionicons name="add-circle-outline" size={20} color="#6DA98C" />
                        <CustomText style={styles.addButtonText}>Add Ingredient</CustomText>
                    </TouchableOpacity>
                </View>

                {/* Steps Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="list-outline" size={20} color="#6DA98C" />
                        <CustomText style={styles.sectionTitle}>Instructions</CustomText>
                    </View>
                    {steps.map((step, idx) => (
                        <View key={idx} style={styles.inputRow}>
                            <View style={styles.stepNumber}>
                                <CustomText style={styles.stepNumberText}>{idx + 1}</CustomText>
                            </View>
                            <TextInput 
                                style={[styles.input, styles.flexInput, styles.stepInput]} 
                                placeholder={`Step ${idx + 1}`} 
                                placeholderTextColor="#B0B0B0" 
                                value={step} 
                                onChangeText={(value) => updateStep(idx, value)}
                                multiline
                            />
                            {steps.length > 1 && (
                                <TouchableOpacity 
                                    style={styles.removeButton} 
                                    onPress={() => removeStep(idx)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={addStep}>
                        <Ionicons name="add-circle-outline" size={20} color="#6DA98C" />
                        <CustomText style={styles.addButtonText}>Add Step</CustomText>
                    </TouchableOpacity>
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                    onPress={handleSaveRecipe}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={20} color="#fff" />
                            <CustomText style={styles.saveButtonText}>Update Recipe</CustomText>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    errorText: {
        fontSize: 18,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#6DA98C',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    retryButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    header: {
        backgroundColor: '#6DA98C',
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logoText: {
        fontSize: 24,
        color: '#fff',
    },
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subHeader: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 16,
    },
    extractedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    extractedText: {
        fontSize: 14,
        color: '#fff',
        marginLeft: 6,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#222',
        marginLeft: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#222',
        backgroundColor: '#F9FAFB',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    flexInput: {
        flex: 1,
    },
    removeButton: {
        padding: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#6DA98C',
        borderStyle: 'dashed',
        borderRadius: 12,
        marginTop: 8,
    },
    addButtonText: {
        fontSize: 16,
        color: '#6DA98C',
        marginLeft: 8,
        fontWeight: '500',
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#6DA98C',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    stepNumberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
    stepInput: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    tagsSection: {
        marginTop: 12,
        gap: 12,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    tagText: {
        fontSize: 14,
        color: '#2D5A4A',
        fontWeight: '500',
    },
    newTagInput: {
        flex: 1,
        paddingVertical: 6,
        fontSize: 14,
        color: '#111827',
    },
    newTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    newTagIcon: {
        marginRight: 2,
    },
    newTagButton: {
        backgroundColor: '#6DA98C',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    newTagButtonDisabled: {
        backgroundColor: '#C7DAD0',
    },
    tagHelper: {
        fontSize: 12,
        color: '#6B7280',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6DA98C',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 20,
        gap: 8,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
}); 