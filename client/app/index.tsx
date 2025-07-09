import React, { useEffect, useState } from 'react';
import LoginScreen from './screens/Auth/LoginScreen';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                router.replace('/(tabs)');
            }
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F6F9' }}>
                <ActivityIndicator size="large" color="#6DA98C" />
            </View>
        );
    }

    return <LoginScreen />;
} 