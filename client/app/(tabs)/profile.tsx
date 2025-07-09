import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../../components/CustomText';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { profileService } from '../../lib/profileService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = React.useState<{ avatar_url?: string; name?: string; email?: string } | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const profileData = await profileService.getProfile();
                console.log('Profile data loaded:', profileData);
                setProfile(profileData);
            } catch (e) {
                console.log('Profile load error:', e);
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Sign Out Failed', error.message);
        } else {
            router.replace('/screens/Auth/LoginScreen');
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F0FF' }} edges={['top']}>
            {/* Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <CustomText style={styles.logoText}>👤</CustomText>
                    <View style={{ flex: 1 }} />
                </View>
                <CustomText style={styles.headerText}>Profile</CustomText>
                <CustomText style={styles.subHeader}>Manage your account settings</CustomText>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, marginTop: 24 }} showsVerticalScrollIndicator={false}>
                    {/* Profile Info Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.profileInfo}>
                            <Image
                                source={
                                    profile?.avatar_url
                                        ? { uri: profile.avatar_url }
                                        : require('../../assets/images/avatar.png')
                                }
                                style={styles.avatar}
                            />
                            <View style={styles.profileTextContainer}>
                                {loading ? (
                                    <>
                                        <CustomText style={styles.name}>Loading...</CustomText>
                                        <CustomText style={styles.email}>Loading...</CustomText>
                                    </>
                                ) : (
                                    <>
                                        <CustomText style={styles.name}>{profile?.name || 'No name set'}</CustomText>
                                        <CustomText style={styles.email}>{profile?.email || 'No email set'}</CustomText>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Settings Cards */}
                    <View style={styles.settingsContainer}>
                        <TouchableOpacity style={styles.settingCard} onPress={() => router.push('/edit-profile')} activeOpacity={0.92}>
                            <View style={styles.settingIconBox}>
                                <Image source={require('../../assets/images/profile.png')} style={styles.settingIcon} />
                            </View>
                            <View style={styles.settingContent}>
                                <CustomText style={styles.settingTitle}>Personal Information</CustomText>
                                <CustomText style={styles.settingSubtitle}>Update your name and email</CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingCard} onPress={() => router.push('/dietary-preferences')} activeOpacity={0.92}>
                            <View style={[styles.settingIconBox, styles.iconBoxGreen]}>
                                <Image source={require('../../assets/images/fork-knife.png')} style={styles.settingIcon} />
                            </View>
                            <View style={styles.settingContent}>
                                <CustomText style={styles.settingTitle}>Dietary Information</CustomText>
                                <CustomText style={styles.settingSubtitle}>Set your food preferences</CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.chevron} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingCard} onPress={() => router.push('/subscription')} activeOpacity={0.92}>
                            <View style={[styles.settingIconBox, styles.iconBoxPurple]}>
                                <Image source={require('../../assets/images/splash-icon.png')} style={styles.settingIcon} />
                            </View>
                            <View style={styles.settingContent}>
                                <CustomText style={styles.settingTitle}>Plan Information</CustomText>
                                <CustomText style={styles.settingSubtitle}>Manage your subscription</CustomText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.chevron} />
                        </TouchableOpacity>
                    </View>

                    {/* Sign Out Button */}
                    <View style={styles.signOutContainer}>
                        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.92}>
                            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <CustomText style={styles.signOutButtonText}>Sign Out</CustomText>
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
    logoText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#222',
        letterSpacing: 0.5,
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
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginHorizontal: 18,
        marginBottom: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
        backgroundColor: '#D1E7DD',
    },
    profileTextContainer: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        marginBottom: 4,
    },
    email: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
    },
    settingsContainer: {
        paddingHorizontal: 18,
        marginBottom: 24,
    },
    settingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 1,
    },
    settingIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#B6E2D3',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    iconBoxGreen: {
        backgroundColor: '#B6E2D3',
    },
    iconBoxPurple: {
        backgroundColor: '#D6D6F7',
    },
    settingIcon: {
        width: 24,
        height: 24,
        tintColor: '#fff',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 8,
    },
    signOutContainer: {
        paddingHorizontal: 18,
    },
    signOutButton: {
        backgroundColor: '#FF385C',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        shadowColor: '#FF385C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    signOutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
}); 