import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddRecipeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F3F0FF" translucent={Platform.OS === 'android'} />
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={[styles.headerBg, { paddingTop: insets.top + 20 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <View style={styles.backButtonCircle}>
                            <Ionicons name="arrow-back" size={20} color="#1F2937" />
                        </View>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity style={styles.searchButton}>
                        <View style={styles.searchButtonCircle}>
                            <Ionicons name="search" size={20} color="#1F2937" />
                        </View>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <CustomText style={styles.headerText}>Add a New Recipe</CustomText>
                        <CustomText style={styles.subHeader}>
                            Choose the easiest way for you to build your digital cookbook.
                        </CustomText>
                    </View>
                    <View style={styles.illustrationContainer}>
                        <CustomText style={styles.cookbookEmoji}>📖</CustomText>
                    </View>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.contentContainer}>
                <ScrollView 
                    style={styles.scrollView} 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Option Cards */}
                    <View style={styles.cardsContainer}>
                        {/* Scan Recipe */}
                        <TouchableOpacity 
                            style={styles.optionCard} 
                            activeOpacity={0.9}
                            onPress={() => router.push('/add-recipe-photo')}
                        >
                            <View style={[styles.iconSquare, styles.iconGreen]}>
                                <Ionicons name="camera" size={24} color="#FFFFFF" />
                            </View>
                            <View style={styles.cardContent}>
                                <CustomText style={styles.cardTitle}>Scan Recipe</CustomText>
                                <CustomText style={styles.cardDescription}>
                                    Snap a photo of a cookbook page or physical recipe card.
                                </CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
                        </TouchableOpacity>

                        {/* Add Manually */}
                        <TouchableOpacity 
                            style={styles.optionCard} 
                            activeOpacity={0.9}
                            onPress={() => router.push('/add-recipe-manual')}
                        >
                            <View style={[styles.iconSquare, styles.iconPurple]}>
                                <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                            </View>
                            <View style={styles.cardContent}>
                                <CustomText style={styles.cardTitle}>Add Manually</CustomText>
                                <CustomText style={styles.cardDescription}>
                                    Create from scratch with your own ingredients and steps.
                                </CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
                        </TouchableOpacity>
                    </View>

                    {/* Quick Tips Section */}
                    <View style={styles.quickTipsSection}>
                        <View style={styles.quickTipsHeader}>
                            <Ionicons name="bulb-outline" size={20} color="#EA580C" />
                            <CustomText style={styles.quickTipsTitle}>Quick Tips</CustomText>
                        </View>
                        <CustomText style={styles.quickTipsText}>
                            • Photos work best with clear, well-lit recipe cards placed on a flat surface.{'\n'}
                            • Manual entry gives you full control over formatting and details.
                        </CustomText>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F0FF',
    },
    headerBg: {
        backgroundColor: '#F3F0FF',
        paddingBottom: 32,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        padding: 4,
    },
    backButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchButton: {
        padding: 4,
    },
    searchButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    headerTextContainer: {
        flex: 1,
        marginRight: 16,
    },
    headerText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subHeader: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '400',
        lineHeight: 22,
    },
    illustrationContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cookbookEmoji: {
        fontSize: 64,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
        paddingBottom: 32,
    },
    cardsContainer: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    optionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconSquare: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconGreen: {
        backgroundColor: '#10B981',
    },
    iconPurple: {
        backgroundColor: '#8B5CF6',
    },
    iconBlue: {
        backgroundColor: '#3B82F6',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '400',
        lineHeight: 20,
    },
    chevron: {
        marginLeft: 12,
    },
    quickTipsSection: {
        backgroundColor: '#FFF7ED',
        marginHorizontal: 24,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    quickTipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    quickTipsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EA580C',
        marginLeft: 8,
        letterSpacing: -0.2,
    },
    quickTipsText: {
        fontSize: 14,
        color: '#9A3412',
        fontWeight: '400',
        lineHeight: 20,
    },
});
