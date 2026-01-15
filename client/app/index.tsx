import React, { useEffect, useState } from 'react';
import LoginScreen from './screens/Auth/LoginScreen';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, View } from 'react-native';
import * as Linking from 'expo-linking';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout;

        // Handle OAuth redirects from deep links
        const handleDeepLink = async (url: string) => {
            if (!mounted) return;
            
            // Parse the URL to check if it's an OAuth callback
            const parsedUrl = Linking.parse(url);
            
            // Check if this is an OAuth callback (Supabase adds these params)
            if (parsedUrl.queryParams?.access_token || parsedUrl.queryParams?.code || parsedUrl.path?.includes('auth/callback')) {
                // Wait a moment for Supabase to process the session
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user && mounted) {
                    router.replace('/(tabs)');
                    setLoading(false);
                    return true;
                }
            }
            return false;
        };

        // Check for initial URL (app opened via deep link)
        Linking.getInitialURL().then(async (url) => {
            if (url) {
                const handled = await handleDeepLink(url);
                if (handled) return;
            }
        });

        // Listen for deep links while app is running
        const subscription = Linking.addEventListener('url', async (event) => {
            await handleDeepLink(event.url);
        });

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
            subscription.remove();
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