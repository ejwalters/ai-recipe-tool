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
} from 'react-native';
import { useRouter } from 'expo-router';
import CustomText from '../../../components/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';

const SignUpScreen = () => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleCreateAccount = async () => {
        const trimmedName = fullName.trim();
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName || !trimmedUsername || !trimmedEmail || !password) {
            Alert.alert('Missing Information', 'Please fill in all fields to continue.');
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

        const normalizedUsername = trimmedUsername.toLowerCase();

        const { count: existingUsernameCount, error: usernameCheckError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('username', normalizedUsername);

        if (usernameCheckError) {
            Alert.alert('Sign Up Failed', 'Unable to verify username availability. Please try again.');
            console.error('[auth.signUp] username availability check failed', usernameCheckError);
            return;
        }

        if ((existingUsernameCount ?? 0) > 0) {
            Alert.alert('Username Unavailable', 'That username is already taken. Please choose another.');
            return;
        }

        const { error } = await supabase.auth.signUp({ 
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
        if (error) {
            Alert.alert('Sign Up Failed', error.message);
            console.error('[auth.signUp] failed', error);
        } else {
            router.replace('/(tabs)');
        }
    };

    const handleGoBack = () => {
        router.replace('/');
    };

    const handleGoToLogin = () => {
        console.log('Going to login');
        router.replace('/');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F1F6F9' }}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => { console.log('Back arrow pressed'); handleGoToLogin(); }} style={styles.backButton} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                            <Ionicons name="arrow-back" size={28} color="#444" />
                        </TouchableOpacity>
                        <CustomText style={styles.headerTitle}>Create Account</CustomText>
                    </View>
                    <View style={styles.formContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#666"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                            autoCorrect={false}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#666"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={styles.createAccountButton}
                            onPress={handleCreateAccount}
                            activeOpacity={0.8}
                        >
                            <CustomText style={styles.createAccountButtonText}>Create Account</CustomText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.loginLinkContainer}
                            onPress={handleGoToLogin}
                            activeOpacity={0.7}
                        >
                            <CustomText style={styles.loginLinkText}>
                                Already have an account? Log In
                            </CustomText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F6F9',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        marginBottom: 32,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 4,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#444',
        textAlign: 'center',
        flex: 1,
    },
    formContainer: {
        width: '100%',
        maxWidth: 350,
        alignSelf: 'center',
        alignItems: 'center',
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 20,
        marginBottom: 16,
        fontSize: 16,
        // borderWidth: 1,
        // borderColor: '#E0E0E0',
    },
    createAccountButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#6DA98C',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    createAccountButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    loginLinkContainer: {
        marginTop: 32,
        alignItems: 'center',
    },
    loginLinkText: {
        color: '#444',
        fontSize: 15,
        textAlign: 'center',
    },
});

export default SignUpScreen; 