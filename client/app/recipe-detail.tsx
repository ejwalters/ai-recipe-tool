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
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { supabase } from '../lib/supabase';
import { Heart, HeartIcon } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RecipeDetailV2Props {
  recipes?: any[];
  router?: any;
}

export default function RecipeDetailV2({ recipes, router: propRouter }: RecipeDetailV2Props) {
  const router = propRouter || useRouter();
  const params = useLocalSearchParams();
  
  // Debug logging for parameters
  console.log('=== RECIPE DETAIL PARAMS DEBUG ===');
  console.log('All params:', params);
  console.log('params.id:', params.id);
  console.log('params.saved_recipe_id:', params.saved_recipe_id);
  console.log('params.message_id:', params.message_id);
  console.log('params.isAI:', params.isAI);
  console.log('params.fromRecentlyCooked:', params.fromRecentlyCooked);
  console.log('Component render timestamp:', new Date().toISOString());
  
  const isAIRecipe = params.isAI === '1';
  const fromRecentlyCooked = params.fromRecentlyCooked === '1';
  const isSavedFromMessage = params.saved_recipe_id && params.message_id;
  const messageId = params.message_id;
  const [loading, setLoading] = useState(!isAIRecipe);
  const [recipe, setRecipe] = useState<any>(null);
  const [favorited, setFavorited] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cooking state
  const [cooking, setCooking] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([]);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
        title: params.title || 'AI Recipe',
        time: params.time || '',
        tags: toArray(params.tags),
        ingredients: toArray(params.ingredients),
        steps: toArray(params.steps),
      });
      setLoading(false);
    }
  }, [params.id, userId]);



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

  const handleToggleFavorite = async () => {
    if (!userId || !recipe?.id) return;
    const currentlyFav = favorited;
    setFavorited(f => !f);
    try {
      if (!currentlyFav) {
        const res = await fetch('https://familycooksclean.onrender.com/recipes/favorite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipe.id }),
        });
        if (!res.ok) throw new Error('Failed to favorite');
      } else {
        const res = await fetch('https://familycooksclean.onrender.com/recipes/favorite', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipe.id }),
        });
        if (!res.ok) throw new Error('Failed to unfavorite');
      }
    } catch (err) {
      setFavorited(currentlyFav);
      alert('Failed to update favorite. Please try again.');
    }
  };

  const handleSaveRecipe = async () => {
    if (!userId || !recipe || !(messageId || params.message_id)) return;
    
    setSaving(true);
    try {
      // First, save the recipe to get a recipe ID
      const saveRecipeRes = await fetch('https://familycooksclean.onrender.com/recipes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: recipe.title,
          time: recipe.time,
          tags: recipe.tags,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        }),
      });
      
      if (!saveRecipeRes.ok) throw new Error('Failed to save recipe');
      
      const savedRecipe = await saveRecipeRes.json();
      console.log('Recipe saved with ID:', savedRecipe.id);
      
      // Then, update the message with the saved recipe ID
      const updateMessageRes = await fetch('https://familycooksclean.onrender.com/recipes/save-message-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId || params.message_id,
          saved_recipe_id: savedRecipe.id,
        }),
      });
      
      if (!updateMessageRes.ok) throw new Error('Failed to update message');
      
      console.log('Message updated successfully');
      alert('Recipe saved successfully!');
      
      // Update the recipe object with the new ID
      setRecipe((prev: any) => ({ ...prev, id: savedRecipe.id }));
      setSaved(true);
      
    } catch (err) {
      console.error('Error saving recipe:', err);
      alert('Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartCooking = async () => {
    if (!cooking) {
      if (!userId || !recipe?.id) return;
      
      try {
        const res = await fetch('https://familycooksclean.onrender.com/recipes/start-cooking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, recipe_id: recipe.id }),
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

  // Robust check for saved_recipe_id
  const hasSavedRecipeId = params.saved_recipe_id !== undefined && params.saved_recipe_id !== null && params.saved_recipe_id !== '';

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
        </View>
        {/* Floating Save Recipe Button - bottom right of header */}
        {(() => {
          const hasMessageId = Boolean(messageId || params.message_id);
          const shouldShowSaveButton = Boolean(isAIRecipe && recipe && hasMessageId);
          console.log('Save/Saved Button Debug:', {
            isAIRecipe,
            messageId,
            params_message_id: params.message_id,
            hasMessageId,
            hasSavedRecipeId,
            saved,
            recipe_loaded: !!recipe,
            shouldShowSaveButton,
            isSaved: hasSavedRecipeId || saved,
          });
          return shouldShowSaveButton;
        })() && (
          <View style={styles.saveRecipeFABWrapper} pointerEvents="box-none">
            {(hasSavedRecipeId || saved) ? (
              <TouchableOpacity
                style={[styles.saveRecipeFAB, styles.saveRecipeFABDisabled]}
                disabled={true}
                activeOpacity={1}
              >
                <Ionicons name="bookmark" size={18} color="#FFD580" style={{ marginRight: 6 }} />
                <CustomText style={styles.saveRecipeFABText}>Saved</CustomText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={saving ? [styles.saveRecipeFAB, styles.saveRecipeFABDisabled] : styles.saveRecipeFAB}
                onPress={handleSaveRecipe}
                disabled={saving}
                activeOpacity={0.92}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#222" />
                ) : (
                  <>
                    <Ionicons name="bookmark-outline" size={18} color="#FFD580" style={{ marginRight: 6 }} />
                    <CustomText style={styles.saveRecipeFABText}>Save Recipe</CustomText>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        
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
  saveRecipeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  saveRecipeButton: {
    backgroundColor: '#B6E2D3',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#B6E2D3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveRecipeButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  saveRecipeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveRecipeButtonCard: {
    backgroundColor: '#FFF3C4',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    shadowColor: '#FFD580',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFE29A',
    marginTop: 10,
    marginBottom: 10,
  },
  saveRecipeButtonCardDisabled: {
    opacity: 0.6,
  },
  saveRecipeButtonCardText: {
    color: '#222',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saveRecipePillContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  saveRecipePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFD580',
    backgroundColor: 'rgba(255,243,196,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 22,
    minHeight: 36,
    minWidth: 120,
    shadowColor: 'transparent',
  },
  saveRecipePillDisabled: {
    opacity: 0.5,
  },
  saveRecipePillText: {
    color: '#FFD580',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saveRecipeIconButton: {
    marginHorizontal: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,243,196,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveRecipeFABWrapper: {
    position: 'absolute',
    right: 24,
    bottom: 8,
    zIndex: 10,
    shadowColor: '#FFD580',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  saveRecipeFAB: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD580',
    paddingVertical: 6,
    paddingHorizontal: 14,
    minHeight: 32,
    minWidth: 32,
    shadowColor: 'transparent',
  },
  saveRecipeFABDisabled: {
    opacity: 0.6,
  },
  saveRecipeFABText: {
    color: '#FFD580',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
}); 