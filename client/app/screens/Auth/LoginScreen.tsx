import React, { useState } from 'react';
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
} from 'react-native';
import CustomText from '../../../components/CustomText';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            Alert.alert('Login Failed', error.message);
        } else {
            router.replace('/(tabs)');
        }
    };

    const handleCreateAccount = () => {
        router.push('/screens/Auth/SignUpScreen');
    };

    const handleForgotPassword = () => {
        // TODO: Implement forgot password flow
        Alert.alert('Forgot Password', 'Password reset feature coming soon!');
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
                            <CustomText style={styles.welcomeText}>Welcome Back</CustomText>
                            <CustomText style={styles.tagline}>
                                Sign in to continue your journey towards a better lifestyle.
                            </CustomText>
                        </View>

                        {/* Login Form */}
                        <View style={styles.formContainer}>
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
                                <View style={styles.passwordLabelRow}>
                                    <CustomText style={styles.inputLabel}>PASSWORD</CustomText>
                                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                                        <CustomText style={styles.forgotLink}>Forgot?</CustomText>
                                    </TouchableOpacity>
                                </View>
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
                            </View>

                            {/* Log In Button */}
                            <TouchableOpacity
                                style={styles.loginButton}
                                onPress={handleLogin}
                                activeOpacity={0.85}
                            >
                                <CustomText style={styles.loginButtonText}>Log In</CustomText>
                                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
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

                            {/* Create Account Link */}
                            <View style={styles.createAccountContainer}>
                                <CustomText style={styles.createAccountText}>
                                    Don't have an account?
                                </CustomText>
                                <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.7}>
                                    <CustomText style={styles.createAccountLink}>Create one</CustomText>
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
        marginBottom: 40,
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
    passwordLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    forgotLink: {
        fontSize: 12,
        fontWeight: '600',
        color: '#256D85',
        letterSpacing: 0.5,
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
    loginButton: {
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
    loginButtonText: {
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
    createAccountContainer: {
        alignItems: 'center',
        gap: 4,
    },
    createAccountText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    createAccountLink: {
        fontSize: 14,
        color: '#256D85',
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default LoginScreen;
