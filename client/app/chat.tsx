import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Animated, Easing, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

const CARD_COLORS = ['#CDEFE3', '#E2E2F9', '#FFF7D1', '#D6ECFB'];
const CARD_ICON_BG = ['#E6F6F0', '#F0F0FB', '#FFFBE7', '#EAF6FE'];
const CARD_WIDTH = (Dimensions.get('window').width - 18 * 2 - 16) / 2;
const SCREEN_WIDTH = Dimensions.get('window').width;

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

function ChefTypingIndicator({ pulseAnim }: { pulseAnim: Animated.Value }) {
    // Animated three dots (steam)
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
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <View style={{ height: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 0 }}>
                    <Animated.View style={{
                        width: 8, height: 8, borderRadius: 4, backgroundColor: '#8CBEC7', marginHorizontal: 2,
                        opacity: dot1,
                        transform: [{ translateY: dot1.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                    }} />
                    <Animated.View style={{
                        width: 8, height: 8, borderRadius: 4, backgroundColor: '#8CBEC7', marginHorizontal: 2,
                        opacity: dot2,
                        transform: [{ translateY: dot2.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                    }} />
                    <Animated.View style={{
                        width: 8, height: 8, borderRadius: 4, backgroundColor: '#8CBEC7', marginHorizontal: 2,
                        opacity: dot3,
                        transform: [{ translateY: dot3.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                    }} />
                </View>
            </View>
            <CustomText style={styles.loadingText}>The AI Chef is cooking up something special...</CustomText>
        </View>
    );
}

export const HEADER_HEIGHT = 110;

export default function ChatScreen() {
    const router = useRouter();
    const { chat_id } = useLocalSearchParams();
    const [message, setMessage] = useState('');
    const [allMessages, setAllMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [currentChatId, setCurrentChatId] = useState<string | null>(chat_id ? String(chat_id) : null);
    const [sending, setSending] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const [inputFocused, setInputFocused] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);

    // Fetch user ID on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setUserId(data.user.id);
        });
    }, []);

    // Fetch messages for this chat on mount and when returning to chat
    useEffect(() => {
        if (!currentChatId) {
            setAllMessages([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetch(`https://familycooksclean.onrender.com/ai/messages?chat_id=${currentChatId}`)
            .then(res => res.json())
            .then(data => {
                console.log('Raw messages from server:', data);
                // Transform messages: if assistant message is valid recipe JSON, replace with [RECIPE_CARD]
                const transformed = data.flatMap((msg: any) => {
                    if (msg.role === 'assistant') {
                        const maybeJson = extractJsonFromString(msg.content);
                        if (maybeJson && maybeJson.is_recipe) {
                            return [{ 
                                role: 'assistant', 
                                content: '[RECIPE_CARD]', 
                                recipe: maybeJson,
                                id: msg.id, // Preserve the message ID
                                saved_recipe_id: msg.saved_recipe_id // Preserve the saved recipe ID
                            }];
                        } else if (maybeJson && maybeJson.is_recipe === false) {
                            // Prefer 'text', fallback to 'message'
                            const text = maybeJson.text || maybeJson.message;
                            if (text) {
                                return [{ 
                                    role: 'assistant', 
                                    content: text,
                                    id: msg.id // Preserve the message ID
                                }];
                            }
                        }
                    }
                    return [msg];
                });
                console.log('Transformed messages:', transformed);
                setAllMessages(transformed);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [currentChatId]);

    // Refresh messages when returning to chat screen
    useFocusEffect(
        React.useCallback(() => {
            if (currentChatId) {
                console.log('Refreshing messages on focus');
                fetch(`https://familycooksclean.onrender.com/ai/messages?chat_id=${currentChatId}`)
                    .then(res => res.json())
                    .then(data => {
                        console.log('Raw messages from server (focus):', data);
                        // Transform messages: if assistant message is valid recipe JSON, replace with [RECIPE_CARD]
                        const transformed = data.flatMap((msg: any) => {
                            if (msg.role === 'assistant') {
                                const maybeJson = extractJsonFromString(msg.content);
                                if (maybeJson && maybeJson.is_recipe) {
                                    return [{ 
                                        role: 'assistant', 
                                        content: '[RECIPE_CARD]', 
                                        recipe: maybeJson,
                                        id: msg.id, // Preserve the message ID
                                        saved_recipe_id: msg.saved_recipe_id // Preserve the saved recipe ID
                                    }];
                                } else if (maybeJson && maybeJson.is_recipe === false) {
                                    // Prefer 'text', fallback to 'message'
                                    const text = maybeJson.text || maybeJson.message;
                                    if (text) {
                                        return [{ 
                                            role: 'assistant', 
                                            content: text,
                                            id: msg.id // Preserve the message ID
                                        }];
                                    }
                                }
                            }
                            return [msg];
                        });
                        console.log('Transformed messages (focus):', transformed);
                        setAllMessages(transformed);
                    })
                    .catch(() => {});
            }
        }, [currentChatId])
    );

    // Animate loading state
    useEffect(() => {
        const hasLoading = allMessages.some(msg => msg.isLoading);
        if (hasLoading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [allMessages, pulseAnim]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [allMessages]);

    const sendMessage = async () => {
        if (!message.trim() || !userId) return;
        
        const userMessage = message.trim();
        setMessage(''); // Clear input immediately
        setSending(true);
        
        // Immediately add user message to chat
        setAllMessages(prev => [
            ...prev,
            { role: 'user', content: userMessage }
        ]);
        
        // Add loading message
        setAllMessages(prev => [
            ...prev,
            { role: 'assistant', content: '[LOADING]', isLoading: true }
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
                
                // Remove loading message and add AI response
                setAllMessages(prev => {
                    const withoutLoading = prev.filter(msg => !msg.isLoading);
                    // Robustly extract and parse JSON from AI response
                    const maybeJson = extractJsonFromString(data.ai_response);
                    if (maybeJson && maybeJson.is_recipe) {
                        return [
                            ...withoutLoading,
                            { role: 'assistant', content: '[RECIPE_CARD]', recipe: maybeJson }
                        ];
                    } else if (maybeJson && maybeJson.is_recipe === false) {
                        // Prefer 'text', fallback to 'message'
                        const text = maybeJson.text || maybeJson.message;
                        return [
                            ...withoutLoading,
                            { role: 'assistant', content: text || data.ai_response }
                        ];
                    } else {
                        return [
                            ...withoutLoading,
                            { role: 'assistant', content: data.ai_response }
                        ];
                    }
                });
                console.log('AI raw response:', data.ai_response);
            } else {
                // Remove loading message and show error
                setAllMessages(prev => {
                    const withoutLoading = prev.filter(msg => !msg.isLoading);
                    return [
                        ...withoutLoading,
                        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
                    ];
                });
            }
        } catch (err) {
            // Remove loading message and show error
            setAllMessages(prev => {
                const withoutLoading = prev.filter(msg => !msg.isLoading);
                return [
                    ...withoutLoading,
                    { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
                ];
            });
        } finally {
            setSending(false);
        }
    };

    const handleScroll = (event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isCloseToBottom = layoutMeasurement.y + contentOffset.y >= contentSize.height - layoutMeasurement.height;
        setShowScrollToBottom(isCloseToBottom);
    };

    const scrollToBottom = () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    };

    if (loading && allMessages.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top', 'bottom']}>
                <ActivityIndicator size="large" color="#6DA98C" style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    if (!userId) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top', 'bottom']}>
                <CustomText style={{ marginTop: 100, textAlign: 'center' }}>You must be logged in to chat with the AI Chef.</CustomText>
            </SafeAreaView>
        );
    }

    // If no chat or no messages, prompt to start chat
    if (allMessages.length === 0) {
        return (
            <SafeAreaView style={styles.outerContainer} edges={['top', 'bottom']}>
                {/* Header with X close button, no shadow */}
                <View style={styles.headerNoShadow}>
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>
                {/* Welcome Card */}
                <View style={styles.welcomeCard}>
                    <Image source={require('../assets/images/ai-avatar.png')} style={styles.welcomeImage} />
                    <CustomText style={styles.welcomeHeadline}>Welcome to AI Chef!</CustomText>
                    <CustomText style={styles.welcomeSubtitle}>
                        Ask for meal ideas, get recipes, or chat about cooking. What would you like to make today?
                    </CustomText>
                </View>
                {/* Input Bar */}
                <SafeAreaView edges={['bottom']} style={styles.safeAreaInput}>
                    <View style={styles.inputContainer}>
                        <View style={styles.inputBoxFocused}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Type your first message..."
                                placeholderTextColor="#B0B0B0"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                maxLength={500}
                                autoFocus
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

    return (
        <SafeAreaView style={styles.outerContainer} edges={['top', 'bottom']}>
            {/* Absolute header overlays chat */}
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
            {/* Chat area with paddingTop so content starts below header, and scrolls under header */}
            <View style={styles.chatAreaBg}>
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.messagesContainer} 
                    contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 0 }}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    {allMessages.map((msg, idx) => {
                        const prevMsg = allMessages[idx - 1];
                        const isGrouped = prevMsg && prevMsg.role === msg.role;
                        const timestamp = `10:${(10 + idx).toString().padStart(2, '0')} AM`;
                        // Render stylized recipe card if this is a recipe
                        if (msg.content === '[RECIPE_CARD]' && msg.recipe) {
                            const cardColor = CARD_COLORS[idx % CARD_COLORS.length];
                            const iconBg = CARD_ICON_BG[idx % CARD_ICON_BG.length];
                            return (
                                <View key={idx} style={[styles.messageRow, styles.aiRow, !isGrouped && { marginTop: 18 }]}> 
                                    {!isGrouped && (
                                        <Image source={require('../assets/images/ai-avatar.png')} style={styles.messageAvatarModern} />
                                    )}
                                    <TouchableOpacity
                                        style={[styles.recipeCardModern, { backgroundColor: cardColor, maxWidth: SCREEN_WIDTH * 0.92, alignSelf: 'center' }]} activeOpacity={0.88}
                                        onPress={() => {
                                            if (msg.saved_recipe_id) {
                                                router.push({ pathname: '/recipe-detail', params: { id: msg.saved_recipe_id, message_id: msg.id, saved_recipe_id: msg.saved_recipe_id } });
                                            } else {
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
                                    >
                                        <View style={styles.recipeCardLeftModern}>
                                            <View style={[styles.cardImageWrapperModern, { backgroundColor: iconBg }]}> 
                                                {msg.recipe.image_url ? (
                                                    <Image source={{ uri: msg.recipe.image_url }} style={styles.cardImageModern} />
                                                ) : (
                                                    <Ionicons name="fast-food-outline" size={32} color="#B0B0B0" />
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.recipeCardRightModern}>
                                            <CustomText style={styles.recipeTitleModern}>{msg.recipe.name}</CustomText>
                                            <View style={styles.metaPillWrapperModern}>
                                                <View style={styles.metaPillModern}>
                                                    <Ionicons name="list-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                                                    <CustomText style={styles.metaPillTextModern}>{Array.isArray(msg.recipe.ingredients) ? msg.recipe.ingredients.length : 0} ingredients</CustomText>
                                                </View>
                                            </View>
                                            <View style={styles.metaPillWrapperModern}>
                                                <View style={styles.metaPillModern}>
                                                    <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                                                    <CustomText style={styles.metaPillTextModern}>{msg.recipe.time || '—'}</CustomText>
                                                </View>
                                            </View>
                                            <CustomText style={styles.timestampModern}>{timestamp}</CustomText>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            );
                        }
                        // AI message
                        if (msg.role === 'assistant') {
                            return (
                                <View key={idx} style={[styles.messageRow, styles.aiRow, !isGrouped && { marginTop: 18 }]}> 
                                    {!isGrouped && (
                                        <Image source={require('../assets/images/ai-avatar.png')} style={styles.messageAvatarModern} />
                                    )}
                                    <View style={[styles.aiBubbleModern, !isGrouped && styles.aiBubbleTail]}> 
                                        <CustomText style={styles.aiTextModern}>{msg.content}</CustomText>
                                        <CustomText style={styles.timestampModern}>{timestamp}</CustomText>
                                    </View>
                                </View>
                            );
                        }
                        // User message
                        return (
                            <View key={idx} style={[styles.messageRow, styles.userRow, !isGrouped && { marginTop: 18 }]}> 
                                <View style={[styles.userBubbleModern, !isGrouped && styles.userBubbleTail]}>
                                    <CustomText style={styles.userTextModern}>{msg.content}</CustomText>
                                    <CustomText style={styles.timestampModern}>{timestamp}</CustomText>
                                </View>
                                {/* User avatar on the right */}
                                {!isGrouped && (
                                    <Image source={require('../assets/images/avatar.png')} style={styles.messageAvatarModern} />
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
                {/* Scroll to bottom button */}
                {showScrollToBottom && (
                    <TouchableOpacity style={styles.scrollToBottomBtn} onPress={scrollToBottom}>
                        <Ionicons name="chevron-down" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
            {/* Floating Input Bar with icons */}
            <Animated.View style={[styles.floatingInputBarModern, inputFocused && styles.floatingInputBarFocusedModern]}>
                <View style={styles.inputContainerModern}>
                    <TouchableOpacity style={styles.inputIconBtn}>
                        <Ionicons name="add" size={24} color="#B0B0B0" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInputModern}
                        placeholder="Type Message"
                        placeholderTextColor="#B0B0B0"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={500}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                    />
                    <TouchableOpacity style={styles.inputIconBtn}>
                        <Ionicons name="happy-outline" size={24} color="#B0B0B0" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.inputIconBtn}>
                        <Ionicons name="mic-outline" size={24} color="#B0B0B0" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sendButtonModern, (!message.trim() || sending) && styles.sendButtonDisabledModern]}
                        onPress={sendMessage}
                        disabled={!message.trim() || sending}
                    >
                        <Ionicons name="send" size={20} color={message.trim() ? "#fff" : "#DDD"} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: '#F3F0FF' },
    headerBg: {
        backgroundColor: '#F3F0FF',
        paddingTop: Platform.OS === 'ios' ? 48 : 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
    },
    backButton: {
        marginRight: 8,
        padding: 4,
    },
    headerText: {
        fontSize: 22,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
        color: '#222',
        marginRight: 32,
        letterSpacing: -0.5,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#F7F7FA',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 12,
        marginTop: 10,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 32,
    },
    aiRow: {
        justifyContent: 'flex-start',
    },
    userRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'flex-end',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginHorizontal: 8,
        backgroundColor: '#D1E7DD',
    },
    bubble: {
        maxWidth: '80%',
        borderRadius: 18,
        padding: 14,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    aiBubble: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 0,
    },
    userBubble: {
        backgroundColor: '#B6E2D3',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 18,
        borderTopLeftRadius: 18,
        alignSelf: 'flex-end',
        shadowColor: '#B6E2D3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    bubbleText: {
        fontSize: 16,
        fontWeight: '500',
    },
    aiText: {
        color: '#222',
    },
    userText: {
        color: '#222',
    },
    recipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 14,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        position: 'relative',
        marginTop: 4,
        minHeight: 120,
        marginRight: 16,
    },
    recipeCardLeft: {
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardImageWrapper: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    cardImage: {
        width: 56,
        height: 56,
        borderRadius: 16,
        resizeMode: 'cover',
    },
    recipeCardRight: {
        flex: 1,
        justifyContent: 'center',
    },
    recipeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        textAlign: 'left',
        marginBottom: 8,
        minHeight: 24,
    },
    metaPillWrapper: {
        width: '100%',
        alignItems: 'flex-start',
        marginTop: 4,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginHorizontal: 3,
    },
    metaPillText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    cardHeart: {
        position: 'absolute',
        top: 18,
        right: 18,
    },
    safeAreaInput: {
        backgroundColor: 'transparent',
    },
    inputContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingBottom: 16,
        paddingTop: 0,
        borderTopWidth: 0,
        shadowColor: 'transparent',
        elevation: 0,
        marginTop: 0,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        borderRadius: 32,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderWidth: 0,
        marginHorizontal: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 8,
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
    loadingBubble: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    loadingText: {
        color: '#6C757D',
        fontSize: 15,
        fontStyle: 'italic',
        flex: 1,
    },
    welcomeCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        marginHorizontal: 24,
        marginTop: 36,
        marginBottom: 18,
        alignItems: 'center',
        paddingVertical: 36,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    welcomeImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 18,
        backgroundColor: '#F3F0FF',
    },
    welcomeHeadline: {
        fontSize: 22,
        fontWeight: '800',
        color: '#222',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 0,
    },
    inputBoxFocused: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        borderRadius: 32,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderWidth: 0,
        marginHorizontal: 16,
        marginBottom: 8,
        shadowColor: '#6DA98C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 10,
    },
    headerNoShadow: {
        backgroundColor: '#F3F0FF',
        paddingTop: Platform.OS === 'ios' ? 48 : 32,
        paddingBottom: 12,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // No shadow or elevation
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 32 : 32,
        right: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 10,
    },
    sleekBubble: {
        borderRadius: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 2,
        marginTop: 2,
    },
    sleekText: {
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 22,
        letterSpacing: -0.1,
    },
    floatingCloseButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 32 : 32,
        right: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 10,
    },
    aiHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    aiHeaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#F3F0FF',
    },
    aiHeaderLabel: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        letterSpacing: -0.5,
    },
    gradientBg: {
        flex: 1,
        backgroundColor: '#F7F7FA',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 12,
        marginTop: -24,
        position: 'relative',
    },
    aiBubbleModern: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 16,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 2,
        marginTop: 2,
    },
    userBubbleModern: {
        backgroundColor: '#B6E2D3',
        borderRadius: 22,
        padding: 16,
        marginHorizontal: 4,
        shadowColor: '#B6E2D3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 2,
        marginTop: 2,
    },
    aiTextModern: {
        color: '#222',
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 22,
        letterSpacing: -0.1,
    },
    userTextModern: {
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
    floatingInputBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 10,
    },
    floatingInputBarFocused: {
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 15,
    },
    scrollToBottomBtn: {
        position: 'absolute',
        bottom: 100, // Adjust as needed
        right: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6DA98C',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 9,
    },
    messageAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginHorizontal: 8,
        backgroundColor: '#D1E7DD',
    },
    // New styles for the redesigned UI
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
    headerCloseButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 32 : 32,
        left: 24,
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
        backgroundColor: '#F7F7FA',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: HEADER_HEIGHT, // Push chat area below header
        position: 'relative',
    },
    aiBubbleTail: {
        borderBottomLeftRadius: 0,
    },
    userBubbleTail: {
        borderBottomRightRadius: 0,
    },
    messageAvatarModern: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginHorizontal: 8,
        backgroundColor: '#D1E7DD',
    },
    timestampModern: {
        fontSize: 12,
        color: '#B0B0B0',
        marginTop: 8,
        textAlign: 'right',
    },
    floatingInputBarModern: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 10,
    },
    floatingInputBarFocusedModern: {
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 15,
    },
    inputContainerModern: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        borderRadius: 32,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderWidth: 0,
        marginHorizontal: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 8,
    },
    inputIconBtn: {
        padding: 8,
    },
    textInputModern: {
        flex: 1,
        fontSize: 16,
        color: '#222',
        maxHeight: 120,
        paddingVertical: 4,
        lineHeight: 20,
        fontWeight: '500',
    },
    sendButtonModern: {
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
    sendButtonDisabledModern: {
        backgroundColor: '#F7F7F7',
        shadowOpacity: 0,
        elevation: 0,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    bubbleImage: {
        width: (Dimensions.get('window').width - 16 - 12) / 2, // Adjust for padding and margin
        height: (Dimensions.get('window').width - 16 - 12) / 2, // Adjust for padding and margin
        borderRadius: 12,
        marginBottom: 8,
    },
    // New styles for recipe cards
    recipeCardModern: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 12, // reduce if needed
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        position: 'relative',
        marginTop: 4,
        minHeight: 12,
        maxWidth: SCREEN_WIDTH * 0.5, // make it smaller
        alignSelf: 'center',
        marginHorizontal: 4, // add this for extra space on both sides
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
        minWidth: 0, // Allow shrinking
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
    cardHeartModern: {
        position: 'absolute',
        top: 30,
        right: -10,
    },
}); 