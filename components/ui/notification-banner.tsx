import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '@/components/ui/user-avatar';

type NotificationBannerProps = {
  title: string;
  body: string;
  senderName?: string;
  senderAvatarMediaId?: string;
  route: string;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 4000;
const SWIPE_THRESHOLD = -20;

export function NotificationBanner({
  title,
  body,
  senderName,
  senderAvatarMediaId,
  route,
  onDismiss,
}: NotificationBannerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide in on mount
  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 140 });

    timerRef.current = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    translateY.value = withTiming(-120, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  }

  function handleTap() {
    if (timerRef.current) clearTimeout(timerRef.current);
    translateY.value = withTiming(-120, { duration: 200 }, () => {
      runOnJS(onDismiss)();
      runOnJS(router.push)(route as never);
    });
  }

  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      if (e.translationY < SWIPE_THRESHOLD) {
        translateY.value = withTiming(-120, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 9999,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <Pressable onPress={handleTap}>
          <View className="flex-row items-center gap-3 rounded-2xl bg-sand-50 p-4 shadow-lg dark:bg-sand-800"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <UserAvatar
              displayName={senderName ?? 'N'}
              avatarMediaId={senderAvatarMediaId}
              size={32}
            />
            <View className="flex-1">
              <Text
                className="font-inter-semibold text-sm text-sand-900 dark:text-sand-100"
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                className="font-inter text-xs text-sand-600 dark:text-sand-400"
                numberOfLines={2}
              >
                {body}
              </Text>
            </View>
          </View>
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}
