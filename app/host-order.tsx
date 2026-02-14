import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { api } from '@/services/api/client';

type HostItem = {
  id: string;
  userId: string;
  name: string;
};

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const TOTAL_HEIGHT = ROW_HEIGHT + ROW_GAP;

function DraggableRow({
  item,
  index,
  itemCount,
  onReorder,
}: {
  item: HostItem;
  index: number;
  itemCount: number;
  onReorder: (from: number, to: number) => void;
}) {
  const isActive = useSharedValue(false);
  const translateY = useSharedValue(0);
  const currentIndex = useRef(index);
  currentIndex.current = index;

  const hapticGrab = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const hapticMove = () => Haptics.selectionAsync();
  const hapticDrop = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      isActive.value = true;
      runOnJS(hapticGrab)();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      const offset = Math.round(e.translationY / TOTAL_HEIGHT);
      const clampedTo = Math.min(Math.max(currentIndex.current + offset, 0), itemCount - 1);
      if (clampedTo !== currentIndex.current) {
        runOnJS(hapticMove)();
        runOnJS(onReorder)(currentIndex.current, clampedTo);
      }
    })
    .onFinalize(() => {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      isActive.value = false;
      runOnJS(hapticDrop)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: isActive.value ? 100 : 0,
    shadowOpacity: withTiming(isActive.value ? 0.15 : 0, { duration: 150 }),
    shadowRadius: withTiming(isActive.value ? 10 : 0, { duration: 150 }),
    elevation: isActive.value ? 8 : 0,
    opacity: withTiming(isActive.value ? 0.95 : 1, { duration: 100 }),
    transform: [
      { translateY: translateY.value },
      { scale: withTiming(isActive.value ? 1.03 : 1, { duration: 150 }) },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            height: ROW_HEIGHT,
            marginBottom: ROW_GAP,
            marginHorizontal: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
          },
          animatedStyle,
        ]}
        className="flex-row items-center rounded-lg border border-sand-200 bg-sand-100 px-4 dark:border-sand-700 dark:bg-sand-800"
      >
        <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-gold-100 dark:bg-gold-900">
          <Text className="text-xs font-bold text-gold-700 dark:text-gold-300">
            {index + 1}
          </Text>
        </View>
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-sand-200 dark:bg-sand-600">
          <Text className="text-sm font-bold text-sand-600 dark:text-sand-300">
            {item.name.charAt(0)}
          </Text>
        </View>
        <Text className="flex-1 text-base font-medium text-sand-950 dark:text-sand-50">
          {item.name}
        </Text>
        <Text className="text-lg text-sand-400">☰</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export default function HostOrderScreen() {
  const auth = useAuth();
  const appState = useAppState();
  const router = useRouter();

  const [items, setItems] = useState<HostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isAdmin = currentUser?.isAdmin === true;
  const season = appState.status === 'season_setup' ? appState.season : null;
  const users = appState.status === 'season_setup' ? appState.users : [];

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.displayName ?? 'Unknown';

  useEffect(() => {
    if (!season) return;
    api.getHostOrder(season.id).then((res) => {
      setItems(
        res.hostOrder.map((h) => ({
          id: h.userId,
          userId: h.userId,
          name: getUserName(h.userId),
        })),
      );
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  const handleReorder = useCallback((from: number, to: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleRandomize = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!season || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);
    try {
      await api.saveHostOrder({
        seasonId: season.id,
        userIds: items.map((i) => i.userId),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save host order');
    } finally {
      setSaving(false);
    }
  }, [season, saving, items, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <ScrollView className="flex-1 bg-sand-50 dark:bg-sand-900" contentContainerClassName="px-6 py-4">
        <Text className="mb-4 text-lg font-bold text-sand-950 dark:text-sand-50">
          Host Order
        </Text>
        {items.map((item, i) => (
          <View
            key={item.id}
            className="mb-2 flex-row items-center rounded-lg border border-sand-200 bg-sand-100 px-4 py-3 dark:border-sand-700 dark:bg-sand-800"
          >
            <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-sand-200 dark:bg-sand-600">
              <Text className="text-xs font-bold text-sand-600 dark:text-sand-300">
                {i + 1}
              </Text>
            </View>
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-sand-200 dark:bg-sand-600">
              <Text className="text-lg font-bold text-sand-600 dark:text-sand-300">
                {item.name.charAt(0)}
              </Text>
            </View>
            <Text className="flex-1 text-base font-medium text-sand-950 dark:text-sand-50">
              {item.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-sand-50 dark:bg-sand-900">
        {/* Actions */}
        <View className="flex-row gap-3 px-6 py-3">
          <Pressable
            className="flex-1 items-center rounded-lg border border-sand-300 py-2.5 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
            onPress={handleRandomize}
          >
            <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
              Randomize
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-lg py-2.5 ${
              saving ? 'bg-sand-300 dark:bg-sand-700' : 'bg-gold-500 active:bg-gold-600'
            }`}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-sm font-semibold text-white">Save Order</Text>
            )}
          </Pressable>
        </View>

        <Text className="px-6 pb-2 text-xs text-sand-500 dark:text-sand-400">
          Long press and drag to reorder hosts
        </Text>

        {/* Draggable host list */}
        <ScrollView className="flex-1" contentContainerClassName="pb-8">
          {items.map((item, index) => (
            <DraggableRow
              key={item.id}
              item={item}
              index={index}
              itemCount={items.length}
              onReorder={handleReorder}
            />
          ))}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}
