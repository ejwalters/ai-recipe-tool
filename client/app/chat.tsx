import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Animated, Easing, Platform, Dimensions, KeyboardAvoidingView, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

const PALETTE = {
    appBackground: '#FFFFFF',
    chatBackground: '#F8F8FC',
    header: '#F3F0FF', // Purple header matching app design
    headerText: '#1F2937',
    aiBubble: '#FFFFFF', // White bubbles for AI
    aiBorder: '#F3F4F6',
    aiText: '#1F2937',
    userBubble: '#256D85', // App's primary teal for user
    userText: '#FFFFFF',
    timestampMuted: '#9CA3AF',
    inputBackground: '#FFFFFF',
    inputBorder: '#E5E7EB',
    inputShadow: 'rgba(0, 0, 0, 0.04)',
    sendEnabled: '#256D85',
    sendDisabled: '#E2E8F0',
    suggestionTag: '#FFFFFF',
    suggestionTagBorder: '#E5E7EB',
    suggestionTagText: '#4B5563',
};

const CARD_COLORS = ['#E5F3EC', '#E6EEFF', '#FFF1E6', '#EFE5FF'];
const CARD_ICON_BG = ['#D1E6DA', '#D6E1FF', '#FFE2CD', '#E1D5FF'];
const SCREEN_WIDTH = Dimensions.get('window').width;

const TYPING_STEPS = [
    {
        icon: 'leaf-outline' as const,
        label: 'Gathering ingredients',
    },
    {
        icon: 'flame-outline' as const,
        label: 'Simmering ideas',
    },
    {
        icon: 'restaurant-outline' as const,
        label: 'Plating your recipe',
    },
];

// AI Typing Indicator Component
const AITypingIndicator = () => {
    const rotation = useRef(new Animated.Value(0)).current;
    const fade = useRef(new Animated.Value(1)).current;
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        const spinAnimation = Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 1600,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        spinAnimation.start();

        const interval = setInterval(() => {
            Animated.sequence([
                Animated.timing(fade, { toValue: 0.2, duration: 200, useNativeDriver: true }),
                Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
            ]).start();

            setStepIndex(prev => (prev + 1) % TYPING_STEPS.length);
        }, 1400);

        return () => {
            spinAnimation.stop();
            clearInterval(interval);
        };
    }, [rotation, fade]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.messageRow}>
            <View style={styles.aiAvatarCircle}>
                <Ionicons name="restaurant-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.typingCard}>
                <View style={styles.typingHeader}>
                    <Animated.View style={[styles.typingIconWrapper, { transform: [{ rotate: spin }] }]}>
                        <Ionicons name="restaurant-outline" size={20} color="#fff" />
                    </Animated.View>
                    <CustomText style={styles.typingTitle}>AI Chef is crafting your dish</CustomText>
                </View>
                <Animated.View style={{ opacity: fade }}>
                    <View style={styles.typingStepRow}>
                        <Ionicons name={TYPING_STEPS[stepIndex].icon} size={16} color="#3B7F6A" style={{ marginRight: 6 }} />
                        <CustomText style={styles.typingStepText}>{TYPING_STEPS[stepIndex].label}</CustomText>
                    </View>
                </Animated.View>
                <View style={styles.typingProgressDots}>
                    {TYPING_STEPS.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.typingProgressDot,
                                idx === stepIndex && styles.typingProgressDotActive,
                            ]}
                        />
                    ))}
                </View>
                <View style={styles.typingRecipeSkeleton}>
                    <View style={styles.typingSkeletonImage} />
                    <View style={styles.typingSkeletonTextBlock}>
                        <View style={styles.typingSkeletonTitle} />
                        <View style={styles.typingSkeletonMetaRow}>
                            <View style={styles.typingSkeletonMeta} />
                            <View style={styles.typingSkeletonMeta} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

export const HEADER_HEIGHT = Platform.OS === 'ios' ? 120 : 100;

// Helper to extract JSON from a string (handles code blocks and extra text)
function extractJsonFromString(str: string) {
    // Remove markdown code block if present
    const cleaned = str.replace(/```(json)?/gi, '').replace(/```/g, '').trim();
    // Try to find the first {...} block
    const match = cleaned.match(/{[\s\S]*}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {
            return null;
        }
    }
    // Fallback: try to parse the whole string
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        return null;
    }
}

