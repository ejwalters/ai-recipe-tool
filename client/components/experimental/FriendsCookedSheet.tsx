import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText';

interface Friend {
  id: string;
  display_name?: string;
  avatar_url?: string;
}

interface FriendsCookedSheetProps {
  friends: Friend[];
  recipeTitle?: string;
  router: any;
  onClose: () => void;
}

export default function FriendsCookedSheet({ friends, recipeTitle, router, onClose }: FriendsCookedSheetProps) {
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
        <CustomText style={styles.friendName} numberOfLines={1}>
          {item.display_name || 'Unknown User'}
        </CustomText>
        <View style={styles.viewProfileContainer}>
          <CustomText style={styles.viewProfileText}>View Profile</CustomText>
          <Ionicons name="chevron-forward" size={16} color="#256D85" />
        </View>
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
    paddingHorizontal: 24,
    marginTop: 60,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#256D85',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
  },
  friendName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  viewProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  viewProfileText: {
    fontSize: 14,
    color: '#256D85',
    fontWeight: '600',
    marginRight: 4,
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
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
});
