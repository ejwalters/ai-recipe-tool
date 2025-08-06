import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import * as ImagePicker from 'expo-image-picker';

export default function AddRecipePhotoScreen() {
    const router = useRouter();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera roll permissions to select photos.');
            return false;
        }
        return true;
    };

    const requestCameraPermissions = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
            return false;
        }
        return true;
    };

    const selectFromGallery = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const hasPermission = await requestCameraPermissions();
        if (!hasPermission) return;

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const processImageWithAI = async () => {
        if (!selectedImage) return;

        setProcessing(true);
        try {
            // Create form data for image upload
            const formData = new FormData();
            formData.append('image', {
                uri: selectedImage,
                type: 'image/jpeg',
                name: 'recipe.jpg',
            } as any);

            // Call AI endpoint to extract recipe details
            const response = await fetch('https://familycooksclean.onrender.com/ai/extract-recipe', {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - let the browser set it with boundary
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process image');
            }

            const recipeData = await response.json();
            
            // Navigate to manual form with extracted data
            router.push({
                pathname: '/add-recipe-manual',
                params: {
                    extractedTitle: recipeData.title || '',
                    extractedIngredients: JSON.stringify(recipeData.ingredients || []),
                    extractedSteps: JSON.stringify(recipeData.steps || []),
                    extractedTime: recipeData.cookTime || '',
                    extractedServings: recipeData.servings || '',
                    extractedTags: JSON.stringify(recipeData.tags || []),
                }
            });

        } catch (error: any) {
            console.error('Error processing image:', error);
            Alert.alert(
                'Processing Error', 
                error.message || 'Failed to extract recipe details. Please try again or add the recipe manually.',
                [
                    { text: 'Try Again', onPress: () => setProcessing(false) },
                    { text: 'Add Manually', onPress: () => router.push('/add-recipe-manual') }
                ]
            );
        } finally {
            setProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={26} color="#222" />
                    </TouchableOpacity>
                    <CustomText style={styles.logoText}>🍳</CustomText>
                    <View style={{ flex: 1 }} />
                </View>
                <CustomText style={styles.headerText}>Add Recipe from Photo</CustomText>
                <CustomText style={styles.subHeader}>Take or select a photo of your recipe</CustomText>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {!selectedImage ? (
                    <View style={styles.selectionContainer}>
                        <View style={styles.optionCard}>
                            <TouchableOpacity style={styles.photoOption} onPress={takePhoto} activeOpacity={0.92}>
                                <View style={styles.optionIcon}>
                                    <Ionicons name="camera" size={32} color="#6DA98C" />
                                </View>
                                <CustomText style={styles.optionTitle}>Take Photo</CustomText>
                                <CustomText style={styles.optionDescription}>Use your camera to capture the recipe</CustomText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionCard}>
                            <TouchableOpacity style={styles.photoOption} onPress={selectFromGallery} activeOpacity={0.92}>
                                <View style={styles.optionIcon}>
                                    <Ionicons name="images" size={32} color="#6DA98C" />
                                </View>
                                <CustomText style={styles.optionTitle}>Choose from Gallery</CustomText>
                                <CustomText style={styles.optionDescription}>Select an existing photo of your recipe</CustomText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tipsSection}>
                            <CustomText style={styles.tipsTitle}>📸 Tips for best results:</CustomText>
                            <CustomText style={styles.tipsText}>
                            • Ensure good lighting{'\n'}
                            • Keep the recipe text clear and readable{'\n'}
                            • Avoid shadows or glare{'\n'}
                            • Make sure all text is visible in the frame
                            </CustomText>
                        </View>
                    </View>
                ) : (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                        
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={styles.processButton} 
                                onPress={processImageWithAI}
                                disabled={processing}
                                activeOpacity={0.92}
                            >
                                {processing ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="sparkles" size={20} color="#fff" />
                                        <CustomText style={styles.processButtonText}>Extract Recipe Details</CustomText>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.retakeButton} 
                                onPress={() => setSelectedImage(null)}
                                activeOpacity={0.92}
                            >
                                <Ionicons name="refresh" size={20} color="#6DA98C" />
                                <CustomText style={styles.retakeButtonText}>Take Different Photo</CustomText>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7FA',
    },
    header: {
        backgroundColor: '#F3F0FF',
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    backButton: {
        marginRight: 8,
        padding: 4,
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
    content: {
        flex: 1,
        paddingHorizontal: 18,
        paddingTop: 24,
    },
    selectionContainer: {
        flex: 1,
    },
    optionCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    photoOption: {
        alignItems: 'center',
    },
    optionIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    optionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        marginBottom: 8,
        textAlign: 'center',
    },
    optionDescription: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    tipsSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginBottom: 12,
    },
    tipsText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    previewContainer: {
        flex: 1,
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        marginBottom: 24,
    },
    actionButtons: {
        width: '100%',
        gap: 12,
    },
    processButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6DA98C',
        borderRadius: 16,
        paddingVertical: 16,
        shadowColor: '#6DA98C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    processButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        borderRadius: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    retakeButtonText: {
        color: '#6DA98C',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
}); 