import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText';

const CARD_COLORS = ['#CDEFE3', '#E2E2F9', '#FFF7D1', '#D6ECFB'];
const CARD_ICON_BG = ['#E6F6F0', '#F0F0FB', '#FFFBE7', '#EAF6FE'];

const CARD_WIDTH = (Dimensions.get('window').width - 18 * 2 - 16) / 2; // padding and gap

type FavoritesProps = {
  onClose: () => void;
  recipes: any[];
  router: any;
};

export default function Favorites({ onClose, recipes, router }: FavoritesProps) {
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const cardColor = CARD_COLORS[index % CARD_COLORS.length];
    const iconBg = CARD_ICON_BG[index % CARD_ICON_BG.length];
    return (
      <TouchableOpacity
        key={item.id || index}
        style={[styles.card, { backgroundColor: cardColor }]}
        activeOpacity={0.88}
        onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
      >
        <View style={[styles.cardImageWrapper, { backgroundColor: iconBg }]}> 
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
          ) : (
            <Ionicons name="fast-food-outline" size={28} color="#B0B0B0" />
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
          name={'heart'}
          size={22}
          color={'#F87171'}
          style={styles.cardHeart}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sheetBg}>
      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={24} color="#6B7280" />
      </TouchableOpacity>
      
      <View style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
          <CustomText style={styles.headerTitle}>Favorites</CustomText>
          <CustomText style={styles.headerSubtitle}>Your saved recipes</CustomText>
        </View>
        <FlatList
          data={recipes}
          renderItem={renderItem}
          keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
  sheetBg: {
    flex: 1,
    backgroundColor: '#F8F8FC',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 60,
    marginBottom: 10,
    backgroundColor: '#F8F8FC',
  },
  headerTitle: {
    fontSize: 24,
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
    marginBottom: 10,
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
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  cardImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 40,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  cardHeart: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  metaPillWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginHorizontal: 3,
  },
  metaPillText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
}); 