import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { profileService } from '../lib/profileService';

export default function EditProfileScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const profile = await profileService.getProfile();
            setName(profile.name || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setAvatarUrl(profile.avatar_url || '');
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

    const handleSave = async () => {
        setSaving(true);
        try {
            await profileService.updateProfile({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                avatar_url: avatarUrl,
            });
            Alert.alert('Success', 'Profile updated!');
        } catch {
            Alert.alert('Error', 'Failed to update profile');
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
                <CustomText style={styles.headerText}>Edit Profile</CustomText>
            </View>
            {/* Profile Image */}
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
            {/* Form */}
            <CustomText style={styles.sectionLabel}>Name</CustomText>
            <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#A0A0A0"
                value={name}
                onChangeText={setName}
            />
            <CustomText style={styles.sectionLabel}>Email Address</CustomText>
            <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <CustomText style={styles.sectionLabel}>Phone</CustomText>
            <TextInput
                style={styles.input}
                placeholder="Phone"
                placeholderTextColor="#A0A0A0"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <CustomText style={styles.saveButtonText}>Save Changes</CustomText>
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
    imageContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E5E5E5',
        marginBottom: 8,
    },
    changePhoto: {
        fontSize: 20,
        fontWeight: '700',
        color: '#444',
        textAlign: 'center',
        marginBottom: 2,
    },
    changePhotoSub: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        marginBottom: 18,
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
        paddingVertical: 14,
        fontSize: 16,
        color: '#222',
        marginHorizontal: 24,
        marginBottom: 12,
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
        marginTop: 28,
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
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 