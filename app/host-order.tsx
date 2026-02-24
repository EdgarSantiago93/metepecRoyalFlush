import { ButtonActivityIndicator } from '@/components/ui/button-activity-indicator';
import { Loader } from '@/components/ui/loader';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/services/api/client';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

type HostItem = {
  id: string;
  userId: string;
  name: string;
  position: number;
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
  const season =
    appState.status === 'season_setup' || appState.status === 'season_active' || appState.status === 'season_ended'
      ? appState.season
      : null;
  const users =
    appState.status === 'season_setup' || appState.status === 'season_active' || appState.status === 'season_ended'
      ? appState.users
      : [];

  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.displayName ?? 'Unknown';

  const withPositions = (list: HostItem[]) =>
    list.map((item, i) => ({ ...item, position: i + 1 }));

  useEffect(() => {
    if (!season) return;
    api.getHostOrder(season.id).then((res) => {
      setItems(
        withPositions(
          res.hostOrder.map((h) => ({
            id: h.userId,
            userId: h.userId,
            name: getUserName(h.userId),
            position: 0,
          })),
        ),
      );
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  const handleRandomize = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return withPositions(shuffled);
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
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el orden de host');
    } finally {
      setSaving(false);
    }
  }, [season, saving, items, router]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<HostItem>) => {
      return (
        <ScaleDecorator>
          <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={drag}
            disabled={isActive}
            style={[styles.row, isActive && styles.rowActive]}
            className="flex-row items-center rounded-lg border border-sand-200 bg-sand-100 px-4 dark:border-sand-700 dark:bg-sand-800"
          >
            <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-gold-100 dark:bg-gold-900">
              <Text className="text-xs font-bold text-gold-700 dark:text-gold-300">
                {item.position}
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
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [],
  );

  const keyExtractor = useCallback((item: HostItem) => item.id, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <Loader size={80} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <ScrollView className="flex-1 bg-sand-50 dark:bg-sand-900" contentContainerClassName="px-6 py-4">
        <Text className="mb-4 text-lg font-bold text-sand-950 dark:text-sand-50">
          Rotación de hosts
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
            Random
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
            <ButtonActivityIndicator />
          ) : (
            <Text className="text-sm font-semibold text-white">Guardar Orden</Text>
          )}
        </Pressable>
      </View>

      <Text className="px-6 pb-2 text-xs text-sand-500 dark:text-sand-400">
        Mantén presionado y arrastra para reordenar hosts
      </Text>

      {/* Draggable host list */}
      <DraggableFlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        onPlaceholderIndexChange={() => Haptics.selectionAsync()}
        onDragEnd={({ data }) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setItems(withPositions(data));
        }}
        contentContainerStyle={styles.listContent}
        containerStyle={styles.flex1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  row: {
    height: 56,
    marginBottom: 8,
    marginHorizontal: 24,
  },
  rowActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  listContent: {
    paddingBottom: 32,
  },
});
