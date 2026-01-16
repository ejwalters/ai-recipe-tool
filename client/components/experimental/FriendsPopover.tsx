import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HEIGHT = SCREEN_HEIGHT * 0.5; // Max 50% of screen height
const POPOVER_WIDTH = Math.min(SCREEN_WIDTH - 48, 380);

interface Friend {
  id: string;
  display_name?: string;
  avatar_url?: string;
}

interface FriendsPopoverProps {
  visible: boolean;
  friends: Friend[];
  recipeTitle?: string;
  router: any;
  onClose: () => void;
  origin: { x: number; y: number; width: number; height: number } | null;
}

export default function FriendsPopover({ visible, friends, recipeTitle, router, onClose, origin }: FriendsPopoverProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(false);

  useEffect(() => {
    if (visible && origin) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, origin]);

  if (!shouldRender || !origin) return null;

  const friendCount = friends.length;
  const itemHeight = 80; // Approximate height per friend card
  const headerHeight = 100;
  const padding = 24;
  const calculatedHeight = Math.min(MAX_HEIGHT, headerHeight + (friendCount * itemHeight) + padding * 2);

  // Calculate position - appear just above the origin point
  const popoverX = Math.max(24, Math.min(origin.x + origin.width / 2 - POPOVER_WIDTH / 2, SCREEN_WIDTH - POPOVER_WIDTH - 24));
  const popoverY = origin.y - calculatedHeight - 16; // Position just above the origin with spacing
  const finalY = Math.max(24, popoverY); // Don't go above screen top

  const renderFriend = ({ item, index }: { item: Friend; index: number }) => {
    return (
      <TouchableOpacity
        key={item.id || index}
        style={styles.friendCard}
        activeOpacity={0.88}
        onPress={() => {
          router.push({ 
            pathname: '/user-profile', 
            params: { 
              user_id: item.id
            } 
          });
          onClose();
        }}
      >
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <CustomText style={styles.avatarInitial}>
                {item.display_name?.charAt(0).toUpperCase() || '?'}
              </CustomText>
            </View>
          )}
        </View>
        <View style={styles.friendInfo}>
          <CustomText style={styles.friendName} numberOfLines={1}>
            {item.display_name || 'Unknown User'}
          </CustomText>
          <CustomText style={styles.viewProfileText}>View Profile</CustomText>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <Pressable 
        style={StyleSheet.absoluteFill} 
        onPress={onClose}
      >
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              opacity: opacityAnim,
            }
          ]} 
        />
      </Pressable>

      {/* Popover */}
      <Animated.View
        style={[
          styles.popover,
          {
            left: popoverX,
            top: finalY,
            width: POPOVER_WIDTH,
            height: calculatedHeight,
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Arrow pointing down to origin */}
        <View style={[styles.arrow, { left: origin.x + origin.width / 2 - popoverX - 8, bottom: -8 }]} />

        {/* Header */}
        <View style={styles.header}>
          <CustomText style={styles.headerTitle} numberOfLines={1}>
            Friends Who Cooked
          </CustomText>
          {recipeTitle && (
            <CustomText style={styles.recipeTitle} numberOfLines={2}>
              {recipeTitle}
            </CustomText>
          )}
          <CustomText style={styles.headerSubtitle}>
            {friendCount === 1 ? '1 friend' : `${friendCount} friends`}
          </CustomText>
        </View>

        {/* Friends List */}
        {(!friends || friends.length === 0) ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={32} color="#D1D5DB" />
            <CustomText style={styles.emptyText}>No friends yet</CustomText>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          />
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 1001,
    overflow: 'hidden',
  },
  arrow: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#256D85',
    marginBottom: 6,
    lineHeight: 20,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  viewProfileText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
});
