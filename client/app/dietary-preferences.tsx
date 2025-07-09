import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { profileService } from '../lib/profileService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DietaryPreferencesScreen() {
    const router = useRouter();
    const [preferences, setPreferences] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load current dietary preferences on mount
    React.useEffect(() => {
        const loadPreferences = async () => {
            setLoading(true);
            try {
                const profile = await profileService.getProfile();
                setPreferences(profile.dietary_preferences || '');
            } catch (e) {
                console.log('Failed to load dietary preferences:', e);
            }
            setLoading(false);
        };
        loadPreferences();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await profileService.updateProfile({ dietary_preferences: preferences });
            alert('Dietary preferences updated!');
            router.back();
        } catch (e) {
            alert('Failed to update dietary preferences.');
        }
        setSaving(false);
    };

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
                <CustomText style={styles.headerText}>Dietary Preferences</CustomText>
                <CustomText style={styles.subHeader}>Tell us about your food preferences and restrictions</CustomText>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, marginTop: 24 }} showsVerticalScrollIndicator={false}>
                    
                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoIconBox}>
                            <Ionicons name="restaurant-outline" size={24} color="#fff" />
                        </View>
                        <CustomText style={styles.infoTitle}>Personalize Your Experience</CustomText>
                        <CustomText style={styles.infoSubtitle}>
                            Share your dietary restrictions, allergies, and preferences to get better recipe recommendations
                        </CustomText>
                    </View>

                    {/* Preferences Input Card */}
                    <View style={styles.inputCard}>
                        <CustomText style={styles.sectionLabel}>Your Dietary Preferences</CustomText>
                        <CustomText style={styles.sectionSubtitle}>
                            List allergies, preferences, and ingredients to avoid
                        </CustomText>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Gluten-free, dairy allergy, vegetarian, no nuts..."
                            placeholderTextColor="#9CA3AF"
                            value={preferences}
                            onChangeText={setPreferences}
                            multiline
                            numberOfLines={8}
                            textAlignVertical="top"
                            editable={!loading && !saving}
                        />
                    </View>

                    {/* Save Button */}
                    <View style={styles.saveContainer}>
                        <TouchableOpacity 
                            style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]} 
                            onPress={handleSave} 
                            disabled={saving || loading}
                            activeOpacity={0.92}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <CustomText style={styles.saveButtonText}>Save Preferences</CustomText>
                                </>
                            )}
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
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginHorizontal: 18,
        marginBottom: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    infoIconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#B6E2D3',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        textAlign: 'center',
        marginBottom: 8,
    },
    infoSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 20,
    },
    inputCard: {
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
    sectionLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginBottom: 6,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 20,
        lineHeight: 20,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 16,
        color: '#222',
        fontWeight: '500',
        minHeight: 140,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        textAlignVertical: 'top',
    },
    saveContainer: {
        paddingHorizontal: 18,
    },
    saveButton: {
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
    saveButtonDisabled: {
        backgroundColor: '#9CA3AF',
        shadowOpacity: 0.1,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
}); 