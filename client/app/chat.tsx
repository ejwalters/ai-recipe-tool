import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Animated, Easing, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

const CARD_COLORS = ['#CDEFE3', '#E2E2F9', '#FFF7D1', '#D6ECFB'];
const CARD_ICON_BG = ['#E6F6F0', '#F0F0FB', '#FFFBE7', '#EAF6FE'];
const SCREEN_WIDTH = Dimensions.get('window').width;

// AI Typing Indicator Component
const AITypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = () => {
            Animated.sequence([
                Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.linear }),
            ]).start(() => {
                dot1.setValue(0);
                dot2.setValue(0);
                dot3.setValue(0);
                animate();
            });
        };
        animate();
        return () => {
            dot1.stopAnimation();
            dot2.stopAnimation();
            dot3.stopAnimation();
        };
    }, [dot1, dot2, dot3]);

    return (
        <View style={styles.messageRow}>
            <Image source={require('../assets/images/ai-avatar.png')} style={styles.messageAvatar} />
            <View style={styles.aiBubble}>
                <View style={styles.typingContainer}>
                    <View style={styles.typingDots}>
                        <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
                        <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
                        <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
                    </View>
                    <CustomText style={styles.typingText}>AI Chef is cooking up something special...</CustomText>
                </View>
            </View>
        </View>
    );
};

