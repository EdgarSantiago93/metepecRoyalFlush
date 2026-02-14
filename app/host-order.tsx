import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';
import { api } from '@/services/api/client';

// NOTE: Drag-and-drop via react-native-reanimated-dnd requires a dev build
// (Expo Go ships worklets 0.5.x; the Reanimated v4-compatible fork needs >=0.6.1).
// Using arrow buttons for now; switch to Sortable once on a dev build.

type HostItem = {
  id: string;
  userId: string;
  name: string;
};

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

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleRandomize = useCallback(() => {
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
    setSaving(true);
    try {
      await api.saveHostOrder({
        seasonId: season.id,
        userIds: items.map((i) => i.userId),
      });
      router.back();
    } catch (e) {
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
        Tap arrows to reorder hosts
      </Text>

      {/* Host list */}
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8">
        {items.map((item, index) => (
          <View
            key={item.id}
            className="mb-2 flex-row items-center rounded-lg border border-sand-200 bg-sand-100 px-3 py-2.5 dark:border-sand-700 dark:bg-sand-800"
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
            <View className="flex-row gap-1">
              <Pressable
                className={`h-8 w-8 items-center justify-center rounded-md ${
                  index === 0
                    ? 'bg-sand-100 dark:bg-sand-800'
                    : 'bg-sand-200 active:bg-sand-300 dark:bg-sand-600 dark:active:bg-sand-500'
                }`}
                onPress={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <Text className={`text-sm font-bold ${index === 0 ? 'text-sand-300 dark:text-sand-700' : 'text-sand-600 dark:text-sand-300'}`}>
                  ▲
                </Text>
              </Pressable>
              <Pressable
                className={`h-8 w-8 items-center justify-center rounded-md ${
                  index === items.length - 1
                    ? 'bg-sand-100 dark:bg-sand-800'
                    : 'bg-sand-200 active:bg-sand-300 dark:bg-sand-600 dark:active:bg-sand-500'
                }`}
                onPress={() => handleMoveDown(index)}
                disabled={index === items.length - 1}
              >
                <Text className={`text-sm font-bold ${index === items.length - 1 ? 'text-sand-300 dark:text-sand-700' : 'text-sand-600 dark:text-sand-300'}`}>
                  ▼
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
