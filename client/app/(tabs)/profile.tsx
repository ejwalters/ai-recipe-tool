import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
                setProfile(profileData);
            } catch (e) {
                console.log('Profile load error:', e);
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    async function handleSignOut() {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();
                        if (error) {
                            Alert.alert('Sign Out Failed', error.message);
                        } else {
                            router.replace('/screens/Auth/LoginScreen');
                        }
                    },
                },
            ]
        );
    }

    const userName = profile?.name || 'Guest';
    const userEmail = profile?.email || '';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Hero */}
                <View style={styles.heroSection}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarRing}>
                            <Image
                                source={
                                    profile?.avatar_url
                                        ? { uri: profile.avatar_url }
                                        : require('../../assets/images/avatar.png')
                                }
                                style={styles.avatar}
                            />
                        </View>
                        {loading ? (
                            <CustomText style={styles.userName}>Loading...</CustomText>
                        ) : (
                            <>
                                <CustomText style={styles.userName}>{userName}</CustomText>
                                {userEmail ? (
                                    <CustomText style={styles.userEmail} numberOfLines={1}>{userEmail}</CustomText>
                                ) : null}
                            </>
                        )}
                    </View>
                </View>

                {/* Settings Card */}
                <View style={styles.settingsCard}>
                    <CustomText style={styles.settingsLabel}>Account</CustomText>

                    <TouchableOpacity
                        style={[styles.menuRow, styles.menuRowFirst]}
                        onPress={() => router.push('/edit-profile')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="person-outline" size={22} color="#2E7D32" />
                        </View>
                        <View style={styles.menuText}>
                            <CustomText style={styles.menuTitle}>Personal Information</CustomText>
                            <CustomText style={styles.menuSubtitle}>Name and email</CustomText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuRow}
                        onPress={() => router.push('/dietary-preferences')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="restaurant-outline" size={22} color="#E65100" />
                        </View>
                        <View style={styles.menuText}>
                            <CustomText style={styles.menuTitle}>Dietary Preferences</CustomText>
                            <CustomText style={styles.menuSubtitle}>Allergies, diets, and preferences</CustomText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={[styles.menuRow, styles.menuRowLast]}
                        onPress={() => router.push('/subscription')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#E8EAF6' }]}>
                            <Ionicons name="card-outline" size={22} color="#3949AB" />
                        </View>
                        <View style={styles.menuText}>
                            <CustomText style={styles.menuTitle}>Plan & Subscription</CustomText>
                            <CustomText style={styles.menuSubtitle}>Manage your plan</CustomText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color="#6B7280" style={styles.signOutIcon} />
                    <CustomText style={styles.signOutText}>Sign Out</CustomText>
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
        paddingTop: 12,
        paddingHorizontal: 20,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 24,
    },
    avatarWrapper: {
        alignItems: 'center',
    },
    avatarRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F0FF',
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#E8E0F0',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
        textAlign: 'center',
    },
    userEmail: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
    },
    settingsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 4,
        paddingVertical: 8,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden',
    },
    settingsLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 16,
        marginBottom: 12,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    menuRowFirst: {
        paddingTop: 4,
    },
    menuRowLast: {
        paddingBottom: 4,
    },
    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuText: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 70,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
    },
    signOutIcon: {
        marginRight: 8,
    },
    signOutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    bottomSpacer: {
        height: 32,
    },
});
