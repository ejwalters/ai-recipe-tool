import React, { useEffect, useState } from 'react';
import LoginScreen from './screens/Auth/LoginScreen';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout;

        // Set a timeout to ensure we don't hang forever
        timeoutId = setTimeout(() => {
            if (mounted) {
                console.log('Session check timeout - showing login screen');
                setLoading(false);
            }
        }, 1000);

        // Check for existing session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                clearTimeout(timeoutId);
                if (!mounted) return;
                
                if (session?.user) {
                    router.replace('/(tabs)');
                }
                setLoading(false);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                console.error('Session check error:', error);
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5F3EC' }}>
                <ActivityIndicator size="large" color="#256D85" />
            </View>
        );
    }

    return <LoginScreen />;
} 