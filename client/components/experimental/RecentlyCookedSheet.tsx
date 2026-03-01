import React from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomText from '../CustomText';
import { getRecipeIconConfig } from '../../utils/recipeIcons';

interface RecentlyCookedSheetProps {
  recipes: any[];
  router: any;
  onClose: () => void;
}

export default function RecentlyCookedSheet({ recipes, router, onClose }: RecentlyCookedSheetProps) {
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const iconConfig = getRecipeIconConfig(item.title || '', item.tags || [], index, item);
    return (
      <TouchableOpacity
        key={item.id || index}
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push({ 
          pathname: '/recipe-detail', 
          params: { 
            id: item.id,
            fromRecentlyCooked: '1'
          } 
        })}
      >
        <View style={[styles.iconSquare, { backgroundColor: iconConfig.backgroundColor }]}>
          {iconConfig.library === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons name={iconConfig.name as any} size={28} color={iconConfig.iconColor} />
          ) : (
            <Ionicons name={iconConfig.name as any} size={28} color={iconConfig.iconColor} />
          )}
        </View>
        <View style={styles.cardContent}>
          <CustomText style={styles.cardTitle} numberOfLines={2}>{item.title || 'Untitled Recipe'}</CustomText>
          <View style={styles.metaRow}>
            {item.time && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <CustomText style={styles.metaText}>{item.time} min</CustomText>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="list-outline" size={14} color="#6B7280" />
              <CustomText style={styles.metaText}>{Array.isArray(item.ingredients) ? item.ingredients.length : 0} ingredients</CustomText>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
          contentContainerStyle={styles.listContent}
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconSquare: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
}); 