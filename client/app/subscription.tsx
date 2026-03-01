import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SubscriptionScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <CustomText style={styles.headerTitle}>Plan & Subscription</CustomText>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Plan Card */}
                <View style={styles.planCard}>
                    <View style={styles.planHeader}>
                        <View style={styles.planIconBox}>
                            <Ionicons name="card-outline" size={22} color="#3949AB" />
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
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <CustomText style={styles.featureText}>Unlimited AI recipe generation</CustomText>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <CustomText style={styles.featureText}>Advanced dietary filtering</CustomText>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <CustomText style={styles.featureText}>Priority customer support</CustomText>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <CustomText style={styles.featureText}>Ad-free experience</CustomText>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.billingSection}>
                        <View style={styles.billingRow}>
                            <CustomText style={styles.billingLabel}>Next billing date</CustomText>
                            <CustomText style={styles.billingValue}>March 15, 2024</CustomText>
                        </View>
                        <View style={styles.billingRow}>
                            <CustomText style={styles.billingLabel}>Amount</CustomText>
                            <CustomText style={styles.billingValue}>$9.99/month</CustomText>
                        </View>
                    </View>
                </View>

                {/* Manage Plan Button */}
                <TouchableOpacity style={styles.manageButton} activeOpacity={0.8}>
                    <Ionicons name="settings-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    <CustomText style={styles.manageButtonText}>Manage Plan</CustomText>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8}>
                    <Ionicons name="close-circle-outline" size={20} color="#6B7280" style={styles.buttonIcon} />
                    <CustomText style={styles.cancelButtonText}>Cancel Subscription</CustomText>
                </TouchableOpacity>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    planCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    planIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E8EAF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    planInfo: {
        flex: 1,
    },
    planLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 2,
    },
    planName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    statusBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
    planFeatures: {
        gap: 12,
        marginBottom: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
        marginLeft: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 16,
    },
    billingSection: {
        gap: 8,
    },
    billingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    billingLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    billingValue: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '600',
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#256D85',
        marginBottom: 12,
    },
    buttonIcon: {
        marginRight: 8,
    },
    manageButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '600',
    },
    bottomSpacer: {
        height: 32,
    },
});
