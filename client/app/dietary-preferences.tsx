import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import { profileService } from '../lib/profileService';

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
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#444" />
                </TouchableOpacity>
                <CustomText style={styles.headerText}>Dietary Preferences</CustomText>
            </View>
            <CustomText style={styles.sectionLabel}>Dietary Preferences</CustomText>
            <TextInput
                style={styles.input}
                placeholder="List allergies, preferences, and ingredients to avoid"
                placeholderTextColor="#6C757D"
                value={preferences}
                onChangeText={setPreferences}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!loading && !saving}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving || loading}>
                <CustomText style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</CustomText>
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
    sectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
        marginLeft: 32,
        marginTop: 18,
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 18,
        fontSize: 16,
        color: '#222',
        marginHorizontal: 24,
        marginBottom: 24,
        minHeight: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    saveButton: {
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
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
}); 