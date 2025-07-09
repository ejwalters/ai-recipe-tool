import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';

export default function AddRecipeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#444" />
                </TouchableOpacity>
                <CustomText style={styles.headerText}>Add a Recipe</CustomText>
            </View>
            <CustomText style={styles.prompt}>How do you want to add a recipe?</CustomText>
            <View style={styles.optionsContainer}>
                <TouchableOpacity style={[styles.optionButton, styles.optionBlue]}>
                    <CustomText style={styles.optionText}>Take a photo of a{"\n"}physical recipe card</CustomText>
                    <Ionicons name="camera-outline" size={36} color="#fff" style={styles.optionIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.optionButton, styles.optionGold]} onPress={() => router.push('/search-web-recipe')}>
                    <CustomText style={styles.optionText}>Search for a recipe{"\n"}on the web</CustomText>
                    <Ionicons name="search-outline" size={36} color="#fff" style={styles.optionIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.optionButton, styles.optionGreen]} onPress={() => router.push('/add-recipe-manual')}>
                    <CustomText style={styles.optionText}>Add recipe{"\n"}manually</CustomText>
                    <Ionicons name="keypad-outline" size={36} color="#fff" style={styles.optionIcon} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F6F9',
        paddingTop: 80,
        paddingHorizontal: 0,
    },
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
        color: '#444',
    },
    prompt: {
        fontSize: 20,
        fontWeight: '700',
        color: '#444',
        textAlign: 'center',
        marginBottom: 32,
    },
    optionsContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    optionButton: {
        width: '90%',
        minHeight: 120,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        marginBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    optionText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        flex: 1,
        flexWrap: 'wrap',
        marginRight: 16,
    },
    optionIcon: {
        marginLeft: 8,
    },
    optionBlue: {
        backgroundColor: '#8CBEC7',
    },
    optionGold: {
        backgroundColor: '#E2B36A',
    },
    optionGreen: {
        backgroundColor: '#7BA892',
    },
}); 