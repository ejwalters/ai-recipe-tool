import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6; // 60% of screen height

interface Friend {
  id: string;
  display_name?: string;
  avatar_url?: string;
}

interface FriendsBottomSheetProps {
  visible: boolean;
  friends: Friend[];
  recipeTitle?: string;
  router: any;
  onClose: () => void;
}

export default function FriendsBottomSheet({ visible, friends, recipeTitle, router, onClose }: FriendsBottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SCREEN_HEIGHT - SHEET_HEIGHT,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

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
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              opacity: opacityAnim,
            }
          ]} 
        />
      </Pressable>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <CustomText style={styles.headerTitle}>
            Friends Who Cooked
          </CustomText>
          {recipeTitle && (
            <CustomText style={styles.recipeTitle} numberOfLines={2}>
              {recipeTitle}
            </CustomText>
          )}
          <CustomText style={styles.headerSubtitle}>
            {friends.length === 1 ? '1 friend cooked this recipe' : `${friends.length} friends cooked this recipe`}
          </CustomText>
        </View>

        {/* Friends List */}
        {(!friends || friends.length === 0) ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <CustomText style={styles.emptyText}>No friends have cooked this recipe yet.</CustomText>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 1001,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#256D85',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B7280',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  viewProfileText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 16,
    fontWeight: '500',
  },
});
