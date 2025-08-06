import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddRecipeScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={26} color="#222" />
                    </TouchableOpacity>
                    <CustomText style={styles.logoText}>🍳</CustomText>
                    <View style={{ flex: 1 }} />
                </View>
                <CustomText style={styles.headerText}>Add a Recipe</CustomText>
                <CustomText style={styles.subHeader}>Choose how you'd like to add your recipe</CustomText>
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
                        <TouchableOpacity 
                            style={[styles.optionCard, styles.cardGreen]} 
                            activeOpacity={0.92}
                            onPress={() => router.push('/add-recipe-photo')}
                        >
                            <View style={styles.cardIconContainer}>
                                <View style={styles.iconBackground}>
                                    <Ionicons name="camera" size={28} color="#2D5A4A" />
                                </View>
                            </View>
                            <View style={styles.cardContent}>
                                <CustomText style={styles.cardTitle}>Take a Photo</CustomText>
                                <CustomText style={styles.cardDescription}>Snap a photo of a physical recipe card or cookbook page</CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.optionCard, styles.cardPurple]} 
                            activeOpacity={0.92}
                            onPress={() => router.push('/add-recipe-manual')}
                        >
                            <View style={styles.cardIconContainer}>
                                <View style={[styles.iconBackground, styles.iconBgPurple]}>
                                    <Ionicons name="create-outline" size={28} color="#5A5A8B" />
                                </View>
                            </View>
                            <View style={styles.cardContent}>
                                <CustomText style={styles.cardTitle}>Add Manually</CustomText>
                                <CustomText style={styles.cardDescription}>Create a recipe from scratch with your own ingredients and steps</CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.chevron} />
                        </TouchableOpacity>
                    </View>

                    {/* Help Section */}
                    <View style={styles.helpSection}>
                        <View style={styles.helpHeader}>
                            <Ionicons name="information-circle-outline" size={20} color="#6DA98C" />
                            <CustomText style={styles.helpTitle}>Quick Tips</CustomText>
                        </View>
                        <CustomText style={styles.helpText}>
                            • Photos work best with clear, well-lit recipe cards{'\n'}
                            • Manual entry gives you full control over your recipe
                        </CustomText>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F0FF',
    },
    headerBg: {
        backgroundColor: '#F3F0FF',
        paddingTop: 60,
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
    contentContainer: {
        flex: 1,
        backgroundColor: '#F7F7FA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
        marginTop: 24,
    },
    cardsContainer: {
        paddingHorizontal: 18,
        marginBottom: 24,
    },
    optionCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderLeftWidth: 4,
    },
    cardGreen: {
        borderLeftColor: '#B6E2D3',
    },
    cardYellow: {
        borderLeftColor: '#FFF3C4',
    },
    cardPurple: {
        borderLeftColor: '#D6D6F7',
    },
    cardIconContainer: {
        marginRight: 16,
    },
    iconBackground: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#E6F6F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBgYellow: {
        backgroundColor: '#FFFBE7',
    },
    iconBgPurple: {
        backgroundColor: '#F0F0FB',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        lineHeight: 20,
    },
    chevron: {
        marginLeft: 8,
    },
    helpSection: {
        backgroundColor: '#fff',
        marginHorizontal: 18,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    helpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginLeft: 8,
    },
    helpText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        fontWeight: '500',
    },
}); 