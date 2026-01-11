import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import CustomText from '../../../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { profileService } from '../../../lib/profileService';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const SignUpScreen = () => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
    const [usernameError, setUsernameError] = useState<string>('');
    const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    // Real-time username validation
    useEffect(() => {
        // Clear any existing timeout
        if (usernameCheckTimeoutRef.current) {
            clearTimeout(usernameCheckTimeoutRef.current);
        }

        const trimmedUsername = username.trim();
        
        // Reset status if username is empty
        if (!trimmedUsername) {
            setUsernameStatus('idle');
            setUsernameError('');
            return;
        }

        // Validate format first
        const usernamePattern = /^[a-z0-9_]+$/i;
        if (!usernamePattern.test(trimmedUsername)) {
            setUsernameStatus('invalid');
            setUsernameError('Letters, numbers, and underscores only');
            return;
        }

        // Check minimum length
        if (trimmedUsername.length < 3) {
            setUsernameStatus('invalid');
            setUsernameError('Username must be at least 3 characters');
            return;
        }

        // Debounce the availability check (wait 500ms after user stops typing)
        setUsernameStatus('checking');
        setUsernameError('');

        usernameCheckTimeoutRef.current = setTimeout(async () => {
            const normalizedUsername = trimmedUsername.toLowerCase();
            
            try {
                const API_BASE_URL = 'https://familycooksclean.onrender.com';
                const url = `${API_BASE_URL}/profiles/check-username?username=${encodeURIComponent(normalizedUsername)}`;
                console.log('[usernameCheck] Fetching:', url);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }).catch((fetchError) => {
                    console.error('[usernameCheck] Fetch error:', fetchError);
                    throw fetchError;
                });
                
                console.log('[usernameCheck] Response status:', response?.status);
                
                if (!response || !response.ok) {
                    const errorText = response ? await response.text().catch(() => 'No error text') : 'No response';
                    console.error('[usernameCheck] Response error:', response?.status, errorText);
                    throw new Error(`Failed to check username: ${response?.status || 'Network error'} ${errorText}`);
                }

                const result = await response.json().catch((jsonError) => {
                    console.error('[usernameCheck] JSON parse error:', jsonError);
                    throw new Error('Invalid response from server');
                });
                
                console.log('[usernameCheck] Result:', result);

                if (result.available === false) {
                    setUsernameStatus('taken');
                    setUsernameError('This username is already taken');
                } else {
                    setUsernameStatus('available');
                    setUsernameError('');
                }
            } catch (error) {
                console.error('[usernameCheck] Unexpected error:', error);
                console.error('[usernameCheck] Error details:', error?.message, error?.stack);
                // Don't reset status on error - keep current state
                // setUsernameStatus('idle');
                // setUsernameError('');
            }
        }, 500);

        // Cleanup function
        return () => {
            if (usernameCheckTimeoutRef.current) {
                clearTimeout(usernameCheckTimeoutRef.current);
            }
        };
    }, [username]);

    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera roll permissions to select photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            try {
                // Resize and compress the image
                const manipResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 512, height: 512 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                setAvatarUri(manipResult.uri);
            } catch (error) {
                Alert.alert('Error', 'Failed to process image');
            }
        }
    };

    const handleCreateAccount = async () => {
        const trimmedName = fullName.trim();
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName || !trimmedUsername || !trimmedEmail || !password) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
            return;
        }

        const usernamePattern = /^[a-z0-9_]+$/i;
        if (!usernamePattern.test(trimmedUsername)) {
            Alert.alert(
                'Invalid Username',
                'Usernames can only include letters, numbers, and underscores.'
            );
            return;
        }

        // Final username validation before signup
        if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
            Alert.alert('Invalid Username', usernameError || 'Please choose a valid and available username.');
            return;
        }

        // If still checking, wait a moment
        if (usernameStatus === 'checking') {
            Alert.alert('Please wait', 'Still checking username availability...');
            return;
        }

        // Double-check username is available (in case status was reset)
        const normalizedUsername = trimmedUsername.toLowerCase();
        try {
            const API_BASE_URL = 'https://familycooksclean.onrender.com';
            const response = await fetch(`${API_BASE_URL}/profiles/check-username?username=${encodeURIComponent(normalizedUsername)}`);
            
            if (!response.ok) {
                throw new Error('Failed to check username');
            }

            const result = await response.json();

            if (result.available === false) {
                setUsernameStatus('taken');
                setUsernameError('This username is already taken');
                Alert.alert('Username Unavailable', 'That username is already taken. Please choose another.');
                return;
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to check username availability. Please try again.');
            console.error('[auth.signUp] username availability check failed', error);
            return;
        }

        setUploading(true);

        try {
            // Create auth account
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: trimmedEmail,
                password,
                options: {
                    data: {
                        full_name: trimmedName,
                        name: trimmedName,
                        display_name: trimmedName,
                        username: normalizedUsername,
                    }
                }
            });

            if (signUpError) {
                Alert.alert('Sign Up Failed', signUpError.message);
                console.error('[auth.signUp] failed', signUpError);
                setUploading(false);
                return;
            }

            if (!authData.user) {
                Alert.alert('Sign Up Failed', 'Failed to create account. Please try again.');
                setUploading(false);
                return;
            }

            // Upload avatar if one was selected
            if (avatarUri) {
                try {
                    const avatarUrl = await profileService.uploadAvatar(avatarUri);
                    // Update profile with avatar URL
                    await profileService.updateProfile({ avatar_url: avatarUrl });
                } catch (avatarError) {
                    console.error('[auth.signUp] avatar upload failed', avatarError);
                    // Don't block signup if avatar upload fails
                    Alert.alert('Notice', 'Account created successfully, but avatar upload failed. You can update it later in your profile.');
                }
            }

            Alert.alert('Success', 'Account created successfully!', [
                {
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)'),
                },
            ]);
        } catch (error) {
            Alert.alert('Sign Up Failed', 'An unexpected error occurred. Please try again.');
            console.error('[auth.signUp] unexpected error', error);
            setUploading(false);
        }
    };

    const handleGoBack = () => {
        router.replace('/');
    };

    const handleGoToLogin = () => {
        router.replace('/');
    };

    return (
        <View style={styles.gradient}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Back Button */}
                        <TouchableOpacity
                            onPress={handleGoBack}
                            style={styles.backButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>

                        {/* App Icon with Badge */}
                        <View style={styles.iconContainer}>
                            <View style={styles.appIcon}>
                                <Image
                                    source={require('../../../assets/images/icon.png')}
                                    style={styles.iconImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.badge}>
                                    <Ionicons name="leaf" size={12} color="#FFFFFF" />
                                </View>
                            </View>
                        </View>

                        {/* Welcome Message */}
                        <View style={styles.headerContainer}>
                            <CustomText style={styles.welcomeText}>Create Account</CustomText>
                            <CustomText style={styles.tagline}>
                                Sign up to start your culinary journey.
                            </CustomText>
                        </View>

                        {/* Sign Up Form */}
                        <View style={styles.formContainer}>
                            {/* Avatar Selection */}
                            <View style={styles.avatarContainer}>
                                <TouchableOpacity
                                    onPress={pickAvatar}
                                    style={styles.avatarButton}
                                    activeOpacity={0.8}
                                >
                                    {avatarUri ? (
                                        <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="camera-outline" size={32} color="#6B7280" />
                                            <CustomText style={styles.avatarPlaceholderText}>
                                                Add Photo
                                            </CustomText>
                                        </View>
                                    )}
                                    <View style={styles.avatarEditBadge}>
                                        <Ionicons name="pencil" size={12} color="#FFFFFF" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Full Name Field */}
                            <View style={styles.inputGroup}>
                                <CustomText style={styles.inputLabel}>FULL NAME</CustomText>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="John Doe"
                                        placeholderTextColor="#9CA3AF"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        autoCapitalize="words"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>

                            {/* Username Field */}
                            <View style={styles.inputGroup}>
                                <View style={styles.usernameLabelRow}>
                                    <CustomText style={styles.inputLabel}>USERNAME</CustomText>
                                    {usernameStatus === 'checking' && (
                                        <ActivityIndicator size="small" color="#256D85" style={styles.usernameStatusIcon} />
                                    )}
                                    {usernameStatus === 'available' && (
                                        <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.usernameStatusIcon} />
                                    )}
                                    {usernameStatus === 'taken' && (
                                        <Ionicons name="close-circle" size={18} color="#EF4444" style={styles.usernameStatusIcon} />
                                    )}
                                    {usernameStatus === 'invalid' && (
                                        <Ionicons name="alert-circle" size={18} color="#EF4444" style={styles.usernameStatusIcon} />
                                    )}
                                </View>
                                <View style={[
                                    styles.inputWrapper,
                                    usernameStatus === 'taken' && styles.inputWrapperError,
                                    usernameStatus === 'invalid' && styles.inputWrapperError,
                                    usernameStatus === 'available' && styles.inputWrapperSuccess,
                                ]}>
                                    <Ionicons 
                                        name="at-outline" 
                                        size={20} 
                                        color={
                                            usernameStatus === 'taken' || usernameStatus === 'invalid' ? '#EF4444' :
                                            usernameStatus === 'available' ? '#10B981' : '#6B7280'
                                        } 
                                        style={styles.inputIcon} 
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="johndoe"
                                        placeholderTextColor="#9CA3AF"
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                                {usernameError ? (
                                    <CustomText style={styles.errorText}>
                                        {usernameError}
                                    </CustomText>
                                ) : usernameStatus === 'available' ? (
                                    <CustomText style={styles.successText}>
                                        Username is available ✓
                                    </CustomText>
                                ) : (
                                    <CustomText style={styles.helperText}>
                                        Letters, numbers, and underscores only
                                    </CustomText>
                                )}
                            </View>

                            {/* Email Address Field */}
                            <View style={styles.inputGroup}>
                                <CustomText style={styles.inputLabel}>EMAIL ADDRESS</CustomText>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="name@example.com"
                                        placeholderTextColor="#9CA3AF"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>

                            {/* Password Field */}
                            <View style={styles.inputGroup}>
                                <CustomText style={styles.inputLabel}>PASSWORD</CustomText>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, styles.passwordInput]}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#9CA3AF"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                            size={20}
                                            color="#6B7280"
                                        />
                                    </TouchableOpacity>
                                </View>
                                <CustomText style={styles.helperText}>
                                    Must be at least 6 characters
                                </CustomText>
                            </View>

                            {/* Create Account Button */}
                            <TouchableOpacity
                                style={[
                                    styles.createAccountButton,
                                    (uploading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.createAccountButtonDisabled
                                ]}
                                onPress={handleCreateAccount}
                                activeOpacity={0.85}
                                disabled={uploading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <CustomText style={styles.createAccountButtonText}>Create Account</CustomText>
                                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Separator */}
                            <View style={styles.separatorContainer}>
                                <View style={styles.separatorLine} />
                                <CustomText style={styles.separatorText}>Or continue with</CustomText>
                                <View style={styles.separatorLine} />
                            </View>

                            {/* Social Login Buttons */}
                            <View style={styles.socialButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.socialButton}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        // TODO: Implement Google sign in
                                        Alert.alert('Google Sign In', 'Google sign in coming soon!');
                                    }}
                                >
                                    <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.socialIconIonicons} />
                                    <CustomText style={styles.socialButtonText}>Google</CustomText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.socialButton}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        // TODO: Implement Apple sign in
                                        Alert.alert('Apple Sign In', 'Apple sign in coming soon!');
                                    }}
                                >
                                    <Ionicons name="logo-apple" size={20} color="#000000" style={styles.socialIconIonicons} />
                                    <CustomText style={styles.socialButtonText}>Apple</CustomText>
                                </TouchableOpacity>
                            </View>

                            {/* Login Link */}
                            <View style={styles.loginLinkContainer}>
                                <CustomText style={styles.loginLinkText}>
                                    Already have an account?
                                </CustomText>
                                <TouchableOpacity onPress={handleGoToLogin} activeOpacity={0.7}>
                                    <CustomText style={styles.loginLink}>Log In</CustomText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        backgroundColor: '#E5F3EC', // Light green background matching app theme
    },
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 32,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 24,
        zIndex: 10,
        padding: 4,
    },
    iconContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 32,
    },
    appIcon: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
    },
    iconImage: {
        width: 70,
        height: 70,
    },
    badge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#256D85',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    formContainer: {
        width: '100%',
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    avatarImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    avatarPlaceholderText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#256D85',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    usernameLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    usernameStatusIcon: {
        marginLeft: 8,
    },
    helperText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
        marginLeft: 4,
    },
    errorText: {
        fontSize: 11,
        color: '#EF4444',
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500',
    },
    successText: {
        fontSize: 11,
        color: '#10B981',
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        height: 52,
    },
    inputWrapperError: {
        borderColor: '#EF4444',
    },
    inputWrapperSuccess: {
        borderColor: '#10B981',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        paddingVertical: 0,
    },
    passwordInput: {
        paddingRight: 8,
    },
    eyeIcon: {
        padding: 4,
    },
    createAccountButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#256D85',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        flexDirection: 'row',
        shadowColor: '#256D85',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    createAccountButtonDisabled: {
        opacity: 0.7,
    },
    createAccountButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    buttonIcon: {
        marginLeft: 4,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    separatorText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginHorizontal: 16,
        fontWeight: '400',
    },
    socialButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    socialButton: {
        flex: 1,
        height: 52,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    socialIconIonicons: {
        marginRight: 0,
    },
    socialButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1F2937',
    },
    loginLinkContainer: {
        alignItems: 'center',
        gap: 4,
    },
    loginLinkText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    loginLink: {
        fontSize: 14,
        color: '#256D85',
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default SignUpScreen;
