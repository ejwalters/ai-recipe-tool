import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { profileService } from '../lib/profileService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DietaryPreferencesScreen() {
    const router = useRouter();
    const [preferences, setPreferences] = useState('');
    const [initialPreferences, setInitialPreferences] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        const loadPreferences = async () => {
            setLoading(true);
            try {
                const profile = await profileService.getProfile();
                const currentPreferences = profile.dietary_preferences || '';
                setPreferences(currentPreferences);
                setInitialPreferences(currentPreferences);
            } catch (e) {
                console.log('Failed to load dietary preferences:', e);
                Alert.alert('Error', 'Failed to load preferences');
            }
            setLoading(false);
        };
        loadPreferences();
    }, []);

    const hasChanges = preferences !== initialPreferences;
    const isDisabled = !hasChanges || saving || loading;

    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        try {
            await profileService.updateProfile({ dietary_preferences: preferences });
            setInitialPreferences(preferences);
            Alert.alert('Success', 'Dietary preferences updated!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to update preferences');
        }
        setSaving(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <CustomText style={styles.headerTitle}>Dietary Preferences</CustomText>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Content Card */}
                <View style={styles.formCard}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Ionicons name="restaurant-outline" size={22} color="#E65100" />
                        </View>
                        <View style={styles.infoText}>
                            <CustomText style={styles.infoTitle}>Allergies & preferences</CustomText>
                            <CustomText style={styles.infoSubtitle}>
                                List allergies, diets, and ingredients to avoid for better recipe recommendations
                            </CustomText>
                        </View>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Gluten-free, dairy allergy, vegetarian, no nuts..."
                        placeholderTextColor="#9CA3AF"
                        value={preferences}
                        onChangeText={setPreferences}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        editable={!loading && !saving}
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        hasChanges && styles.saveButtonActive,
                        isDisabled && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={isDisabled}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.saveIcon} />
                            <CustomText style={styles.saveButtonText}>Save Preferences</CustomText>
                        </>
                    )}
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
    formCard: {
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
    infoRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    infoIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF3E0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    infoText: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    infoSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        lineHeight: 20,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
        minHeight: 120,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        textAlignVertical: 'top',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#E5E7EB',
    },
    saveButtonActive: {
        backgroundColor: '#256D85',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveIcon: {
        marginRight: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    bottomSpacer: {
        height: 32,
    },
});
