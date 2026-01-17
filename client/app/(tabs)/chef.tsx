import React, { useRef, useEffect, useState, useCallback } from 'react';
import CustomText from '../../components/CustomText';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Platform, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecipeIconConfig } from '../../utils/recipeIcons';

export default function ChefScreen() {
    const router = useRouter();
    const startChatRef = useRef<any>(null);
    const chatBtnRefs = useRef<any[]>([]);
    const [chats, setChats] = useState<{ id: string; created_at?: string; summary?: string; recipes?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Fetch user ID on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data, error }) => {
            if (data?.user) {
                setUserId(data.user.id);
            } else {
                setUserId(null);
            }
        });
    }, []);

    // Fetch chats when userId is available or when screen is focused
    const fetchChats = useCallback((searchTerm = '', isSearch = false) => {
        if (!userId) return;
        
        if (isSearch) {
            setSearching(true);
        } else {
            setLoading(true);
        }
        
        // Build URL with search query if provided
        let url = `https://familycooksclean.onrender.com/ai/chats?user_id=${userId}`;
        if (searchTerm.trim()) {
            url += `&q=${encodeURIComponent(searchTerm.trim())}`;
        }
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setChats(data);
                if (isSearch) {
                    setSearching(false);
                } else {
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isSearch) {
                    setSearching(false);
                } else {
                    setLoading(false);
                }
            });
    }, [userId]);

    // Debounced search effect
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchChats(searchQuery, true); // true = isSearch
        }, 300); // 300ms debounce

        return () => clearTimeout(timeout);
    }, [searchQuery, fetchChats]);

    useFocusEffect(
        useCallback(() => {
            fetchChats('', false); // Load all chats when screen is focused
        }, [fetchChats])
    );

    // Pulsing animation for search
    useEffect(() => {
        if (searching) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [searching]);

    // Helper to open chat with animation origin
    const openChatFromRef = (ref: React.RefObject<any>, chatId?: string) => {
        if (ref.current) {
            ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                router.push({
                    pathname: '/chat',
                    params: {
                        originX: x + width / 2,
                        originY: y + height / 2,
                        originWidth: width,
                        originHeight: height,
                        originRadius: 20, // match button borderRadius
                        chat_id: chatId,
                    },
                });
            });
        } else {
            router.push({ pathname: '/chat', params: { chat_id: chatId } });
        }
    };

    // Format date for display - timeline style: "Today, 2:30 PM", "Yesterday, 8:15 AM", "2 days ago, 3:45 PM"
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        
        // Same day - show "Today, 2:30 PM"
        if (dateOnly.getTime() === today.getTime()) {
            return `Today, ${timeStr}`;
        }
        // Yesterday - show "Yesterday, 8:15 AM"
        if (dateOnly.getTime() === yesterday.getTime()) {
            return `Yesterday, ${timeStr}`;
        }
        // Within a week - show "X days ago, 3:45 PM"
        if (diffDays <= 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago, ${timeStr}`;
        }
        // Older - show date with time
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${dateStr}, ${timeStr}`;
    };

    // Get icon and color for chat card based on content analysis
    const getChatCardIcon = (summary: string | undefined, index: number, chatId: string) => {
        if (!summary) {
            // Fallback for empty summaries
            const fallbackIcons: any[] = ['restaurant-outline', 'restaurant-outline', 'leaf-outline'];
            const fallbackColors = ['#FFE5D0', '#E6EEFF', '#E0F4E0'];
            const fallbackIndex = index % fallbackIcons.length;
            return {
                icon: fallbackIcons[fallbackIndex],
                bgColor: fallbackColors[fallbackIndex],
                iconColor: '#FFFFFF',
            };
        }
        
        const text = summary.toLowerCase();
        // Extract likely title (first few words, usually capitalized) for better matching
        const words = summary.split(' ');
        const likelyTitle = words.slice(0, 4).join(' ').toLowerCase();
        const combinedText = `${likelyTitle} ${text}`;
        
        // Icon and color mappings based on content (check title first for better accuracy)
        let icon: any = 'restaurant-outline'; // default
        let bgColor = '#E6EEFF'; // default light blue
        const iconColor = '#FFFFFF'; // Always white icons for contrast
        
        // Fish and seafood (prioritize fish icon)
        if (/\b(salmon|fish|tuna|shrimp|seafood|crab|lobster|cod|tilapia|mackerel|sardine|anchovy|oyster|clam|mussel|trout|bass)\b/.test(combinedText)) {
            icon = 'fish-outline';
            bgColor = '#FFE0E6'; // light pink
        }
        // Pizza (specific icon)
        else if (/\b(pizza|neapolitan|margherita|pepperoni|pizza dough)\b/.test(combinedText)) {
            icon = 'pizza-outline';
            bgColor = '#FFF8DC'; // light yellow
        }
        // Beef dishes (burgers, steaks, etc.)
        else if (/\b(beef|burger|steak|meatball|brisket|roast|ribeye|sirloin|ground beef|hamburger)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#FFE5D0'; // light orange
        }
        // Soup and stew (often with beef or other meats)
        else if (/\b(stew|soup|chowder|broth|bouillon|gumbo|chili)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#FFE5D0'; // light orange
        }
        // Salad and vegetables (leaf icon)
        else if (/\b(salad|lettuce|spinach|kale|arugula|caesar|garden salad|vegetable salad)\b/.test(combinedText)) {
            icon = 'leaf-outline';
            bgColor = '#E0F4E0'; // light green
        }
        // Cabbage (specific vegetable)
        else if (/\b(cabbage|collard|bok choy)\b/.test(combinedText)) {
            icon = 'leaf-outline';
            bgColor = '#E0F4E0'; // light green
        }
        // Vegan/vegetarian meals
        else if (/\b(vegan|vegetarian|tofu|tempeh|plant-based|meat-free|meal prep)\b/.test(combinedText)) {
            icon = 'leaf-outline';
            bgColor = '#E0F4E0'; // light green
        }
        // Chicken and poultry
        else if (/\b(chicken|turkey|duck|poultry|wing|breast|thigh|drumstick)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#E6EEFF'; // light blue
        }
        // Pasta dishes
        else if (/\b(pasta|spaghetti|penne|fettuccine|macaroni|lasagna|ravioli|gnocchi|noodles)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#E6EEFF'; // light blue
        }
        // Bread and baked goods
        else if (/\b(bread|bagel|muffin|croissant|roll|bun|dough|yeast|bake|baking)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#FFF8DC'; // light yellow
        }
        // Dessert and sweets
        else if (/\b(dessert|cake|cookie|pie|brownie|pudding|ice cream|sweet|chocolate|sugar)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#FFE0E6'; // light pink
        }
        // Breakfast items
        else if (/\b(breakfast|pancake|waffle|omelet|scrambled|french toast|eggs|bacon|brunch)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#FFF8DC'; // light yellow
        }
        // Curry dishes
        else if (/\b(curry|tikka|masala|korma)\b/.test(combinedText)) {
            icon = 'restaurant-outline';
            bgColor = '#FFE5D0'; // light orange
        }
        // Fallback: use index-based selection for variety
        else {
            const fallbackIcons: any[] = ['restaurant-outline', 'restaurant-outline', 'leaf-outline'];
            const fallbackColors = ['#FFE5D0', '#E6EEFF', '#E0F4E0'];
            const fallbackIndex = index % fallbackIcons.length;
            icon = fallbackIcons[fallbackIndex];
            bgColor = fallbackColors[fallbackIndex];
        }
        
        return {
            icon,
            bgColor,
            iconColor,
        };
    };

    // Extract title and description from summary (format: "TITLE|DESCRIPTION")
    const getChatTitle = (summary: string | undefined) => {
        if (!summary) return 'Chat Conversation';
        
        // Check if summary uses the pipe format (TITLE|DESCRIPTION)
        if (summary.includes('|')) {
            const [title] = summary.split('|');
            const trimmedTitle = title.trim();
            // Remove any quotation marks that might have been added
            const cleanedTitle = trimmedTitle.replace(/^["']|["']$/g, '').trim();
            // Return full title - let UI handle wrapping with numberOfLines
            return cleanedTitle || 'Chat Conversation';
        }
        
        // Fallback for old format summaries: use first part
        const words = summary.split(' ');
        if (words[0] && words[0][0] === words[0][0].toUpperCase() && words[0].length > 3) {
            const title = words.slice(0, 4).join(' ');
            // Remove quotation marks and return full title
            return title.replace(/^["']|["']$/g, '').trim();
        }
        
        // Final fallback: return summary without quotation marks (will wrap in UI)
        return summary.replace(/^["']|["']$/g, '').trim();
    };

    // Get description from summary (format: "TITLE|DESCRIPTION")
    const getChatDescription = (summary: string | undefined) => {
        if (!summary) return 'Start a conversation with AI Chef';
        
        // Check if summary uses the pipe format (TITLE|DESCRIPTION)
        if (summary.includes('|')) {
            const parts = summary.split('|');
            const description = parts.length > 1 ? parts[1] : parts[0];
            const desc = description.trim();
            // Remove quotation marks and return full description - let UI handle wrapping
            return desc.replace(/^["']|["']$/g, '').trim();
        }
        
        // Fallback for old format: remove title part if detected
        const title = getChatTitle(summary);
        if (summary.startsWith(title)) {
            const desc = summary.substring(title.length).trim();
            // Skip common separators
            const cleanedDesc = desc.replace(/^[,\-\s:]+/, '').trim();
            if (cleanedDesc.length > 0) {
                // Remove recipe name listings - look for pattern like "Recipe1, Recipe2, Recipe3..."
                const withoutRecipeNames = cleanedDesc.replace(/[A-Z][a-z\s&]+(?:recipe|with|and|,|\.|\.\.\.)/gi, '').trim();
                const finalDesc = withoutRecipeNames || cleanedDesc;
                // Remove quotation marks and return full description
                return finalDesc.replace(/^["']|["']$/g, '').trim();
            }
        }
        
        // Final fallback: use summary as description, but clean up recipe name listings
        const cleaned = summary.replace(/[A-Z][a-z\s&]+(?:recipe|with|and|,|\.|\.\.\.)/gi, '').trim();
        const finalCleaned = cleaned.replace(/^["']|["']$/g, '').trim();
        return finalCleaned || summary.replace(/^["']|["']$/g, '').trim();
    };

    // Chef Loading Skeleton Component
    const ChefLoadingSkeleton = () => {
        const pulseAnim = useRef(new Animated.Value(1)).current;
        const shimmerAnim = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            // Pulsing animation for icons
            const pulseLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            );

            // Shimmer animation for skeleton lines
            const shimmerLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerAnim, {
                        toValue: 1,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(shimmerAnim, {
                        toValue: 0,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                ])
            );

            pulseLoop.start();
            shimmerLoop.start();

            return () => {
                pulseLoop.stop();
                shimmerLoop.stop();
            };
        }, []);

        const shimmerOpacity = shimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.7],
        });

        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
                {/* Header Skeleton */}
                <View style={styles.headerBg}>
                    <View style={styles.headerRow}>
                        <View style={styles.profileIconContainer}>
                            <CustomText style={styles.avatarEmoji}>🐕</CustomText>
                        </View>
                        <View style={styles.headerTitleContainer}>
                            <CustomText style={styles.headerTitle}>AI Chef</CustomText>
                            <CustomText style={styles.headerSubtitle}>Your cooking assistant</CustomText>
                        </View>
                        <View style={styles.sparkleIconContainer}>
                            <Ionicons name="sparkles" size={20} color="#6B7280" />
                        </View>
                    </View>
                </View>

                {/* Main Content Skeleton */}
                <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                    {/* Search Bar Skeleton */}
                    <View style={styles.searchBarWrapper}>
                        <Animated.View style={[styles.skeletonSearchBar, { opacity: shimmerOpacity }]} />
                    </View>

                    {/* Start New Chat Button Skeleton */}
                    <View style={styles.newChatContainer}>
                        <Animated.View style={[styles.skeletonNewChatButton, { opacity: shimmerOpacity }]}>
                            <Animated.View style={[styles.skeletonNewChatIcon, { transform: [{ scale: pulseAnim }] }]}>
                                <Ionicons name="add" size={28} color="#FFFFFF" />
                            </Animated.View>
                            <View style={styles.skeletonNewChatText}>
                                <Animated.View style={[styles.skeletonLine, styles.skeletonNewChatTitle, { opacity: shimmerOpacity }]} />
                                <Animated.View style={[styles.skeletonLine, styles.skeletonNewChatDesc, { opacity: shimmerOpacity }]} />
                            </View>
                            <View style={styles.skeletonNewChatArrowContainer} />
                        </Animated.View>
                    </View>

                    {/* Chat History Skeleton */}
                    <View style={styles.chatHistoryContainer}>
                        <View style={styles.sectionHeader}>
                            <CustomText style={styles.sectionTitle}>Recent History</CustomText>
                            <Animated.View style={[styles.skeletonLine, styles.skeletonChatCount, { opacity: shimmerOpacity }]} />
                        </View>

                        <View style={styles.listContent}>
                            {[1, 2, 3, 4].map((i) => {
                                const iconData = getChatCardIcon(undefined, i, `skeleton-${i}`);
                                return (
                                    <Animated.View key={i} style={[styles.skeletonChatCard, { opacity: shimmerOpacity }]}>
                                        <Animated.View style={[styles.skeletonChatCardIcon, { backgroundColor: iconData.bgColor, transform: [{ scale: pulseAnim }] }]}>
                                            <Ionicons name={iconData.icon} size={22} color={iconData.iconColor} />
                                        </Animated.View>
                                        <View style={styles.skeletonChatCardInfo}>
                                            <Animated.View style={[styles.skeletonLine, styles.skeletonChatCardTitle, { opacity: shimmerOpacity }]} />
                                            <Animated.View style={[styles.skeletonLine, styles.skeletonChatCardDescription, { opacity: shimmerOpacity }]} />
                                        </View>
                                        <Animated.View style={[styles.skeletonLine, styles.skeletonChatCardTimestamp, { opacity: shimmerOpacity }]} />
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    };

    if (loading && !searching) {
        return <ChefLoadingSkeleton />;
    }

    if (!userId) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
                <View style={styles.container}>
                    <View style={styles.authContainer}>
                        <Ionicons name="lock-closed" size={48} color="#6DA98C" />
                        <CustomText style={styles.authText}>You must be logged in to view your AI Chef chats.</CustomText>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
            {/* Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <View style={styles.profileIconContainer}>
                        <CustomText style={styles.avatarEmoji}>🐕</CustomText>
                    </View>
                    <View style={styles.headerTitleContainer}>
                        <CustomText style={styles.headerTitle}>AI Chef</CustomText>
                        <CustomText style={styles.headerSubtitle}>Your cooking assistant</CustomText>
                    </View>
                    <TouchableOpacity style={styles.sparkleIconContainer}>
                        <Ionicons name="sparkles" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                {/* Floating Search Bar */}
                <View style={styles.searchBarWrapper}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={22} color="#9CA3AF" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search recipes, ingredients..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={20} color="#B0B0B0" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* Start New Chat Button */}
                <View style={styles.newChatContainer}>
                    <TouchableOpacity
                        ref={startChatRef}
                        style={styles.newChatButton}
                        onPress={() => openChatFromRef(startChatRef)}
                        activeOpacity={0.92}
                    >
                        <View style={styles.newChatIcon}>
                            <Ionicons name="add" size={28} color="#FFFFFF" />
                        </View>
                        <View style={styles.newChatText}>
                            <CustomText style={styles.newChatTitle}>New Recipe Chat</CustomText>
                            <CustomText style={styles.newChatDesc}>Ask for ideas or instructions</CustomText>
                        </View>
                        <View style={styles.newChatArrowContainer}>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Chat History */}
                <View style={styles.chatHistoryContainer}>
                    <View style={styles.sectionHeader}>
                        <CustomText style={styles.sectionTitle}>Recent History</CustomText>
                        <CustomText style={styles.chatCount}>{chats.length} chats</CustomText>
                    </View>
                    
                    <FlatList
                        data={chats}
                        keyExtractor={item => item.id}
                        renderItem={({ item, index }) => {
                            // Parse recipes if available
                            let recipes = [];
                            try {
                                if (item.recipes && typeof item.recipes === 'string') {
                                    recipes = JSON.parse(item.recipes);
                                } else if (Array.isArray(item.recipes)) {
                                    recipes = item.recipes;
                                }
                            } catch (e) {
                                console.log('Error parsing recipes:', e);
                                // Invalid JSON, use empty array
                            }

                            const hasRecipes = recipes.length > 0;
                            
                            // Fallback: If no recipes in recipes column, try to extract from summary
                            if (!hasRecipes && item.summary) {
                                // Try to extract recipe names from summary (for backward compatibility)
                                const summaryLower = item.summary.toLowerCase();
                                // Look for patterns like "recipe" followed by names
                                // This is a simple fallback - not perfect but helps with existing chats
                            }
                            
                            const iconData = getChatCardIcon(item.summary, index, item.id);
                            const title = getChatTitle(item.summary);
                            const description = getChatDescription(item.summary);
                            const timestamp = item.created_at ? formatDate(item.created_at) : '';
                            
                            return (
                                <View style={styles.chatCardWrapper}>
                                    {/* Timeline dot */}
                                    <View style={styles.timelineDot} />
                                    
                                    <TouchableOpacity
                                        ref={el => { chatBtnRefs.current[index] = el; }}
                                        style={styles.chatCard}
                                        onPress={() => openChatFromRef(chatBtnRefs.current[index], item.id)}
                                        activeOpacity={0.92}
                                    >
                                        {hasRecipes ? (
                                            // Recipe-based card design - timeline style
                                            <>
                                                {/* Header with timestamp */}
                                                <View style={styles.chatCardHeaderRow}>
                                                    <CustomText style={styles.chatCardTimestamp}>{timestamp}</CustomText>
                                                </View>
                                                
                                                {/* Title */}
                                                <CustomText style={styles.chatCardTitle} numberOfLines={3}>
                                                    {title || `${recipes.length} Recipe${recipes.length > 1 ? 's' : ''}`}
                                                </CustomText>
                                                
                                                {/* Description */}
                                                <CustomText style={styles.chatCardDescription} numberOfLines={2}>
                                                    {description || `${recipes.length} recipe${recipes.length > 1 ? 's' : ''} generated`}
                                                </CustomText>
                                                
                                                {/* Recipe thumbnails and count badge */}
                                                <View style={styles.chatCardFooter}>
                                                    <View style={styles.recipeThumbnails}>
                                                        {recipes.slice(0, 5).map((recipe: any, recipeIndex: number) => {
                                                            const recipeIconConfig = getRecipeIconConfig(
                                                                recipe.name || '',
                                                                recipe.tags || [],
                                                                recipeIndex,
                                                                recipe
                                                            );
                                                            return (
                                                                <View 
                                                                    key={recipeIndex}
                                                                    style={[
                                                                        styles.recipeThumbnail,
                                                                        { backgroundColor: recipeIconConfig.backgroundColor }
                                                                    ]}
                                                                >
                                                                    {recipeIconConfig.library === 'MaterialCommunityIcons' ? (
                                                                        <MaterialCommunityIcons 
                                                                            name={recipeIconConfig.name as any} 
                                                                            size={18} 
                                                                            color={recipeIconConfig.iconColor} 
                                                                        />
                                                                    ) : (
                                                                        <Ionicons 
                                                                            name={recipeIconConfig.name as any} 
                                                                            size={18} 
                                                                            color={recipeIconConfig.iconColor} 
                                                                        />
                                                                    )}
                                                                </View>
                                                            );
                                                        })}
                                                        {recipes.length > 5 && (
                                                            <View style={[styles.recipeThumbnail, styles.recipeThumbnailMore]}>
                                                                <CustomText style={styles.recipeThumbnailMoreText}>
                                                                    +{recipes.length - 5}
                                                                </CustomText>
                                                            </View>
                                                        )}
                                                    </View>
                                                    
                                                    {/* Recipe count pill badge */}
                                                    <View style={styles.recipeCountBadge}>
                                                        <CustomText style={styles.recipeCountBadgeText}>
                                                            {recipes.length} recipe{recipes.length > 1 ? 's' : ''}
                                                        </CustomText>
                                                    </View>
                                                </View>
                                            </>
                                        ) : (
                                            // Fallback: Text-based card design
                                            <>
                                                {/* Header with timestamp */}
                                                <View style={styles.chatCardHeaderRow}>
                                                    <CustomText style={styles.chatCardTimestamp}>{timestamp}</CustomText>
                                                </View>
                                                
                                                {/* Icon and content row */}
                                                <View style={styles.chatCardContentRow}>
                                                    <View style={[styles.chatCardIcon, { backgroundColor: iconData.bgColor }]}>
                                                        <Ionicons name={iconData.icon} size={20} color={iconData.iconColor} />
                                                    </View>
                                                    <View style={styles.chatCardInfo}>
                                                        <CustomText style={styles.chatCardTitle} numberOfLines={2} ellipsizeMode="tail">
                                                            {title}
                                                        </CustomText>
                                                        <CustomText style={styles.chatCardDescription} numberOfLines={2} ellipsizeMode="tail">
                                                            {description}
                                                        </CustomText>
                                                    </View>
                                                </View>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="chatbubbles-outline" size={48} color="#B0B0B0" />
                                <CustomText style={styles.emptyTitle}>
                                    {searchQuery ? `No chats found for "${searchQuery}"` : 'No conversations yet'}
                                </CustomText>
                                <CustomText style={styles.emptyDesc}>
                                    {searchQuery ? 'Try a different search term' : 'Start your first chat with AI Chef!'}
                                </CustomText>
                            </View>
                        }
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Chef Loading Skeleton Styles
    skeletonLine: {
        backgroundColor: '#E2E8F0',
        borderRadius: 6,
    },
    skeletonSearchBar: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        height: 54,
        width: '92%',
        marginTop: 8,
    },
    skeletonNewChatButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#9CA3AF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    skeletonNewChatIcon: {
        backgroundColor: '#4CAF50',
        width: 64,
        height: 64,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonNewChatText: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    skeletonNewChatArrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        marginRight: 16,
    },
    skeletonNewChatTitle: {
        width: '70%',
        height: 18,
        marginBottom: 8,
        borderRadius: 4,
    },
    skeletonNewChatDesc: {
        width: '50%',
        height: 14,
        borderRadius: 4,
    },
    skeletonChatCount: {
        width: 60,
        height: 16,
        borderRadius: 4,
    },
    skeletonChatCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    skeletonChatCardIcon: {
        width: 50,
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    skeletonChatCardInfo: {
        flex: 1,
        minWidth: 0,
    },
    skeletonChatCardTitle: {
        width: '85%',
        height: 16,
        marginBottom: 6,
        borderRadius: 4,
    },
    skeletonChatCardDescription: {
        width: '70%',
        height: 14,
        borderRadius: 4,
    },
    skeletonChatCardTimestamp: {
        width: 50,
        height: 14,
        borderRadius: 4,
        marginLeft: 8,
    },
    authContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    authText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 24,
    },
    headerBg: {
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarEmoji: {
        fontSize: 28,
        lineHeight: 32,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 16,
    },
    sparkleIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: '#1F2937',
        letterSpacing: -0.5,
        lineHeight: 36,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#9CA3AF',
        fontWeight: '400',
        marginTop: 2,
        lineHeight: 20,
    },
    searchBarWrapper: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
        zIndex: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 0,
        paddingHorizontal: 16,
        height: 50,
        width: '92%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
        width: 20,
        height: 20,
        tintColor: '#9CA3AF',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
        color: '#1F2937',
        fontFamily: 'System',
        paddingVertical: 0,
    },
    clearButton: {
        marginLeft: 8,
        padding: 2,
    },
    newChatContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    newChatButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#9CA3AF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    newChatIcon: {
        backgroundColor: '#4CAF50',
        width: 40,
        height: 40,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    newChatText: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    newChatTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
        letterSpacing: -0.2,
    },
    newChatDesc: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '400',
        letterSpacing: -0.1,
        lineHeight: 18,
    },
    newChatArrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    chatHistoryContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: -0.3,
    },
    chatCount: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 24,
        paddingLeft: 8,
    },
    chatCardWrapper: {
        flexDirection: 'row',
        marginBottom: 20,
        position: 'relative',
    },
    timelineDot: {
        position: 'absolute',
        left: -4,
        top: 24,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        zIndex: 1,
    },
    chatCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        flex: 1,
        marginLeft: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        minHeight: 120,
    },
    chatCardHeaderRow: {
        marginBottom: 8,
    },
    chatCardTimestamp: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    chatCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
        letterSpacing: -0.3,
        lineHeight: 24,
        flexShrink: 1,
    },
    chatCardDescription: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '400',
        lineHeight: 20,
        letterSpacing: -0.1,
        marginBottom: 12,
        flexShrink: 1,
    },
    chatCardContentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    chatCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    chatCardInfo: {
        flex: 1,
        minWidth: 0,
    },
    chatCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    recipeThumbnails: {
        flexDirection: 'row',
        gap: 6,
        flex: 1,
        marginRight: 12,
    },
    recipeThumbnail: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    recipeThumbnailMore: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    recipeThumbnailMoreText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
    },
    recipeCountBadge: {
        backgroundColor: '#E5F3EC',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1E6DA',
    },
    recipeCountBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#256D85',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
}); 