// Custom Recipe Card Message Component
const RecipeCardMessage = ({ message, onPress }: { message: any; onPress: () => void }) => {
    // Use message ID to generate consistent colors
    const colorIndex = parseInt(message.id.replace(/\D/g, '')) % CARD_COLORS.length;
    const cardColor = CARD_COLORS[colorIndex];
    const iconBg = CARD_ICON_BG[colorIndex];
    
    if (!message.recipe) return null;

    return (
        <TouchableOpacity
            style={[
                styles.recipeCardModern,
                {
                    backgroundColor: PALETTE.aiBubble,
                    borderColor: PALETTE.aiBorder,
                },
            ]} 
            activeOpacity={0.88}
            onPress={onPress}
        >
            <View style={styles.recipeCardRightModern}>
                <CustomText style={styles.recipeTitleModern}>{message.recipe.name}</CustomText>
                <CustomText style={styles.recipeDescriptionModern}>
                    {message.recipe.time || Array.isArray(message.recipe.ingredients) 
                        ? `${message.recipe.time || 'Quick'}, ${Array.isArray(message.recipe.ingredients) ? message.recipe.ingredients.length : 0} ingredients`
                        : 'Delicious recipe'}
                </CustomText>
            </View>
        </TouchableOpacity>
    );
};

export default function ChatScreen() {
    const router = useRouter();
    const { chat_id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<{ avatar_url?: string } | null>(null);
    const [currentChatId, setCurrentChatId] = useState<string | null>(chat_id ? String(chat_id) : null);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const inputBottomOffset = useRef(new Animated.Value(0)).current;

    // Fetch user ID and profile on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUserId(data.user.id);
            }
        });
    }, []);
    
    // Load user profile when userId is available
    useEffect(() => {
        if (userId) {
            loadUserProfile();
        }
    }, [userId]);
    
    const loadUserProfile = async () => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', userId)
                .single();
            
            if (!error && profile) {
                setUserProfile(profile);
                console.log('User profile loaded:', profile);
            } else {
                console.log('No profile found or error:', error);
            }
        } catch (err) {
            console.log('Error loading user profile:', err);
        }
    };

    // Convert messages to display format
    const convertMessages = (rawMessages: any[]) => {
        return rawMessages.map((msg, index) => {
            const maybeJson = extractJsonFromString(msg.content);
            
            if (msg.role === 'assistant' && maybeJson && maybeJson.is_recipe) {
                console.log('Converting recipe message:', {
                    msg_id: msg.id,
                    saved_recipe_id: msg.saved_recipe_id,
                    content: msg.content
                });
                
                return {
                    id: msg.id || `recipe-${index}`,
                    text: '[RECIPE_CARD]',
                    createdAt: new Date(),
                    role: 'assistant',
                    recipe: maybeJson,
                    saved_recipe_id: msg.saved_recipe_id,
                };
            } else if (msg.role === 'assistant' && maybeJson && maybeJson.is_recipe === false) {
                const text = maybeJson.text || maybeJson.message;
                return {
                    id: msg.id || `ai-${index}`,
                    text: text || msg.content,
                    createdAt: new Date(),
                    role: 'assistant',
                };
            } else if (msg.role === 'assistant') {
                return {
                    id: msg.id || `ai-${index}`,
                    text: msg.content,
                    createdAt: new Date(),
                    role: 'assistant',
                };
            } else {
                return {
                    id: msg.id || `user-${index}`,
                    text: msg.content,
                    createdAt: new Date(),
                    role: 'user',
                };
            }
        });
    };

    // Fetch messages for this chat on mount and when returning to chat
    useEffect(() => {
        if (!currentChatId) {
            setMessages([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetch(`https://familycooksclean.onrender.com/ai/messages?chat_id=${currentChatId}`)
            .then(res => res.json())
            .then(data => {
                console.log('Raw messages from server:', data);
                const convertedMessages = convertMessages(data);
                console.log('Converted messages:', convertedMessages);
                setMessages(convertedMessages);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [currentChatId]);

    // Refresh messages when returning to chat screen
    useFocusEffect(
        React.useCallback(() => {
            if (currentChatId) {
                console.log('Refreshing messages on focus');
                // Add a small delay to ensure any database updates have completed
                setTimeout(() => {
                    fetch(`https://familycooksclean.onrender.com/ai/messages?chat_id=${currentChatId}`)
                        .then(res => res.json())
                        .then(data => {
                            console.log('Raw messages from server (focus):', data);
                            const convertedMessages = convertMessages(data);
                            console.log('Converted messages (focus):', convertedMessages);
                            setMessages(convertedMessages);
                        })
                        .catch(() => {});
                }, 500);
            }
        }, [currentChatId])
    );
    
    // Also refresh messages when the screen comes into focus (additional refresh)
    useFocusEffect(
        React.useCallback(() => {
            const refreshMessages = () => {
                if (currentChatId) {
                    console.log('Force refreshing messages on screen focus');
                    fetch(`https://familycooksclean.onrender.com/ai/messages?chat_id=${currentChatId}`)
                        .then(res => res.json())
                        .then(data => {
                            console.log('Force refresh - Raw messages:', data);
                            const convertedMessages = convertMessages(data);
                            console.log('Force refresh - Converted messages:', convertedMessages);
                            setMessages(convertedMessages);
                        })
                        .catch(err => console.log('Force refresh error:', err));
                }
            };
            
            // Refresh immediately and after a delay
            refreshMessages();
            const timeoutId = setTimeout(refreshMessages, 1000);
            
            return () => clearTimeout(timeoutId);
        }, [currentChatId])
    );

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // Handle keyboard show/hide events
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                const height = e.endCoordinates.height;
                setKeyboardHeight(height);
                // Push input up by keyboard height plus a small buffer to ensure full visibility
                Animated.timing(inputBottomOffset, {
                    toValue: height,
                    duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
                    useNativeDriver: false,
                }).start();
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                setKeyboardHeight(0);
                Animated.timing(inputBottomOffset, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
                    useNativeDriver: false,
                }).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, [inputBottomOffset]);

    const sendMessage = async () => {
        if (!message.trim() || !userId) return;
        
        const userMessage = message.trim();
        setMessage(''); // Clear input immediately
        setSending(true);
        
        // Immediately add user message to chat
        setMessages(prev => [
            ...prev,
            { 
                id: `user-${Date.now()}`,
                text: userMessage,
                createdAt: new Date(),
                role: 'user'
            }
        ]);
        
        // Add typing indicator
        setMessages(prev => [
            ...prev,
            { 
                id: 'typing-indicator',
                text: '[TYPING]',
                createdAt: new Date(),
                role: 'assistant',
                isTyping: true
            }
        ]);
        
        try {
            // If no chat yet, create one and send first message
            const payload: any = {
                user_id: userId,
                message: userMessage,
            };
            if (currentChatId) {
                payload.chat_id = currentChatId;
            }
            
            const res = await fetch('https://familycooksclean.onrender.com/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const data = await res.json();
            if (res.ok) {
                // Update chat_id if new
                if (!currentChatId && data.chat_id) {
                    setCurrentChatId(data.chat_id);
                }
                
                // Remove typing indicator and refresh messages from server to get the real message ID
                setMessages(prev => {
                    const withoutTyping = prev.filter(msg => !msg.isTyping);
                    return withoutTyping;
                });
                
                // Fetch the updated messages from server to get the real message ID
                setTimeout(() => {
                    if (currentChatId) {
                        fetch(`https://familycooksclean.onrender.com/ai/messages?chat_id=${currentChatId}`)
                            .then(res => res.json())
                            .then(data => {
                                console.log('Refreshing messages after AI response:', data);
                                const convertedMessages = convertMessages(data);
                                console.log('Converted messages after AI response:', convertedMessages);
                                setMessages(convertedMessages);
                            })
                            .catch(err => console.log('Error refreshing messages after AI response:', err));
                    }
                }, 100);
                console.log('AI raw response:', data.ai_response);
            } else {
                setMessages(prev => {
                    const withoutTyping = prev.filter(msg => !msg.isTyping);
                    const errorMessage = {
                        id: `error-${Date.now()}`,
                        text: 'Sorry, I encountered an error. Please try again.',
                        createdAt: new Date(),
                        role: 'assistant',
                    };
                    return [...withoutTyping, errorMessage];
                });
            }
        } catch (err) {
            setMessages(prev => {
                const withoutTyping = prev.filter(msg => !msg.isTyping);
                const errorMessage = {
                    id: `error-${Date.now()}`,
                    text: 'Sorry, I encountered an error. Please try again.',
                    createdAt: new Date(),
                    role: 'assistant',
                };
                return [...withoutTyping, errorMessage];
            });
        } finally {
            setSending(false);
        }
    };

    if (loading && messages.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.appBackground }} edges={['top', 'bottom']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#256D85" />
                    <CustomText style={styles.loadingText}>Loading chat...</CustomText>
                </View>
            </SafeAreaView>
        );
    }

    if (!userId) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.appBackground }} edges={['top', 'bottom']}>
                <View style={styles.loadingContainer}>
                    <CustomText style={styles.loadingText}>You must be logged in to chat with the AI Chef.</CustomText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.outerContainer} edges={['top']}>
            {/* Header */}
            <View style={styles.headerModern}>
                <TouchableOpacity 
                    style={styles.headerBackButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={PALETTE.headerText} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <CustomText style={styles.headerTitle}>AI Chef Assistant</CustomText>
                    <CustomText style={styles.headerSubtitle}>Ask me anything about recipes</CustomText>
                </View>
                <TouchableOpacity 
                    style={styles.headerMenuButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="ellipsis-vertical" size={24} color={PALETTE.headerText} />
                </TouchableOpacity>
            </View>
            
            {/* Chat Messages and Input - Wrapped in KeyboardAvoidingView */}
            <View style={{ flex: 1 }}>
                {/* Chat Messages */}
                <View style={styles.chatAreaBg}>
                    <View style={styles.chatGradient}>
                        <ScrollView 
                            ref={scrollViewRef}
                            style={styles.messagesContainer} 
                            contentContainerStyle={styles.messagesContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                        >
                    {/* Show welcome message for new chats */}
                    {messages.length === 0 && (
                        <View style={[styles.messageRow, styles.aiRow, { marginTop: 8 }]}>
                            <View style={styles.aiAvatarCircle}>
                                <Ionicons name="restaurant-outline" size={18} color="#FFFFFF" />
                            </View>
                            <View style={styles.aiMessageContainer}>
                                <View style={[styles.aiBubble, styles.welcomeBubble]}>
                                    <CustomText style={[styles.aiText, styles.welcomeText]}>Hi there! 👋 I'm your AI recipe assistant. Tell me what ingredients you have, dietary preferences, or what you're craving, and I'll help you create something delicious!</CustomText>
                                </View>
                            </View>
                        </View>
                    )}
                    
                    {messages.map((msg, idx) => {
                        const prevMsg = messages[idx - 1];
                        const isGrouped = prevMsg && prevMsg.role === msg.role;
                        const timestamp = msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        // Render typing indicator
                        if (msg.isTyping) {
                            return <AITypingIndicator key={msg.id} />;
                        }
                        
                        // Render recipe card
                        if (msg.text === '[RECIPE_CARD]' && msg.recipe) {
                            return (
                                <View key={msg.id} style={[styles.messageRow, styles.aiRow, !isGrouped && { marginTop: 18 }]}> 
                                    {!isGrouped && (
                                        <View style={styles.aiAvatarCircle}>
                                            <Ionicons name="restaurant-outline" size={16} color="#FFFFFF" />
                                        </View>
                                    )}
                                    <View style={styles.aiMessageContainer}>
                                        <RecipeCardMessage 
                                            message={msg}
                                            onPress={() => {
                                            console.log('Recipe card pressed:', {
                                                message_id: msg.id,
                                                saved_recipe_id: msg.saved_recipe_id,
                                                recipe: msg.recipe
                                            });
                                            
                                            if (msg.saved_recipe_id) {
                                                console.log('Opening saved recipe with ID:', msg.saved_recipe_id);
                                                router.push({ 
                                                    pathname: '/recipe-detail', 
                                                    params: { 
                                                        id: msg.saved_recipe_id, 
                                                        message_id: msg.id, 
                                                        saved_recipe_id: msg.saved_recipe_id,
                                                        isAI: '1'
                                                    } 
                                                });
                                            } else {
                                                console.log('Opening unsaved recipe');
                                                const params = {
                                                    ...msg.recipe,
                                                    title: msg.recipe.name,
                                                    isAI: '1',
                                                    tags: JSON.stringify(msg.recipe.tags),
                                                    ingredients: JSON.stringify(msg.recipe.ingredients),
                                                    steps: JSON.stringify(msg.recipe.steps),
                                                    message_id: msg.id,
                                                };
                                                router.push({ pathname: '/recipe-detail', params });
                                            }
                                        }}
                                        />
                                        <CustomText style={[styles.timestamp, styles.aiTimestamp]}>{timestamp}</CustomText>
                                    </View>
                                </View>
                            );
                        }
                        
                        // AI message
                        if (msg.role === 'assistant') {
                            return (
                                <View key={msg.id} style={[styles.messageRow, styles.aiRow, !isGrouped && { marginTop: 18 }]}> 
                                    {!isGrouped && (
                                        <View style={styles.aiAvatarCircle}>
                                            <Ionicons name="restaurant-outline" size={16} color="#FFFFFF" />
                                        </View>
                                    )}
                                    <View style={styles.aiMessageContainer}>
                                        <View style={[styles.aiBubble, !isGrouped && styles.aiBubbleTail]}> 
                                            <CustomText style={styles.aiText}>{msg.text}</CustomText>
                                        </View>
                                        <CustomText style={[styles.timestamp, styles.aiTimestamp]}>{timestamp}</CustomText>
                                    </View>
                                </View>
                            );
                        }
                        
                        // User message
                        return (
                            <View key={msg.id} style={[styles.messageRow, styles.userRow, !isGrouped && { marginTop: 18 }]}> 
                                <View style={styles.userMessageContainer}>
                                    <View style={[styles.userBubble, !isGrouped && styles.userBubbleTail]}>
                                        <CustomText style={styles.userText}>{msg.text}</CustomText>
                                    </View>
                                    <CustomText style={[styles.timestamp, styles.userTimestamp]}>{timestamp}</CustomText>
                                </View>
                                {!isGrouped && (
                                    <View style={styles.userAvatarCircle}>
                                        {userProfile?.avatar_url ? (
                                            <Image 
                                                source={{ uri: userProfile.avatar_url }}
                                                style={styles.userAvatarImage}
                                                onError={() => console.log('Failed to load user avatar')}
                                            />
                                        ) : (
                                            <Ionicons name="person" size={16} color="#FFFFFF" />
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
            </View>
            
            {/* Input Bar */}
            <Animated.View 
                style={[
                    styles.safeAreaInput, 
                    { 
                        marginBottom: inputBottomOffset,
                        paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom,
                    }
                ]}
            >
                <View style={styles.inputContainer}>
                    {/* Input Box */}
                    <View style={styles.inputBox}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ask for a recipe or ingredient suggestions..."
                            placeholderTextColor="#9CA3AF"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={!message.trim() || sending}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="send" size={18} color={message.trim() ? '#FFFFFF' : '#94A3B8'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    outerContainer: { 
        flex: 1, 
        backgroundColor: PALETTE.appBackground, 
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    headerModern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        backgroundColor: PALETTE.header,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
        zIndex: 10,
        paddingTop: Platform.OS === 'ios' ? 48 : 32,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: PALETTE.headerText,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '500',
    },
    headerMenuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatAreaBg: {
        flex: 1,
        marginTop: HEADER_HEIGHT,
        overflow: 'hidden',
        backgroundColor: PALETTE.chatBackground,
    },
    chatGradient: {
        flex: 1,
        paddingTop: 20,
        backgroundColor: PALETTE.chatBackground,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingBottom: 100,
        paddingHorizontal: 20,
        paddingTop: 4,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    aiRow: {
        justifyContent: 'flex-start',
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    aiAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#256D85',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
        shadowColor: '#256D85',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    userAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#256D85',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        marginTop: 2,
        overflow: 'hidden',
        shadowColor: '#256D85',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    userAvatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    aiMessageContainer: {
        flex: 1,
        maxWidth: SCREEN_WIDTH * 0.75,
    },
    userMessageContainer: {
        flex: 1,
        maxWidth: SCREEN_WIDTH * 0.75,
        alignItems: 'flex-end',
    },
    aiBubble: {
        backgroundColor: PALETTE.aiBubble,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 18,
        shadowColor: 'rgba(0, 0, 0, 0.06)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    welcomeBubble: {
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    welcomeText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
    },
    userBubble: {
        backgroundColor: PALETTE.userBubble,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 18,
        shadowColor: 'rgba(37, 109, 133, 0.25)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    aiBubbleTail: {
        borderBottomLeftRadius: 4,
    },
    userBubbleTail: {
        borderBottomRightRadius: 4,
    },
    aiText: {
        color: PALETTE.aiText,
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 23,
        letterSpacing: -0.1,
    },
    userText: {
        color: PALETTE.userText,
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 23,
        letterSpacing: -0.1,
    },
    timestamp: {
        fontSize: 11,
        marginTop: 4,
        textAlign: 'left',
    },
    aiTimestamp: {
        color: PALETTE.timestampMuted,
        marginLeft: 16,
    },
    userTimestamp: {
        color: PALETTE.timestampMuted,
        marginRight: 16,
        textAlign: 'right',
    },
    safeAreaInput: {
        backgroundColor: PALETTE.chatBackground,
    },
    inputContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingBottom: 0,
        paddingTop: 8,
    },
    suggestionTagsContainer: {
        marginBottom: 12,
    },
    suggestionTagsContent: {
        paddingHorizontal: 4,
        gap: 10,
    },
    suggestionTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.suggestionTag,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: PALETTE.suggestionTagBorder,
    },
    suggestionTagText: {
        fontSize: 14,
        color: PALETTE.suggestionTagText,
        fontWeight: '600',
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.inputBackground,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: PALETTE.inputBorder,
        shadowColor: PALETTE.inputShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
    },
    inputIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        maxHeight: 100,
        paddingVertical: 4,
        lineHeight: 20,
        fontWeight: '400',
    },
    sendButton: {
        backgroundColor: PALETTE.sendEnabled,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        shadowColor: PALETTE.sendEnabled,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    sendButtonDisabled: {
        backgroundColor: PALETTE.sendDisabled,
        shadowOpacity: 0,
        elevation: 0,
    },
    // Recipe card styles
    recipeCardModern: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 12,
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        maxWidth: SCREEN_WIDTH * 0.75,
        backgroundColor: '#FFFFFF',
    },
    recipeCardRightModern: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    recipeTitleModern: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'left',
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    recipeDescriptionModern: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'left',
        lineHeight: 20,
        marginBottom: 0,
        flexShrink: 1,
        maxWidth: '100%',
        letterSpacing: -0.1,
    },
    metaPillWrapperModern: {
        width: '100%',
        alignItems: 'flex-start',
        marginTop: 4,
        flexWrap: 'wrap',
    },
    metaPillModern: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginHorizontal: 3,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.18)',
    },
    metaPillTextModern: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '700',
    },
    // Typing indicator styles
    typingCard: {
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 24,
        padding: 18,
        marginHorizontal: 8,
        shadowColor: 'rgba(26, 35, 52, 0.18)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 4,
        maxWidth: SCREEN_WIDTH * 0.82,
        borderWidth: 1,
        borderColor: 'rgba(219, 228, 247, 0.9)',
    },
    typingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    typingIconWrapper: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: PALETTE.header,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: 'rgba(62,140,109,0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 3,
    },
    typingTitle: {
        color: '#1F2937',
        fontSize: 15,
        fontWeight: '700',
        flexShrink: 1,
    },
    typingStepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    typingStepText: {
        color: '#336955',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
    typingProgressDots: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    typingProgressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E2F6EB',
        marginRight: 6,
    },
    typingProgressDotActive: {
        backgroundColor: PALETTE.header,
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    typingRecipeSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 241, 248, 0.75)',
        borderRadius: 18,
        padding: 12,
    },
    typingSkeletonImage: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(207, 217, 229, 0.6)',
        marginRight: 12,
    },
    typingSkeletonTextBlock: {
        flex: 1,
    },
    typingSkeletonTitle: {
        height: 14,
        borderRadius: 8,
        backgroundColor: 'rgba(201, 212, 227, 0.72)',
        marginBottom: 10,
        width: '70%',
    },
    typingSkeletonMetaRow: {
        flexDirection: 'row',
    },
    typingSkeletonMeta: {
        height: 10,
        borderRadius: 6,
        backgroundColor: 'rgba(220, 228, 240, 0.85)',
        marginRight: 8,
        flex: 0.3,
    },
    // Welcome message styles
    welcomeContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
        marginTop: 8,
    },
    welcomeAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        backgroundColor: '#D9F1E5',
    },
    welcomeTitle: {
        color: '#1F2533',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        lineHeight: 24,
    },
    welcomeList: {
        marginBottom: 12,
    },
    welcomeListItem: {
        color: '#536072',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
        paddingLeft: 4,
    },
}); 