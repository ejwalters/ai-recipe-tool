import React, { useRef, useEffect, useState, useCallback } from 'react';
import CustomText from '../../components/CustomText';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChefScreen() {
    const router = useRouter();
    const startChatRef = useRef<any>(null);
    const chatBtnRefs = useRef<any[]>([]);
    const [chats, setChats] = useState<{ id: string; created_at?: string; summary?: string }[]>([]);
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

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return date.toLocaleDateString('en-US', { weekday: 'long' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    if (loading && !searching) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Animated.Image
                        source={require('../../assets/images/fork-knife.png')}
                        style={[styles.loadingIcon, { transform: [{ scale: pulseAnim }] }]}
                    />
                    <CustomText style={styles.loadingText}>Loading your chats...</CustomText>
                </View>
            </SafeAreaView>
        );
    }

    if (!userId) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top']}>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top']}>
            {/* Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <CustomText style={styles.logoText}>🤖</CustomText>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="sparkles" size={24} color="#6DA98C" />
                </View>
                <CustomText style={styles.headerTitle}>AI Chef</CustomText>
                <CustomText style={styles.headerSubtitle}>Your cooking conversations</CustomText>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
                {/* Floating Search Bar */}
                <View style={styles.searchBarWrapper}>
                    <View style={styles.searchBar}>
                        {searching ? (
                            <Animated.Image
                                source={require('../../assets/images/fork-knife.png')}
                                style={[styles.searchIcon, { transform: [{ scale: pulseAnim }] }]}
                            />
                        ) : (
                            <Ionicons name="search" size={22} color="#B0B0B0" style={styles.searchIcon} />
                        )}
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search your chat history..."
                            placeholderTextColor="#B0B0B0"
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
                        <View style={styles.newChatContent}>
                            <View style={styles.newChatIcon}>
                                <Ionicons name="add" size={24} color="#fff" />
                            </View>
                            <View style={styles.newChatText}>
                                <CustomText style={styles.newChatTitle}>Start New Chat</CustomText>
                                <CustomText style={styles.newChatDesc}>Ask AI Chef for recipe ideas</CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6DA98C" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Chat History */}
                <View style={styles.chatHistoryContainer}>
                    <View style={styles.sectionHeader}>
                        <CustomText style={styles.sectionTitle}>Recent Conversations</CustomText>
                        <CustomText style={styles.chatCount}>{chats.length} chats</CustomText>
                    </View>
                    
                    <FlatList
                        data={chats}
                        keyExtractor={item => item.id}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                ref={el => { chatBtnRefs.current[index] = el; }}
                                style={styles.chatCard}
                                onPress={() => openChatFromRef(chatBtnRefs.current[index], item.id)}
                                activeOpacity={0.92}
                            >
                                <View style={styles.chatCardContent}>
                                    <View style={styles.chatCardHeader}>
                                        <View style={styles.chatCardIcon}>
                                            <Ionicons name="chatbubble-ellipses" size={20} color="#6DA98C" />
                                        </View>
                                        <View style={styles.chatCardInfo}>
                                            <CustomText style={styles.chatCardTitle}>
                                                {item.summary ? item.summary.substring(0, 50) + (item.summary.length > 50 ? '...' : '') : 'Chat Conversation'}
                                            </CustomText>
                                            <CustomText style={styles.chatCardDate}>
                                                {item.created_at ? formatDate(item.created_at) : 'Unknown date'}
                                            </CustomText>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
                                </View>
                            </TouchableOpacity>
                        )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F0FF',
    },
    loadingIcon: {
        width: 48,
        height: 48,
        tintColor: '#6DA98C',
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
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
        backgroundColor: '#F3F0FF',
        paddingTop: Platform.OS === 'ios' ? 48 : 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#222',
        letterSpacing: 0.5,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#222',
        marginTop: 2,
        marginLeft: 2,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 2,
        marginBottom: 8,
    },
    searchBarWrapper: {
        alignItems: 'center',
        marginTop: -28,
        marginBottom: 18,
        zIndex: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 18,
        height: 54,
        width: '92%',
        marginTop: 8,
    },
    searchIcon: {
        marginRight: 10,
        width: 22,
        height: 22,
        tintColor: '#B0B0B0',
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
        color: '#222',
        fontFamily: 'System',
        paddingVertical: 0,
    },
    clearButton: {
        marginLeft: 8,
        padding: 2,
    },
    newChatContainer: {
        paddingHorizontal: 18,
        marginBottom: 24,
    },
    newChatButton: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    newChatContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    newChatIcon: {
        backgroundColor: '#6DA98C',
        borderRadius: 12,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    newChatText: {
        flex: 1,
    },
    newChatTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginBottom: 2,
    },
    newChatDesc: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    chatHistoryContainer: {
        flex: 1,
        paddingHorizontal: 18,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
    },
    chatCount: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 24,
    },
    chatCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    chatCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    chatCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    chatCardIcon: {
        backgroundColor: '#F0F9F4',
        borderRadius: 10,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    chatCardInfo: {
        flex: 1,
    },
    chatCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 2,
    },
    chatCardDate: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
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