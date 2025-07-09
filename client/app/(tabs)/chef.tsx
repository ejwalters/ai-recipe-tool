import React, { useRef, useEffect, useState, useCallback } from 'react';
import CustomText from '../../components/CustomText';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

export default function ChefScreen() {
    const router = useRouter();
    const startChatRef = useRef<any>(null);
    const chatBtnRefs = useRef<any[]>([]);
    const [chats, setChats] = useState<{ id: string; created_at?: string; summary?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    if (loading && !searching) {
        return (
            <View style={styles.container}>
                <View style={styles.mainLoadingContainer}>
                    <Image
                        source={require('../../assets/images/fork-knife.png')}
                        style={styles.mainLoadingIcon}
                    />
                </View>
            </View>
        );
    }

    if (!userId) {
        return (
            <View style={styles.container}>
                <CustomText style={{ marginTop: 100, textAlign: 'center' }}>You must be logged in to view your AI Chef chats.</CustomText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <CustomText style={styles.headerText}>AI Chef Chat History</CustomText>
            </View>
            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Chats"
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={20} color="#888" />
                    </TouchableOpacity>
                ) : (
                    <Ionicons name="search" size={22} color="#888" style={styles.searchIcon} />
                )}
            </View>
            {/* Start New Chat Button */}
            <TouchableOpacity
                ref={startChatRef}
                style={styles.aiChefButton}
                onPress={() => openChatFromRef(startChatRef)}
            >
                <CustomText style={styles.aiChefButtonText}>Start New Chat</CustomText>
            </TouchableOpacity>
            {/* Chat History List */}
            <FlatList
                data={chats}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => {
                    return (
                        <View style={styles.chatRow}>
                            <View style={{ flex: 1 }}>
                                <CustomText style={styles.chatTime}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</CustomText>
                                <CustomText style={styles.chatSummary}>Summary: {item.summary || 'No summary'}</CustomText>
                            </View>
                            <TouchableOpacity
                                ref={el => { chatBtnRefs.current[index] = el; }}
                                style={styles.chatIconButton}
                                onPress={() => openChatFromRef(chatBtnRefs.current[index], item.id)}
                            >
                                <Image source={require('../../assets/images/chat.png')} style={styles.chatIconImage} />
                            </TouchableOpacity>
                        </View>
                    );
                }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <CustomText style={{ textAlign: 'center', marginTop: 40 }}>
                        {searchQuery ? `No chats found for "${searchQuery}"` : 'No chats yet. Start a new chat!'}
                    </CustomText>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F6F9', paddingTop: 80, paddingHorizontal: 0 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 18,
    },
    backButton: {
        marginRight: 8,
        padding: 4,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        marginRight: 32, // to balance the back button
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 18,
        height: 48,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#222',
    },
    searchIcon: {
        marginLeft: 8,
    },
    clearButton: {
        marginLeft: 8,
        padding: 2,
    },
    mainLoadingContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainLoadingIcon: {
        width: 48,
        height: 48,
        tintColor: '#6DA98C',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 0,
        marginBottom: 2,
    },
    chatTime: {
        fontSize: 15,
        fontWeight: '700',
        color: '#444',
    },
    chatSummary: {
        fontSize: 14,
        color: '#6C757D',
    },
    chatIconButton: {
        marginLeft: 12,
        padding: 4,
    },
    chatIconImage: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    aiChefButton: {
        backgroundColor: '#6DA98C',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        minWidth: 350,
        paddingHorizontal: 24,
        marginTop: 0,
        marginBottom: 18,
        alignSelf: 'center',
    },
    aiChefButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
}); 