import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { profileService } from '../lib/profileService';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileState = {
    name: string;
    email: string;
    phone: string;
    avatar_url: string;
};

export default function EditProfileScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [initialProfile, setInitialProfile] = useState<ProfileState>({
        name: '',
        email: '',
        phone: '',
        avatar_url: '',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const profile = await profileService.getProfile();
            const currentProfile: ProfileState = {
                name: profile.name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                avatar_url: profile.avatar_url || '',
            };
            setName(currentProfile.name);
            setEmail(currentProfile.email);
            setPhone(currentProfile.phone);
            setAvatarUrl(currentProfile.avatar_url);
            setInitialProfile(currentProfile);
        } catch (e) {
            console.log('Profile load error:', e);
            Alert.alert('Error', 'Failed to load profile');
        }
        setLoading(false);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled && result.assets[0]) {
            setUploadingAvatar(true);
            try {
                const manipResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 512, height: 512 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                const uploadedUrl = await profileService.uploadAvatar(manipResult.uri);
                setAvatarUrl(uploadedUrl);
                Alert.alert('Success', 'Profile photo updated!');
            } catch {
                Alert.alert('Error', 'Failed to upload image');
            }
            setUploadingAvatar(false);
        }
    };

    const hasChanges =
        name !== initialProfile.name ||
        email !== initialProfile.email ||
        phone !== initialProfile.phone ||
        avatarUrl !== initialProfile.avatar_url;
    const isDisabled = !hasChanges || saving || loading;

    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        try {
            const updatedProfile: ProfileState = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                avatar_url: avatarUrl,
            };
            await profileService.updateProfile(updatedProfile);
            setName(updatedProfile.name);
            setEmail(updatedProfile.email);
            setPhone(updatedProfile.phone);
            setInitialProfile(updatedProfile);
            Alert.alert('Success', 'Profile updated!');
        } catch {
            Alert.alert('Error', 'Failed to update profile');
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
                    <CustomText style={styles.headerTitle}>Edit Profile</CustomText>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Avatar Section */}
                <View style={styles.heroSection}>
                    <TouchableOpacity onPress={pickImage} disabled={uploadingAvatar} style={styles.avatarTouchable}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarRing}>
                                <Image
                                    source={avatarUrl ? { uri: avatarUrl } : require('../assets/images/avatar.png')}
                                    style={styles.avatar}
                                />
                                {uploadingAvatar && (
                                    <View style={styles.avatarOverlay}>
                                        <ActivityIndicator size="small" color="#fff" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.cameraBadge}>
                                <Ionicons name="camera" size={15} color="#fff" />
                            </View>
                        </View>
                        <CustomText style={styles.changePhotoText}>
                            {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                        </CustomText>
                    </TouchableOpacity>
                </View>

                {/* Form Card */}
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <CustomText style={styles.label}>Name</CustomText>
                        <TextInput
                            style={styles.input}
                            placeholder="Your name"
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.inputGroup}>
                        <CustomText style={styles.label}>Email</CustomText>
                        <TextInput
                            style={styles.input}
                            placeholder="your@email.com"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.inputGroup}>
                        <CustomText style={styles.label}>Phone</CustomText>
                        <TextInput
                            style={styles.input}
                            placeholder="Phone number"
                            placeholderTextColor="#9CA3AF"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            editable={!loading}
                        />
                    </View>
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
                            <CustomText style={styles.saveButtonText}>Save Changes</CustomText>
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
    heroSection: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 8,
    },
    avatarTouchable: {
        alignItems: 'center',
    },
    avatarWrapper: {
        width: 108,
        height: 108,
        marginBottom: 12,
        position: 'relative',
    },
    avatarRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F0FF',
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'absolute',
        top: 4,
        left: 4,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#E8E0F0',
    },
    avatarOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#256D85',
        justifyContent: 'center',
        alignItems: 'center',
    },
    changePhotoText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#256D85',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden',
    },
    inputGroup: {
        paddingVertical: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
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
