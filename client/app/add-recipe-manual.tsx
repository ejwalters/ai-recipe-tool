import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import CustomText from '../components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// Helper to call backend
async function addRecipeToServer({ user_id, title, time, tags, ingredients, steps }: { user_id: string; title: string; time: string; tags: string[]; ingredients: string[]; steps: string[] }) {
    const response = await fetch('https://familycooksclean.onrender.com/recipes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, title, time, tags, ingredients, steps }),
    });
    if (!response.ok) throw new Error('Failed to add recipe');
    return response.json();
}

export default function AddRecipeManualScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [title, setTitle] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [time, setTime] = useState('');
    const [servings, setServings] = useState('');
    const [ingredients, setIngredients] = useState(['']);
    const [steps, setSteps] = useState(['']);
    const [saving, setSaving] = useState(false);

    // Load extracted data from photo if available
    useEffect(() => {
        const loadExtractedData = () => {
            let hasChanges = false;
            const updates: any = {};

            if (params.extractedTitle && params.extractedTitle !== title) {
                updates.title = params.extractedTitle as string;
                hasChanges = true;
            }
            if (params.extractedTime && params.extractedTime !== time) {
                updates.time = params.extractedTime as string;
                hasChanges = true;
            }
            if (params.extractedServings && params.extractedServings !== servings) {
                updates.servings = params.extractedServings as string;
                hasChanges = true;
            }
            if (params.extractedIngredients) {
                try {
                    const extractedIngredients = JSON.parse(params.extractedIngredients as string);
                    if (Array.isArray(extractedIngredients) && extractedIngredients.length > 0) {
                        updates.ingredients = extractedIngredients;
                        hasChanges = true;
                    }
                } catch (error) {
                    console.error('Error parsing extracted ingredients:', error);
                }
            }
            if (params.extractedSteps) {
                try {
                    const extractedSteps = JSON.parse(params.extractedSteps as string);
                    if (Array.isArray(extractedSteps) && extractedSteps.length > 0) {
                        updates.steps = extractedSteps;
                        hasChanges = true;
                    }
                } catch (error) {
                    console.error('Error parsing extracted steps:', error);
                }
            }
            if (params.extractedTags) {
                try {
                    const extractedTags = JSON.parse(params.extractedTags as string);
                    if (Array.isArray(extractedTags) && extractedTags.length > 0) {
                        updates.tags = extractedTags;
                        hasChanges = true;
                    }
                } catch (error) {
                    console.error('Error parsing extracted tags:', error);
                }
            }

            // Only update state if there are actual changes
            if (hasChanges) {
                if (updates.title !== undefined) setTitle(updates.title);
                if (updates.time !== undefined) setTime(updates.time);
                if (updates.servings !== undefined) setServings(updates.servings);
                if (updates.ingredients !== undefined) setIngredients(updates.ingredients);
                if (updates.steps !== undefined) setSteps(updates.steps);
                if (updates.tags !== undefined) setTags(updates.tags);
            }
        };

        loadExtractedData();
    }, [params.extractedTitle, params.extractedTime, params.extractedServings, params.extractedIngredients, params.extractedSteps, params.extractedTags]);

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
        setIngredients(ingredients.map((ing, i) => (i === idx ? value : ing)));
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
        setSteps(steps.map((step, i) => (i === idx ? value : step)));
    }

    async function handleSaveRecipe() {
        setSaving(true);
        try {
            const { data } = await supabase.auth.getUser();
            const user_id = data?.user?.id;
            if (!user_id) {
                Alert.alert('Error', 'You must be logged in to add a recipe.');
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
            
            await addRecipeToServer({
                user_id,
                title,
                time,
                tags: tags, // Now using the tags array directly
                ingredients: ingredientsArr,
                steps: stepsArr,
            });
            
            router.replace('/(tabs)');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to add recipe');
        } finally {
            setSaving(false);
        }
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
                <CustomText style={styles.headerText}>
                    {params.extractedTitle ? 'Edit Extracted Recipe' : 'Create Recipe'}
                </CustomText>
                <CustomText style={styles.subHeader}>
                    {params.extractedTitle ? 'Review and edit the extracted recipe details' : 'Add your own recipe from scratch'}
                </CustomText>
                {params.extractedTitle && (
                    <View style={styles.extractedIndicator}>
                        <Ionicons name="sparkles" size={16} color="#6DA98C" />
                        <CustomText style={styles.extractedText}>AI extracted from photo</CustomText>
                    </View>
                )}
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
                    <View style={styles.tagsContainer}>
                        {tags.map((tag, index) => (
                            <View key={index} style={styles.tagChip}>
                                <CustomText style={styles.tagText}>{tag}</CustomText>
                                <TouchableOpacity onPress={() => removeTag(tag)}>
                                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TextInput
                            style={styles.newTagInput}
                            placeholder="Add tags (press Enter to add)"
                            placeholderTextColor="#B0B0B0"
                            value={newTag}
                            onChangeText={setNewTag}
                            onSubmitEditing={addTag}
                            returnKeyType="done"
                        />
                    </View>
                </View>

                {/* Ingredients Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="nutrition-outline" size={20} color="#6DA98C" />
                        <CustomText style={styles.sectionTitle}>Ingredients</CustomText>
                    </View>
                    {ingredients.map((ing, idx) => (
                        <View key={idx} style={styles.dynamicRow}>
                            <TextInput
                                style={[styles.input, styles.dynamicInput]}
                                placeholder={`Ingredient ${idx + 1}`}
                                placeholderTextColor="#B0B0B0"
                                value={ing}
                                onChangeText={val => updateIngredient(idx, val)}
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
                        <View key={idx} style={styles.dynamicRow}>
                            <View style={styles.stepNumber}>
                                <CustomText style={styles.stepNumberText}>{idx + 1}</CustomText>
                            </View>
                            <TextInput
                                style={[styles.input, styles.dynamicInput]}
                                placeholder={`Step ${idx + 1}`}
                                placeholderTextColor="#B0B0B0"
                                value={step}
                                onChangeText={val => updateStep(idx, val)}
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
                    activeOpacity={0.92}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={20} color="#fff" />
                            <CustomText style={styles.saveButtonText}>Save Recipe</CustomText>
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
        backgroundColor: '#F7F7FA',
    },
    header: {
        backgroundColor: '#F3F0FF',
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    backButton: {
        marginRight: 8,
        padding: 4,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#222',
        letterSpacing: 0.5,
    },
    headerText: {
        fontSize: 26,
        fontWeight: '800',
        color: '#222',
        marginTop: 2,
        marginLeft: 2,
        letterSpacing: -0.5,
    },
    subHeader: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 2,
        marginBottom: 8,
    },
    extractedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#E0F2FE',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    extractedText: {
        color: '#6DA98C',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#F7F7FA',
    },
    scrollContent: {
        paddingBottom: 100,
        marginTop: 24,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 18,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginLeft: 8,
        letterSpacing: -0.3,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#222',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    dynamicRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    dynamicInput: {
        flex: 1,
        marginBottom: 0,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#6DA98C',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    removeButton: {
        marginLeft: 8,
        marginTop: 2,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E0F2FE',
        marginTop: 4,
    },
    addButtonText: {
        color: '#6DA98C',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6DA98C',
        borderRadius: 16,
        paddingVertical: 16,
        marginHorizontal: 18,
        marginTop: 8,
        shadowColor: '#6DA98C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        minHeight: 50,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginVertical: 2,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    tagText: {
        color: '#6DA98C',
        fontSize: 14,
        fontWeight: '600',
        marginRight: 6,
    },
    newTagInput: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#222',
        borderRadius: 12,
        backgroundColor: 'transparent',
        borderWidth: 0,
        marginVertical: 2,
        marginHorizontal: 4,
        minWidth: 120,
    },
}); 