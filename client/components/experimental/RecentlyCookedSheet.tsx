import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText';

const CARD_COLORS = ['#CDEFE3', '#E2E2F9', '#FFF7D1', '#D6ECFB'];
const CARD_ICON_BG = ['#E6F6F0', '#F0F0FB', '#FFFBE7', '#EAF6FE'];
const CARD_WIDTH = (Dimensions.get('window').width - 18 * 2 - 16) / 2;

interface RecentlyCookedSheetProps {
  recipes: any[];
  router: any;
  onClose: () => void;
}

export default function RecentlyCookedSheet({ recipes, router, onClose }: RecentlyCookedSheetProps) {
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const cardColor = CARD_COLORS[index % CARD_COLORS.length];
    const iconBg = CARD_ICON_BG[index % CARD_ICON_BG.length];
    return (
      <TouchableOpacity
        key={item.id || index}
        style={[styles.card, { backgroundColor: cardColor }]}
        activeOpacity={0.88}
        onPress={() => router.push({ 
          pathname: '/recipe-detail', 
          params: { 
            id: item.id,
            fromRecentlyCooked: '1'
          } 
        })}
      >
        <View style={[styles.cardImageWrapper, { backgroundColor: iconBg }]}> 
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
          ) : (
            <Ionicons name="fast-food-outline" size={32} color="#B0B0B0" />
          )}
        </View>
        <CustomText style={styles.cardTitle} numberOfLines={2}>{item.title || 'No name'}</CustomText>
        {/* Ingredients pill below title */}
        <View style={styles.metaPillWrapper}>
          <View style={styles.metaPill}>
            <Ionicons name="list-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
            <CustomText style={styles.metaPillText}>{Array.isArray(item.ingredients) ? item.ingredients.length : 0} ingredients</CustomText>
          </View>
        </View>
        {/* Time pill below ingredients */}
        <View style={styles.metaPillWrapper}>
          <View style={styles.metaPill}>
            <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
            <CustomText style={styles.metaPillText}>{item.time || '—'}</CustomText>
          </View>
        </View>
        <Ionicons
          name={'heart-outline'}
          size={22}
          color={'#B0B0B0'}
          style={styles.cardHeart}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={24} color="#6B7280" />
      </TouchableOpacity>
      
      <View style={styles.headerContainer}>
        <CustomText style={styles.headerTitle}>Recently Cooked</CustomText>
        <CustomText style={styles.headerSubtitle}>Your latest creations, at a glance</CustomText>
      </View>
      {(!recipes || recipes.length === 0) ? (
        <CustomText style={styles.emptyText}>No recently cooked recipes yet.</CustomText>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderItem}
          keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 60,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#B0B0B0',
    fontSize: 17,
    marginTop: 32,
  },
  gridContent: {
    paddingHorizontal: 18,
    paddingBottom: 100, // Increased to ensure last card is visible above tab bar
    paddingTop: 0,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    marginTop: 4,
    backgroundColor: '#fff',
    minHeight: 200,
  },
  cardImageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: 4, // Remove to keep inside card
    // marginTop: 2, // Remove to keep inside card
    marginTop: 8, // Add a little space below title
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginHorizontal: 3,
    // marginTop: 2, // Remove to keep inside card
  },
  metaPillText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardHeart: {
    position: 'absolute',
    top: 18,
    right: 18,
  },
  topMetaWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  bottomMetaWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  metaPillWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
}); 