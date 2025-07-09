import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SubscriptionScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                </View>
                <CustomText style={styles.headerText}>Subscription</CustomText>
                <CustomText style={styles.subHeader}>Manage your plan and billing</CustomText>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, marginTop: 24 }} showsVerticalScrollIndicator={false}>
                    
                    {/* Current Plan Card */}
                    <View style={styles.planCard}>
                        <View style={styles.planHeader}>
                            <View style={styles.planIconBox}>
                                <Ionicons name="diamond" size={24} color="#fff" />
                            </View>
                            <View style={styles.planInfo}>
                                <CustomText style={styles.planLabel}>Current Plan</CustomText>
                                <CustomText style={styles.planName}>Pro</CustomText>
                            </View>
                            <View style={styles.statusBadge}>
                                <CustomText style={styles.statusText}>Active</CustomText>
                            </View>
                        </View>
                        <View style={styles.planFeatures}>
                            <View style={styles.featureRow}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <CustomText style={styles.featureText}>Unlimited AI recipe generation</CustomText>
                            </View>
                            <View style={styles.featureRow}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <CustomText style={styles.featureText}>Advanced dietary filtering</CustomText>
                            </View>
                            <View style={styles.featureRow}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <CustomText style={styles.featureText}>Priority customer support</CustomText>
                            </View>
                            <View style={styles.featureRow}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <CustomText style={styles.featureText}>Ad-free experience</CustomText>
                            </View>
                        </View>
                    </View>

                    {/* Billing Info Card */}
                    <View style={styles.billingCard}>
                        <CustomText style={styles.billingTitle}>Billing Information</CustomText>
                        <View style={styles.billingRow}>
                            <CustomText style={styles.billingLabel}>Next billing date</CustomText>
                            <CustomText style={styles.billingValue}>March 15, 2024</CustomText>
                        </View>
                        <View style={styles.billingRow}>
                            <CustomText style={styles.billingLabel}>Amount</CustomText>
                            <CustomText style={styles.billingValue}>$9.99/month</CustomText>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionContainer}>
                        <TouchableOpacity style={styles.manageButton} activeOpacity={0.92}>
                            <Ionicons name="settings-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <CustomText style={styles.manageButtonText}>Manage Plan</CustomText>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.cancelButton} activeOpacity={0.92}>
                            <Ionicons name="close-circle-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                            <CustomText style={styles.cancelButtonText}>Cancel Subscription</CustomText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
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
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginHorizontal: 18,
        marginBottom: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    planIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    planInfo: {
        flex: 1,
    },
    planLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 2,
    },
    planName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
    },
    statusBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
    planFeatures: {
        gap: 12,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
        marginLeft: 12,
    },
    billingCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginHorizontal: 18,
        marginBottom: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    billingTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginBottom: 16,
    },
    billingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    billingLabel: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
    },
    billingValue: {
        fontSize: 15,
        color: '#222',
        fontWeight: '600',
    },
    actionContainer: {
        paddingHorizontal: 18,
        gap: 12,
    },
    manageButton: {
        backgroundColor: '#B6E2D3',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        shadowColor: '#B6E2D3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    manageButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    cancelButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
}); 