export const HEADER_HEIGHT = 110;

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
            style={[styles.recipeCardModern, { backgroundColor: cardColor, maxWidth: SCREEN_WIDTH * 0.92, alignSelf: 'center' }]} 
            activeOpacity={0.88}
            onPress={onPress}
        >
            <View style={styles.recipeCardLeftModern}>
                <View style={[styles.cardImageWrapperModern, { backgroundColor: iconBg }]}> 
                    {message.recipe.image_url ? (
                        <Image source={{ uri: message.recipe.image_url }} style={styles.cardImageModern} />
                    ) : (
                        <Ionicons name="fast-food-outline" size={32} color="#B0B0B0" />
                    )}
                </View>
            </View>
            <View style={styles.recipeCardRightModern}>
                <CustomText style={styles.recipeTitleModern}>{message.recipe.name}</CustomText>
                <View style={styles.metaPillWrapperModern}>
                    <View style={styles.metaPillModern}>
                        <Ionicons name="list-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                        <CustomText style={styles.metaPillTextModern}>
                            {Array.isArray(message.recipe.ingredients) ? message.recipe.ingredients.length : 0} ingredients
                        </CustomText>
                    </View>
                </View>
                <View style={styles.metaPillWrapperModern}>
                    <View style={styles.metaPillModern}>
                        <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                        <CustomText style={styles.metaPillTextModern}>{message.recipe.time || '—'}</CustomText>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function ChatScreen() {
    const router = useRouter();
    const { chat_id } = useLocalSearchParams();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<{ avatar_url?: string } | null>(null);
    const [currentChatId, setCurrentChatId] = useState<string | null>(chat_id ? String(chat_id) : null);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top', 'bottom']}>
                <View style={styles.loadingContainer}>
                    <CustomText style={styles.loadingText}>Loading chat...</CustomText>
                </View>
            </SafeAreaView>
        );
    }

    if (!userId) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top', 'bottom']}>
                <View style={styles.loadingContainer}>
                    <CustomText style={styles.loadingText}>You must be logged in to chat with the AI Chef.</CustomText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.outerContainer} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.headerModern}>
                <View style={styles.headerTitleContainer}>
                    <CustomText style={styles.headerTitle}>AI Chef</CustomText>
                    <View style={styles.headerStatusRow}>
                        <View style={styles.headerStatusDot} />
                        <CustomText style={styles.headerStatusText}>Online</CustomText>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.headerCloseButtonRight}
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
            
            {/* Chat Messages */}
            <View style={styles.chatAreaBg}>
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.messagesContainer} 
                    contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Show welcome message for new chats */}
                    {messages.length === 0 && (
                        <View style={styles.welcomeContainer}>
                            <Image source={require('../assets/images/ai-avatar.png')} style={styles.welcomeAvatar} />
                            <View style={styles.welcomeBubble}>
                                <CustomText style={styles.welcomeTitle}>👋 Welcome to AI Chef!</CustomText>
                                <CustomText style={styles.welcomeText}>
                                    I'm your personal AI chef assistant. I can help you with:
                                </CustomText>
                                <View style={styles.welcomeList}>
                                    <CustomText style={styles.welcomeListItem}>• Recipe suggestions based on your preferences</CustomText>
                                    <CustomText style={styles.welcomeListItem}>• Cooking tips and techniques</CustomText>
                                    <CustomText style={styles.welcomeListItem}>• Ingredient substitutions</CustomText>
                                    <CustomText style={styles.welcomeListItem}>• Meal planning ideas</CustomText>
                                </View>
                                <CustomText style={styles.welcomeText}>
                                    Just ask me anything about cooking, and I'll create personalized recipes for you!
                                </CustomText>
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
                                        <Image source={require('../assets/images/ai-avatar.png')} style={styles.messageAvatar} />
                                    )}
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
                                </View>
                            );
                        }
                        
                        // AI message
                        if (msg.role === 'assistant') {
                            return (
                                <View key={msg.id} style={[styles.messageRow, styles.aiRow, !isGrouped && { marginTop: 18 }]}> 
                                    {!isGrouped && (
                                        <Image source={require('../assets/images/ai-avatar.png')} style={styles.messageAvatar} />
                                    )}
                                    <View style={[styles.aiBubble, !isGrouped && styles.aiBubbleTail]}> 
                                        <CustomText style={styles.aiText}>{msg.text}</CustomText>
                                        <CustomText style={styles.timestamp}>{timestamp}</CustomText>
                                    </View>
                                </View>
                            );
                        }
                        
                        // User message
                        return (
                            <View key={msg.id} style={[styles.messageRow, styles.userRow, !isGrouped && { marginTop: 18 }]}> 
                                <View style={[styles.userBubble, !isGrouped && styles.userBubbleTail]}>
                                    <CustomText style={styles.userText}>{msg.text}</CustomText>
                                    <CustomText style={styles.timestamp}>{timestamp}</CustomText>
                                </View>
                                {!isGrouped && (
                                    <Image 
                                        source={
                                            userProfile?.avatar_url
                                                ? { uri: userProfile.avatar_url }
                                                : require('../assets/images/avatar.png')
                                        } 
                                        style={styles.messageAvatar} 
                                        onError={() => console.log('Failed to load user avatar:', userProfile?.avatar_url)}
                                        onLoad={() => console.log('Successfully loaded user avatar:', userProfile?.avatar_url)}
                                    />
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
            
            {/* Input Bar */}
            <SafeAreaView edges={['bottom']} style={styles.safeAreaInput}>
                <View style={styles.inputContainer}>
                    <View style={styles.inputBox}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type Message"
                            placeholderTextColor="#B0B0B0"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={!message.trim() || sending}
                        >
                            <Ionicons name="send" size={18} color={message.trim() ? "#fff" : "#DDD"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    outerContainer: { 
        flex: 1, 
        backgroundColor: '#F3F0FF' 
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
        backgroundColor: '#6DA98C',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: 'transparent',
        elevation: 0,
        zIndex: 10,
        paddingTop: Platform.OS === 'ios' ? 48 : 32,
        paddingBottom: 20,
        paddingHorizontal: 24,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    headerStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginRight: 6,
    },
    headerStatusText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    headerCloseButtonRight: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 32 : 32,
        right: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 10,
    },
    chatAreaBg: {
        flex: 1,
        backgroundColor: '#F3F0FF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: HEADER_HEIGHT,
        position: 'relative',
    },
    messagesContainer: {
        flex: 1,
        paddingTop: 16,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    aiRow: {
        justifyContent: 'flex-start',
    },
    userRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'flex-end',
    },
    messageAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginHorizontal: 8,
        backgroundColor: '#D1E7DD',
    },
    aiBubble: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 16,
        marginHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        maxWidth: SCREEN_WIDTH * 0.75,
    },
    userBubble: {
        backgroundColor: '#B6E2D3',
        borderRadius: 22,
        padding: 16,
        marginHorizontal: 8,
        shadowColor: '#B6E2D3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        maxWidth: SCREEN_WIDTH * 0.75,
    },
    aiBubbleTail: {
        borderBottomLeftRadius: 0,
    },
    userBubbleTail: {
        borderBottomRightRadius: 0,
    },
    aiText: {
        color: '#222',
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 22,
        letterSpacing: -0.1,
    },
    userText: {
        color: '#222',
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 22,
        letterSpacing: -0.1,
    },
    timestamp: {
        fontSize: 12,
        color: '#B0B0B0',
        marginTop: 8,
        textAlign: 'right',
    },
    safeAreaInput: {
        backgroundColor: '#F3F0FF',
    },
    inputContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 0,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        borderRadius: 32,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderWidth: 0,
        shadowColor: '#6DA98C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#222',
        maxHeight: 120,
        paddingVertical: 4,
        lineHeight: 20,
        fontWeight: '500',
    },
    sendButton: {
        backgroundColor: '#6DA98C',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        shadowColor: '#6DA98C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        backgroundColor: '#F7F7F7',
        shadowOpacity: 0,
        elevation: 0,
    },
    // Recipe card styles
    recipeCardModern: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        position: 'relative',
        marginTop: 4,
        minHeight: 12,
        maxWidth: SCREEN_WIDTH * 0.5,
        alignSelf: 'center',
        marginHorizontal: 4,
    },
    recipeCardLeftModern: {
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardImageWrapperModern: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    cardImageModern: {
        width: 56,
        height: 56,
        borderRadius: 16,
        resizeMode: 'cover',
    },
    recipeCardRightModern: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
        maxWidth: '65%',
    },
    recipeTitleModern: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        textAlign: 'left',
        marginBottom: 8,
        minHeight: 24,
        flexShrink: 1,
        maxWidth: '100%',
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
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginHorizontal: 3,
    },
    metaPillTextModern: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    // Typing indicator styles
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 36,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8CBEC7',
        marginHorizontal: 2,
    },
    typingText: {
        color: '#6C757D',
        fontSize: 15,
        fontStyle: 'italic',
        flex: 1,
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
        backgroundColor: '#D1E7DD',
    },
    welcomeBubble: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 20,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        maxWidth: SCREEN_WIDTH * 0.85,
    },
    welcomeTitle: {
        color: '#222',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        lineHeight: 24,
    },
    welcomeText: {
        color: '#666',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
    },
    welcomeList: {
        marginBottom: 12,
    },
    welcomeListItem: {
        color: '#666',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
        paddingLeft: 4,
    },
}); 