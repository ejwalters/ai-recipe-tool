import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Animated, Dimensions, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText';
import * as Animatable from 'react-native-animatable';

const { height, width } = Dimensions.get('window');

type RecentlyCookedModalProps = {
  visible: boolean;
  onClose: () => void;
  recipes: any[];
  router: any;
};

export default function RecentlyCookedModal({ visible, onClose, recipes, router }: RecentlyCookedModalProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 7,
        speed: 16,
      }).start();
      // Debug: log recipes when modal opens
      console.log('RecentlyCookedModal recipes:', recipes);
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setShouldRender(false));
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 1000,
          backgroundColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(0,0,0,0)', 'rgba(30,30,40,0.22)']
          }),
          justifyContent: 'flex-end',
        },
      ]}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) },
            ],
            opacity: anim,
          },
        ]}
      >
        {/* Drag indicator */}
        <View style={styles.dragIndicator} />
        {/* Floating Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={22} color="#6DA98C" />
        </TouchableOpacity>
        <CustomText style={styles.headerTitle}>Recently Cooked</CustomText>
        <CustomText style={styles.headerSubtitle}>Your latest creations, at a glance</CustomText>
        {(!recipes || recipes.length === 0) ? (
          <CustomText style={styles.emptyText}>No recently cooked recipes yet.</CustomText>
        ) : (
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
            {recipes.map((recipe: any, idx: number) => (
              <Animatable.View
                key={recipe.id || idx}
                animation={{
                  from: { opacity: 0, translateY: 20 },
                  to: { opacity: 1, translateY: 0 },
                }}
                duration={400}
                delay={idx * 100}
                easing="ease-out"
                useNativeDriver
                style={{ width: '100%' }}
              >
                <TouchableOpacity
                  style={[styles.recipeRow, { width: '100%' }]}
                  activeOpacity={0.88}
                  onPress={() => router.push({ pathname: '/recipe-detail', params: { id: recipe.id } })}
                >
                  {/* Image/Icon */}
                  <View style={styles.recipeListImageWrapper}>
                    {recipe.image_url ? (
                      <Image source={{ uri: recipe.image_url }} style={styles.recipeListImage} />
                    ) : (
                      <Ionicons name="fast-food-outline" size={26} color="#B0B0B0" />
                    )}
                  </View>
                  {/* Title & Data */}
                  <View style={styles.recipeListTextCol}>
                    <CustomText style={styles.recipeListTitle} numberOfLines={1}>{recipe.title || 'No name'}</CustomText>
                    <View style={styles.recipeListMetaRow}>
                      <CustomText style={styles.recipeListMeta} numberOfLines={1}>
                        {Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0} ingredients
                      </CustomText>
                      <CustomText style={styles.recipeListMeta} numberOfLines={1}>
                        • {recipe.time || '—'}
                      </CustomText>
                    </View>
                  </View>
                  {/* Favorite Icon */}
                  <Ionicons
                    name={'heart-outline'}
                    size={22}
                    color={'#B0B0B0'}
                    style={styles.recipeListHeart}
                  />
                </TouchableOpacity>
              </Animatable.View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    minHeight: height * 0.48,
    maxHeight: height * 0.92,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
  },
  dragIndicator: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 24,
    backgroundColor: '#F3F0FF',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#B0B0B0',
    fontSize: 17,
    marginTop: 32,
  },
  listContainer: {
    paddingBottom: 12,
    paddingTop: 2,
    width: '100%',
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    borderRadius: 16,
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    width: '100%',
  },
  recipeListImageWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E6E6F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recipeListImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  recipeListTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  recipeListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  recipeListMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recipeListMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  recipeListHeart: {
    marginLeft: 16,
  },
}); 