import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, runOnJS, useAnimatedGestureHandler } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomText from '../CustomText';
import { Portal } from 'react-native-paper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type OriginRect = { x: number; y: number; width: number; height: number };

type ContextualSheetProps = {
  visible: boolean;
  onClose: () => void;
  origin: OriginRect | null;
  children: React.ReactNode;
};

const TAB_BAR_HEIGHT = 64;

export default function ContextualSheet({ visible, onClose, origin, children }: ContextualSheetProps) {
  const progress = useSharedValue(0); // 0 = origin, 1 = full screen
  const translateY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const [showBackButton, setShowBackButton] = useState(false);

  console.log('ContextualSheet children:', children);

  useEffect(() => {
    if (visible && origin) {
      progress.value = 0;
      translateY.value = 0;
      progress.value = withTiming(1, { duration: 420 }, (finished) => {
        if (finished) runOnJS(setShowBackButton)(true);
      });
    } else {
      setShowBackButton(false);
      progress.value = withTiming(0, { duration: 320 }, (finished) => {
        if (finished && onClose) runOnJS(onClose)();
      });
    }
  }, [visible, origin]);

  // Animate from origin to full screen
  const animatedSheetStyle = useAnimatedStyle(() => {
    if (!origin) return { opacity: 0 };
    const top = interpolate(progress.value, [0, 1], [origin.y, 0]);
    const left = interpolate(progress.value, [0, 1], [origin.x, 0]);
    const w = interpolate(progress.value, [0, 1], [origin.width, SCREEN_WIDTH]);
    const h = interpolate(progress.value, [0, 1], [origin.height, SCREEN_HEIGHT]);
    // When fully open, no border radius for a true full-screen look
    const borderRadius = interpolate(progress.value, [0, 1], [24, 0]);
    return {
      position: 'absolute',
      top,
      left,
      width: w,
      height: h,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      borderBottomLeftRadius: interpolate(progress.value, [0, 1], [24, 0]),
      borderBottomRightRadius: interpolate(progress.value, [0, 1], [24, 0]),
      backgroundColor: '#fff',
      overflow: 'hidden',
      zIndex: 1001,
    };
  });

  // Dim background
  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.22]),
    backgroundColor: 'rgba(30,30,40,1)',
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  }));

  // Pan gesture for swipe-to-dismiss (Reanimated v2+)
  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      if (event.translationY > 120) {
        progress.value = withTiming(0, { duration: 220 }, (finished) => {
          if (finished && onClose) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Add this handler inside the ContextualSheet component
  const handleBackPress = () => {
    setShowBackButton(false);
    progress.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished && onClose) runOnJS(onClose)();
    });
  };

  if (!visible || !origin) return null;

  return (
    <>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={animatedBgStyle} />
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[animatedSheetStyle, animatedContentStyle]}>
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flex: 1, backgroundColor: '#F8F8FC' }}
          >
            <View style={{ flex: 1 }}>{children}</View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#F3F0FF',
    borderRadius: 0,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
}); 