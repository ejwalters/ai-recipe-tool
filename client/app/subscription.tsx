import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';

export default function SubscriptionScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#444" />
                </TouchableOpacity>
                <CustomText style={styles.headerText}>Subscription</CustomText>
            </View>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
                <Image
                    source={require('../assets/images/avatar.png')}
                    style={styles.illustration}
                    resizeMode="contain"
                />
            </View>
            <CustomText style={styles.planLabel}>Your Plan</CustomText>
            <CustomText style={styles.planName}>Pro</CustomText>
            <TouchableOpacity style={styles.manageButton}>
                <CustomText style={styles.manageButtonText}>Manage Plan</CustomText>
            </TouchableOpacity>
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
        fontSize: 22,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        marginRight: 32,
        color: '#444',
    },
    illustrationContainer: {
        alignItems: 'center',
        marginBottom: 18,
    },
    illustration: {
        width: 280,
        height: 160,
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    planLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
        marginLeft: 32,
        marginTop: 18,
        marginBottom: 2,
    },
    planName: {
        fontSize: 16,
        color: '#444',
        marginLeft: 32,
        marginBottom: 32,
    },
    manageButton: {
        backgroundColor: '#E2B36A',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        marginHorizontal: 24,
        marginTop: 8,
        marginBottom: 24,
        shadowColor: '#E2B36A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 4,
    },
    manageButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
}); 