import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import CustomText from '../components/CustomText';
import * as ImagePicker from 'expo-image-picker';

const MAX_IMAGES = 10;

export default function AddRecipePhotoScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
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
            allowsMultipleSelection: true,
            selectionLimit: MAX_IMAGES,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const newUris = result.assets.map((a) => a.uri);
            setSelectedImages((prev) => {
                const combined = [...prev, ...newUris].slice(0, MAX_IMAGES);
                return combined;
            });
        }
    };

    const takePhoto = async () => {
        const hasPermission = await requestCameraPermissions();
        if (!hasPermission) return;

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImages((prev) => {
                const next = [...prev, result.assets[0].uri];
                return next.length <= MAX_IMAGES ? next : next.slice(0, MAX_IMAGES);
            });
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    };

    const processImagesWithAI = async () => {
        if (selectedImages.length === 0) return;

        setProcessing(true);
        try {
            const formData = new FormData();
            selectedImages.forEach((uri, i) => {
                formData.append('images', {
                    uri,
                    type: 'image/jpeg',
                    name: `recipe-${i}.jpg`,
                } as any);
            });

            const response = await fetch('https://familycooksclean.onrender.com/ai/extract-recipe', {
                method: 'POST',
                body: formData,
            });

            const responseText = await response.text();

            if (!response.ok) {
                let errorMessage = 'Failed to process image';
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    if (responseText.startsWith('<') || response.status >= 502) {
                        errorMessage = 'The recipe service is temporarily unavailable. Please try again in a moment.';
                    }
                }
                throw new Error(errorMessage);
            }

            let recipeData: any;
            try {
                recipeData = JSON.parse(responseText);
            } catch {
                throw new Error('The server returned an unexpected response. Please try again.');
            }

            router.push({
                pathname: '/add-recipe-manual',
                params: {
                    extractedTitle: recipeData.title || '',
                    extractedIngredients: JSON.stringify(recipeData.ingredients || []),
                    extractedSteps: JSON.stringify(recipeData.steps || []),
                    extractedTime: recipeData.cookTime || '',
                    extractedServings: recipeData.servings || '',
                    extractedTags: JSON.stringify(recipeData.tags || []),
                },
            });
        } catch (error: any) {
            console.error('Error processing image:', error);
            Alert.alert(
                'Processing Error',
                error.message || 'Failed to extract recipe details. Please try again or add the recipe manually.',
                [
                    { text: 'Try Again', onPress: () => setProcessing(false) },
                    { text: 'Add Manually', onPress: () => router.push('/add-recipe-manual') },
                ]
            );
        } finally {
            setProcessing(false);
        }
    };

    const hasImages = selectedImages.length > 0;
    const canAddMore = selectedImages.length < MAX_IMAGES;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={26} color="#222" />
                    </TouchableOpacity>
                    <CustomText style={styles.logoText}>🍳</CustomText>
                    <View style={{ flex: 1 }} />
                </View>
                <CustomText style={styles.headerText}>Add Recipe from Photo</CustomText>
                <CustomText style={styles.subHeader}>
                    {hasImages
                        ? `${selectedImages.length} image${selectedImages.length === 1 ? '' : 's'} selected (e.g. front & back of card)`
                        : 'Take or select photos of your recipe'}
                </CustomText>
            </View>

            <View style={styles.content}>
                {!hasImages ? (
                    <View style={styles.selectionContainer}>
                        <View style={styles.optionCard}>
                            <TouchableOpacity style={styles.photoOption} onPress={takePhoto} activeOpacity={0.92}>
                                <View style={styles.optionIcon}>
                                    <Ionicons name="camera" size={32} color="#6DA98C" />
                                </View>
                                <CustomText style={styles.optionTitle}>Take Photo</CustomText>
                                <CustomText style={styles.optionDescription}>
                                    Capture the recipe (you can add more after)
                                </CustomText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionCard}>
                            <TouchableOpacity style={styles.photoOption} onPress={selectFromGallery} activeOpacity={0.92}>
                                <View style={styles.optionIcon}>
                                    <Ionicons name="images" size={32} color="#6DA98C" />
                                </View>
                                <CustomText style={styles.optionTitle}>Choose from Gallery</CustomText>
                                <CustomText style={styles.optionDescription}>
                                    Select one or multiple photos (e.g. front and back)
                                </CustomText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tipsSection}>
                            <CustomText style={styles.tipsTitle}>📸 Tips for best results:</CustomText>
                            <CustomText style={styles.tipsText}>
                                • Use multiple images for front and back of a recipe card{'\n'}
                                • Ensure good lighting{'\n'}
                                • Keep the recipe text clear and readable{'\n'}
                                • Avoid shadows or glare
                            </CustomText>
                        </View>
                    </View>
                ) : (
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.previewScrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.thumbnailGrid}>
                            {selectedImages.map((uri, index) => (
                                <View key={`${uri}-${index}`} style={styles.thumbnailWrapper}>
                                    <Image source={{ uri }} style={styles.thumbnail} />
                                    <TouchableOpacity
                                        style={styles.removeThumbnail}
                                        onPress={() => removeImage(index)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close-circle" size={28} color="#EF4444" />
                                    </TouchableOpacity>
                                    {selectedImages.length > 1 && (
                                        <View style={styles.thumbnailLabel}>
                                            <CustomText style={styles.thumbnailLabelText}>{index + 1}</CustomText>
                                        </View>
                                    )}
                                </View>
                            ))}
                            {canAddMore && (
                                <View style={styles.addMoreRow}>
                                    <TouchableOpacity style={styles.addMoreCard} onPress={takePhoto} activeOpacity={0.92}>
                                        <Ionicons name="camera" size={28} color="#6DA98C" />
                                        <CustomText style={styles.addMoreText}>Add photo</CustomText>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.addMoreCard} onPress={selectFromGallery} activeOpacity={0.92}>
                                        <Ionicons name="images" size={28} color="#6DA98C" />
                                        <CustomText style={styles.addMoreText}>Add from gallery</CustomText>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.processButton}
                                onPress={processImagesWithAI}
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
                                onPress={() => setSelectedImages([])}
                                activeOpacity={0.92}
                            >
                                <Ionicons name="refresh" size={20} color="#6DA98C" />
                                <CustomText style={styles.retakeButtonText}>Start over</CustomText>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
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
    scrollView: {
        flex: 1,
    },
    previewScrollContent: {
        paddingBottom: 32,
    },
    thumbnailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    thumbnailWrapper: {
        width: '47%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#E5E7EB',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeThumbnail: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 14,
    },
    thumbnailLabel: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    thumbnailLabelText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    addMoreRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    addMoreCard: {
        flex: 1,
        aspectRatio: 1,
        maxHeight: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#6DA98C',
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addMoreText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6DA98C',
        marginTop: 6,
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
