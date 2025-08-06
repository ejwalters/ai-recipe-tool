import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  SafeAreaView, 
  Animated, 
  Easing, 
  Dimensions,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { supabase } from '../lib/supabase';
import { Heart, HeartIcon, Book, BookIcon } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RecipeDetailV2Props {
  recipes?: any[];
  router?: any;
}

export default function RecipeDetailV2({ recipes, router: propRouter }: RecipeDetailV2Props) {
  const router = propRouter || useRouter();
  const params = useLocalSearchParams();
  const isAIRecipe = params.isAI === '1' || params.message_id; // AI recipe if isAI=1 OR has message_id
  const fromRecentlyCooked = params.fromRecentlyCooked === '1';
  const [loading, setLoading] = useState(!isAIRecipe);
  const [recipe, setRecipe] = useState<any>(null);
  const [favorited, setFavorited] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Cooking state
  const [cooking, setCooking] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([]);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // AI Modification state
  const [showModificationSection, setShowModificationSection] = useState(false);
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [modifiedRecipe, setModifiedRecipe] = useState<any>(null);
  const [showModifiedRecipe, setShowModifiedRecipe] = useState(false);
  const [savingModified, setSavingModified] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fetch user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  // Load recipe data
  useEffect(() => {
    if (params.id) {
      setLoading(true);
      const url = userId 
        ? `https://familycooksclean.onrender.com/recipes/${params.id}?user_id=${userId}`
        : `https://familycooksclean.onrender.com/recipes/${params.id}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setRecipe(data);
          setFavorited(data.is_favorited || false);
          setSaved(true); // If we can load it, it's already saved
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      // For AI recipes passed directly in params
      function toArray(val: any): string[] {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
          } catch { }
          if (val.match(/\\.,|\\. (?=[A-Z])/)) {
            return val.split(/\\.,|\\. (?=[A-Z])/).map(s => s.trim()).filter(Boolean);
          }
          if (val.includes('||')) return val.split('||').map(s => s.trim());
          if (val.includes('\\n')) return val.split('\\n').map(s => s.trim());
          if (val.includes('\n')) return val.split('\n').map(s => s.trim());
          if (!val.includes('.') && val.split(',').length > 1) return val.split(',').map(s => s.trim());
          return [val];
        }
        return [];
      }
      setRecipe({
        id: params.saved_recipe_id, // Add the saved recipe ID if available
        title: params.title || 'AI Recipe',
        time: params.time || '',
        tags: toArray(params.tags),
        ingredients: toArray(params.ingredients),
        steps: toArray(params.steps),
        message_id: params.message_id, // Add message ID for reference
      });
      // If we have a saved_recipe_id, the recipe is already saved
      if (params.saved_recipe_id) {
        setSaved(true);
      }
        // If this is an AI recipe from chat, it should be treated as an AI recipe
  if (params.message_id) {
    const isSaved = !!params.saved_recipe_id || !!params.id;
    setSaved(isSaved);
    console.log('AI Recipe Debug:', { 
      message_id: params.message_id, 
      saved_recipe_id: params.saved_recipe_id, 
      id: params.id,
      isSaved 
    });
    
    // Note: We're relying on the chat screen to pass the correct saved_recipe_id
    // when the recipe has been saved. The chat screen should refresh its messages
    // after a recipe is saved to get the updated saved_recipe_id.
  }
      setLoading(false);
    }
  }, [params.id, params.saved_recipe_id, params.message_id, userId]);



  // Initialize checked/completed state
  useEffect(() => {
    if (recipe?.ingredients) {
      setCheckedIngredients(Array(recipe.ingredients.length).fill(false));
    }
  }, [recipe?.ingredients]);

  useEffect(() => {
    if (recipe?.steps) {
      setCompletedSteps(Array(recipe.steps.length).fill(false));
    }
  }, [recipe?.steps]);

  // Timer effect
  useEffect(() => {
    if (cooking && timerRunning) {
      timerRef.current = setTimeout(() => setTimer(t => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooking, timerRunning, timer]);

  // Pulse animation
  useEffect(() => {
    if (cooking && timerRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [cooking, timerRunning]);

  // Slide animation when cooking starts
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: cooking ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [cooking]);

  // Progress animation
  useEffect(() => {
    const progress = completedSteps.filter(Boolean).length / (recipe?.steps?.length || 1);
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [completedSteps, recipe?.steps]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const handleSaveRecipe = async () => {
    if (!userId || !recipe || saved || saving) return;
    
    // Don't show loading wheel, just save instantly
    // setSaving(true);
    try {
      const saveRes = await fetch('https://familycooksclean.onrender.com/recipes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: recipe.title,
          time: recipe.time,
          tags: recipe.tags,
          ingredients: recipe.ingredients,
          steps: recipe.steps
        }),
      });
      
      if (!saveRes.ok) throw new Error('Failed to save recipe');
      
      const savedRecipe = await saveRes.json();
      
      // Update the recipe object with the new ID
      setRecipe((prev: any) => ({ ...prev, id: savedRecipe.id }));
      setSaved(true);
      
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
      
      // Update the message with the saved recipe ID if this is from chat
      if (recipe.message_id) {
        console.log('Updating message with saved recipe ID:', {
          message_id: recipe.message_id,
          saved_recipe_id: savedRecipe.id
        });
        
        try {
          const updateRes = await fetch('https://familycooksclean.onrender.com/recipes/save-message-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message_id: recipe.message_id,
              saved_recipe_id: savedRecipe.id
            }),
          });
          
          if (updateRes.ok) {
            console.log('Successfully updated message with saved recipe ID');
            // Also update the local recipe state to include the saved_recipe_id
            setRecipe((prev: any) => ({ 
              ...prev, 
              id: savedRecipe.id,
              saved_recipe_id: savedRecipe.id 
            }));
            
            // Note: We don't need to update URL parameters since we're just updating local state
            // The saved state will persist for this session
          } else {
            console.log('Failed to update message with saved recipe ID');
            const errorText = await updateRes.text();
            console.log('Error response:', errorText);
          }
        } catch (err) {
          console.log('Error updating message:', err);
        }
      }
    } catch (err) {
      alert('Failed to save recipe. Please try again.');
    } finally {
      // setSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId) return;
    
    // For AI recipes that haven't been saved yet, we need to save them first
    let recipeId = recipe?.id;
    
    if (!recipeId && isAIRecipe && recipe?.message_id) {
      // Save the AI recipe first
      try {
        const saveRes = await fetch('https://familycooksclean.onrender.com/recipes/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            title: recipe.title,
            time: recipe.time,
            tags: recipe.tags,
            ingredients: recipe.ingredients,
            steps: recipe.steps
          }),
        });
        
        if (!saveRes.ok) throw new Error('Failed to save recipe');
        
        const savedRecipe = await saveRes.json();
        recipeId = savedRecipe.id;
        
        // Update the recipe object with the new ID
        setRecipe((prev: any) => ({ ...prev, id: recipeId }));
        
        // Update the message with the saved recipe ID
        if (recipe.message_id) {
          await fetch('https://familycooksclean.onrender.com/recipes/save-message-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message_id: recipe.message_id,
              saved_recipe_id: recipeId
            }),
          });
        }
      } catch (err) {
        alert('Failed to save recipe. Please try again.');
        return;
      }
    }
    
    if (!recipeId) {
      alert('Unable to save recipe. Please try again.');
      return;
    }
    
    const currentlyFav = favorited;
    setFavorited(f => !f);
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
      setFavorited(currentlyFav);
      alert('Failed to update favorite. Please try again.');
    }
  };

  const handleStartCooking = async () => {
    if (!cooking) {
      if (!userId) return;
      
      // For AI recipes that haven't been saved yet, we need to save them first
      let recipeId = recipe?.id;
      
      if (!recipeId && isAIRecipe && recipe?.message_id) {
        // Save the AI recipe first
        try {
          const saveRes = await fetch('https://familycooksclean.onrender.com/recipes/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              title: recipe.title,
              time: recipe.time,
              tags: recipe.tags,
              ingredients: recipe.ingredients,
              steps: recipe.steps
            }),
          });
          
          if (!saveRes.ok) throw new Error('Failed to save recipe');
          
          const savedRecipe = await saveRes.json();
          recipeId = savedRecipe.id;
          
          // Update the recipe object with the new ID
          setRecipe((prev: any) => ({ ...prev, id: recipeId }));
          
          // Update the message with the saved recipe ID
          if (recipe.message_id) {
            await fetch('https://familycooksclean.onrender.com/recipes/save-message-recipe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message_id: recipe.message_id,
                saved_recipe_id: recipeId
              }),
            });
          }
        } catch (err) {
          console.error('Failed to save recipe:', err);
          return;
        }
      }
      
      if (!recipeId) {
        console.error('Unable to save recipe');
        return;
      }
      
      try {
        const res = await fetch('https://familycooksclean.onrender.com/recipes/start-cooking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipeId }),
        });
        
        if (!res.ok) {
          console.error('Failed to record cooking start');
        }
      } catch (err) {
        console.error('Error recording cooking start:', err);
      }
      
      setCooking(true);
      setTimerRunning(true);
      setTimer(0);
    } else {
      setCooking(false);
      setTimerRunning(false);
      
      if (userId && recipe?.id) {
        try {
          const res = await fetch('https://familycooksclean.onrender.com/recipes/update-recently-cooked', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              user_id: userId, 
              recipe_id: recipe.id
            }),
          });
          
          if (!res.ok) {
            console.error('Failed to update recently cooked');
          }
        } catch (err) {
          console.error('Error updating recently cooked:', err);
        }
      }
    }
  };

  // AI Modification Functions
  const handleModifyRecipe = async () => {
    if (!modificationPrompt.trim() || !userId) {
      Alert.alert('Error', 'Please enter a modification request');
      return;
    }

    setIsModifying(true);
    try {
      const response = await fetch('https://familycooksclean.onrender.com/ai/modify-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            title: recipe.title,
            time: recipe.time,
            servings: recipe.servings,
            ingredients: ingredients,
            steps: steps,
            tags: tags
          },
          userPrompt: modificationPrompt,
          user_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to modify recipe');
      }

      const modifiedData = await response.json();
      setModifiedRecipe(modifiedData);
      setShowModifiedRecipe(true);
      setModificationPrompt('');
      setShowModificationSection(false);

    } catch (error: any) {
      console.error('Error modifying recipe:', error);
      Alert.alert(
        'Modification Error',
        error.message || 'Failed to modify recipe. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsModifying(false);
    }
  };

  const handleSaveModifiedRecipe = async () => {
    if (!modifiedRecipe || !userId) return;

    setSavingModified(true);
    try {
      const response = await fetch('https://familycooksclean.onrender.com/recipes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: modifiedRecipe.title,
          time: modifiedRecipe.time,
          servings: modifiedRecipe.servings,
          ingredients: modifiedRecipe.ingredients,
          steps: modifiedRecipe.steps,
          tags: modifiedRecipe.tags
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save modified recipe');
      }

      const savedRecipe = await response.json();
      Alert.alert(
        'Success!',
        'Modified recipe saved to your collection!',
        [
          {
            text: 'View Recipe',
            onPress: () => {
              setShowModifiedRecipe(false);
              setModifiedRecipe(null);
              router.push({
                pathname: '/recipe-detail',
                params: { id: savedRecipe.id }
              });
            }
          },
          {
            text: 'Stay Here',
            onPress: () => {
              setShowModifiedRecipe(false);
              setModifiedRecipe(null);
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Error saving modified recipe:', error);
      Alert.alert(
        'Save Error',
        error.message || 'Failed to save modified recipe. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSavingModified(false);
    }
  };

  const handleCancelModification = () => {
    setShowModifiedRecipe(false);
    setModifiedRecipe(null);
    setModificationPrompt('');
    setShowModificationSection(false);
  };

  function ensureArray(val: any, fallback: string[]): string[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return ensureArray(parsed, fallback);
      } catch { }
      if (val.includes('||')) return val.split('||').map(s => s.trim());
      if (val.includes('\\n')) return val.split('\\n').map(s => s.trim());
      if (val.includes('\n')) return val.split('\n').map(s => s.trim());
      if (!val.includes('.') && val.split(',').length > 1) return val.split(',').map(s => s.trim());
      return [val];
    }
    return fallback;
  }

  const tags = ensureArray(recipe?.tags, []);
  const ingredients = ensureArray(recipe?.ingredients, []);
  const steps = ensureArray(recipe?.steps, []);

  if (loading || !recipe) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header with gradient background */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              router.back();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* Show save button for unsaved AI recipes */}
          {isAIRecipe && !saved && (
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSaveRecipe}
              disabled={saving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Book color="#fff" size={24} />
            </TouchableOpacity>
          )}
          
          {/* Show saved indicator for AI recipes that have been saved */}
          {isAIRecipe && saved && (
            <View style={styles.savedIndicator}>
              <BookIcon color="#48BB78" size={24} />
            </View>
          )}
          

          
          {/* Show favorite button only for non-AI recipes (never for AI recipes) */}
          {!isAIRecipe && (
            <TouchableOpacity 
              style={styles.favoriteButton} 
              onPress={handleToggleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {favorited ? (
                <HeartIcon color="#FF6B6B" size={24} />
              ) : (
                <Heart color="#fff" size={24} />
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.recipeInfo}>
          <CustomText style={styles.recipeTitle}>{recipe.title}</CustomText>
          <View style={styles.recipeMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#fff" />
              <CustomText style={styles.metaText}>{recipe.time}</CustomText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="restaurant-outline" size={16} color="#fff" />
              <CustomText style={styles.metaText}>{ingredients.length} ingredients</CustomText>
            </View>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {tags.map((tag: string, idx: number) => (
              <View key={idx} style={styles.tag}>
                <CustomText style={styles.tagText}>{tag}</CustomText>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <Animated.View style={styles.successToast}>
          <View style={styles.successToastContent}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <CustomText style={styles.successToastText}>Recipe saved to your collection!</CustomText>
          </View>
        </Animated.View>
      )}

      {/* Cooking Progress Bar */}
      {cooking && (
        <Animated.View 
          style={[
            styles.progressContainer,
            { transform: [{ translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0]
            })}] }
          ]}
        >
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          <CustomText style={styles.progressText}>
            {completedSteps.filter(Boolean).length} of {steps.length} steps completed
          </CustomText>
        </Animated.View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cooking Timer */}
        <Animated.View 
          style={[
            styles.timerContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <TouchableOpacity 
            style={[styles.cookButton, cooking && styles.cookButtonActive]} 
            onPress={handleStartCooking}
          >
            <Ionicons 
              name={cooking ? "pause" : "play"} 
              size={24} 
              color="#fff" 
              style={styles.cookButtonIcon}
            />
            <CustomText style={styles.cookButtonText}>
              {cooking ? `Cooking (${formatTime(timer)})` : 'Start Cooking'}
            </CustomText>
          </TouchableOpacity>
        </Animated.View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color="#2D3748" />
            <CustomText style={styles.sectionTitle}>Ingredients</CustomText>
            <CustomText style={styles.sectionSubtitle}>
              {checkedIngredients.filter(Boolean).length} of {ingredients.length} gathered
            </CustomText>
          </View>
          
          <View style={styles.ingredientsList}>
            {ingredients.map((ing: string, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.ingredientItem,
                  checkedIngredients[idx] && styles.ingredientItemChecked,
                  !cooking && styles.ingredientItemDisabled
                ]}
                onPress={() => cooking && toggleIngredient(idx)}
                activeOpacity={cooking ? 0.7 : 1}
                disabled={!cooking}
              >
                <View style={[
                  styles.ingredientCheckbox,
                  checkedIngredients[idx] && styles.ingredientCheckboxChecked
                ]}>
                  {checkedIngredients[idx] && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <CustomText style={[
                  styles.ingredientText,
                  checkedIngredients[idx] && styles.ingredientTextChecked
                ]}>
                  {ing}
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Steps Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="footsteps-outline" size={20} color="#2D3748" />
            <CustomText style={styles.sectionTitle}>Instructions</CustomText>
            <CustomText style={styles.sectionSubtitle}>
              Follow along step by step
            </CustomText>
          </View>
          
          <View style={styles.stepsList}>
            {steps.map((step: string, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.stepItem,
                  completedSteps[idx] && styles.stepItemCompleted,
                ]}
              >
                <TouchableOpacity
                  style={styles.stepContent}
                  onPress={() => cooking && toggleStep(idx)}
                  activeOpacity={cooking ? 0.7 : 1}
                  disabled={!cooking}
                >
                  <View style={[
                    styles.stepNumber,
                    completedSteps[idx] && styles.stepNumberCompleted
                  ]}>
                    <CustomText style={[
                      styles.stepNumberText,
                      completedSteps[idx] && styles.stepNumberTextCompleted
                    ]}>
                      {idx + 1}
                    </CustomText>
                  </View>
                  
                  <View style={styles.stepTextContainer}>
                    <CustomText style={[
                      styles.stepText,
                      completedSteps[idx] && styles.stepTextCompleted
                    ]}>
                      {step}
                    </CustomText>
                  </View>
                  
                  {cooking && (
                    <View style={[
                      styles.stepCheckbox,
                      completedSteps[idx] && styles.stepCheckboxChecked
                    ]}>
                      {completedSteps[idx] && (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* AI Recipe Modification Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={20} color="#2D3748" />
            <CustomText style={styles.sectionTitle}>AI Recipe Modifier</CustomText>
            <CustomText style={styles.sectionSubtitle}>
              Get AI suggestions to modify this recipe
            </CustomText>
          </View>
          
          {!showModificationSection ? (
            <TouchableOpacity
              style={styles.modifyButton}
              onPress={() => setShowModificationSection(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={20} color="#667EEA" />
              <CustomText style={styles.modifyButtonText}>Modify Recipe with AI</CustomText>
            </TouchableOpacity>
          ) : (
            <View style={styles.modificationContainer}>
              <TextInput
                style={styles.modificationInput}
                placeholder="Describe how you'd like to modify this recipe (e.g., 'Make it vegetarian', 'Double the servings', 'Make it spicier')"
                placeholderTextColor="#A0AEC0"
                value={modificationPrompt}
                onChangeText={setModificationPrompt}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <View style={styles.modificationButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowModificationSection(false);
                    setModificationPrompt('');
                  }}
                  activeOpacity={0.8}
                >
                  <CustomText style={styles.cancelButtonText}>Cancel</CustomText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitButton, !modificationPrompt.trim() && styles.submitButtonDisabled]}
                  onPress={handleModifyRecipe}
                  disabled={!modificationPrompt.trim() || isModifying}
                  activeOpacity={0.8}
                >
                  {isModifying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#fff" />
                      <CustomText style={styles.submitButtonText}>Modify</CustomText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Modified Recipe Preview */}
        {showModifiedRecipe && modifiedRecipe && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#48BB78" />
              <CustomText style={styles.sectionTitle}>Modified Recipe</CustomText>
              <CustomText style={styles.sectionSubtitle}>
                {modifiedRecipe.modifications || 'Recipe modified based on your request'}
              </CustomText>
            </View>
            
            <View style={styles.modifiedRecipeContainer}>
              <View style={styles.modifiedRecipeHeader}>
                <CustomText style={styles.modifiedRecipeTitle}>{modifiedRecipe.title}</CustomText>
                <View style={styles.modifiedRecipeMeta}>
                  <View style={styles.modifiedMetaItem}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <CustomText style={styles.modifiedMetaText}>{modifiedRecipe.time}</CustomText>
                  </View>
                  <View style={styles.modifiedMetaItem}>
                    <Ionicons name="restaurant-outline" size={14} color="#6B7280" />
                    <CustomText style={styles.modifiedMetaText}>{modifiedRecipe.servings}</CustomText>
                  </View>
                </View>
              </View>
              
              <View style={styles.modifiedRecipeContent}>
                <View style={styles.modifiedSection}>
                  <CustomText style={styles.modifiedSectionTitle}>Ingredients</CustomText>
                  {modifiedRecipe.ingredients?.map((ing: string, idx: number) => (
                    <CustomText key={idx} style={styles.modifiedIngredient}>• {ing}</CustomText>
                  ))}
                </View>
                
                <View style={styles.modifiedSection}>
                  <CustomText style={styles.modifiedSectionTitle}>Instructions</CustomText>
                  {modifiedRecipe.steps?.map((step: string, idx: number) => (
                    <View key={idx} style={styles.modifiedStep}>
                      <CustomText style={styles.modifiedStepNumber}>{idx + 1}.</CustomText>
                      <CustomText style={styles.modifiedStepText}>{step}</CustomText>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.modifiedRecipeActions}>
                <TouchableOpacity
                  style={styles.saveModifiedButton}
                  onPress={handleSaveModifiedRecipe}
                  disabled={savingModified}
                  activeOpacity={0.8}
                >
                  {savingModified ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#fff" />
                      <CustomText style={styles.saveModifiedButtonText}>Save Modified Recipe</CustomText>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cancelModifiedButton}
                  onPress={handleCancelModification}
                  activeOpacity={0.8}
                >
                  <CustomText style={styles.cancelModifiedButtonText}>Cancel</CustomText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#667EEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#667EEA',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveRecipeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  saveRecipeButton: {
    backgroundColor: '#48BB78',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveRecipeButtonDisabled: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveRecipeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  savedSuccessContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0FFF4',
    borderBottomWidth: 1,
    borderBottomColor: '#C6F6D5',
  },
  savedSuccessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedSuccessText: {
    color: '#2F855A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  successToast: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#48BB78',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  successToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successToastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  recipeInfo: {
    alignItems: 'flex-start',
  },
  recipeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 34,
  },
  recipeMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  tagsContainer: {
    marginBottom: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#48BB78',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  timerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  cookButton: {
    backgroundColor: '#48BB78',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cookButtonActive: {
    backgroundColor: '#E53E3E',
    shadowColor: '#E53E3E',
  },
  cookButtonIcon: {
    marginRight: 8,
  },
  cookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginLeft: 8,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  ingredientsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  ingredientItemChecked: {
    opacity: 0.6,
  },
  ingredientItemDisabled: {
    opacity: 0.5,
  },
  ingredientCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    backgroundColor: '#fff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientCheckboxChecked: {
    backgroundColor: '#48BB78',
    borderColor: '#48BB78',
  },
  ingredientText: {
    fontSize: 16,
    color: '#2D3748',
    flex: 1,
    lineHeight: 22,
  },
  ingredientTextChecked: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
  },
  stepsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepItem: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    overflow: 'hidden',
  },
  stepItemCompleted: {
    backgroundColor: '#F0FFF4',
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberCompleted: {
    backgroundColor: '#48BB78',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
  },
  stepNumberTextCompleted: {
    color: '#fff',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 16,
    color: '#2D3748',
    lineHeight: 24,
  },
  stepTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
  },
  stepCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  stepCheckboxChecked: {
    backgroundColor: '#48BB78',
    borderColor: '#48BB78',
  },
  bottomSpacing: {
    height: 40,
  },
  modifyButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modifyButtonText: {
    color: '#667EEA',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modificationContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modificationInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2D3748',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modificationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#667EEA',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginLeft: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0AEC0',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  modifiedRecipeContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modifiedRecipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modifiedRecipeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3748',
    flex: 1,
    marginRight: 10,
  },
  modifiedRecipeMeta: {
    flexDirection: 'row',
  },
  modifiedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  modifiedMetaText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  modifiedRecipeContent: {
    marginBottom: 16,
  },
  modifiedSection: {
    marginBottom: 16,
  },
  modifiedSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
  },
  modifiedIngredient: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 8,
  },
  modifiedStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modifiedStepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
    marginRight: 10,
  },
  modifiedStepText: {
    fontSize: 16,
    color: '#2D3748',
    lineHeight: 22,
  },
  modifiedRecipeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  saveModifiedButton: {
    backgroundColor: '#48BB78',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  saveModifiedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelModifiedButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginLeft: 10,
  },
  cancelModifiedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 