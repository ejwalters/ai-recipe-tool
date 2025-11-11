import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
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
            quality: 1, // get the best quality, we'll compress after
        });
        if (!result.canceled && result.assets[0]) {
            setLoading(true);
            try {
                // Resize and compress the image before upload
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
            setLoading(false);
        }
    };

    const hasChanges =
        name !== initialProfile.name ||
        email !== initialProfile.email ||
        phone !== initialProfile.phone ||
        avatarUrl !== initialProfile.avatar_url;
    const isDisabled = !hasChanges || saving || loading;

    const handleSave = async () => {
        if (!hasChanges) {
            return;
        }
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
                <CustomText style={styles.headerText}>Edit Profile</CustomText>
                <CustomText style={styles.subHeader}>Update your personal information</CustomText>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, marginTop: 24 }} showsVerticalScrollIndicator={false}>
                    
                    {/* Profile Image Section */}
                    <View style={styles.imageCard}>
                        <View style={styles.imageContainer}>
                            <TouchableOpacity onPress={pickImage} disabled={loading}>
                                <Image
                                    source={
                                        avatarUrl
                                            ? { uri: avatarUrl }
                                            : require('../assets/images/avatar.png')
                                    }
                                    style={styles.profileImage}
                                />
                                {loading && (
                                    <View style={styles.imageOverlay}>
                                        <ActivityIndicator size="small" color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        <CustomText style={styles.changePhoto}>Change Photo</CustomText>
                        <CustomText style={styles.changePhotoSub}>Add or change your photo to personalize your experience</CustomText>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <CustomText style={styles.sectionLabel}>Name</CustomText>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your name"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <CustomText style={styles.sectionLabel}>Email Address</CustomText>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <CustomText style={styles.sectionLabel}>Phone</CustomText>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your phone number"
                                placeholderTextColor="#9CA3AF"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <View style={styles.saveContainer}>
                        <TouchableOpacity 
                            style={[
                                styles.saveButton,
                                hasChanges ? styles.saveButtonActive : styles.saveButtonInactive,
                                (saving || loading) && styles.saveButtonLoading,
                            ]} 
                            onPress={handleSave}
                            disabled={isDisabled}
                            activeOpacity={0.92}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <CustomText style={styles.saveButtonText}>Save Changes</CustomText>
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
    imageCard: {
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
    imageContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#D1E7DD',
        marginBottom: 8,
    },
    changePhoto: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        textAlign: 'center',
        marginBottom: 4,
    },
    changePhotoSub: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    formContainer: {
        paddingHorizontal: 18,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 16,
        color: '#222',
        fontWeight: '500',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    saveContainer: {
        paddingHorizontal: 18,
    },
    saveButton: {
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        backgroundColor: '#D1D5DB',
    },
    saveButtonInactive: {
        backgroundColor: '#D1D5DB',
        shadowColor: '#D1D5DB',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    saveButtonActive: {
        backgroundColor: '#34D399',
        shadowColor: '#34D399',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonLoading: {
        opacity: 0.85,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 