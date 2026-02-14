import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useAppState } from '@/hooks/use-app-state';

export default function SeasonSettingsScreen() {
  const auth = useAuth();
  const appState = useAppState();
  const router = useRouter();

  const currentUser = auth.status === 'authenticated' ? auth.user : null;
  const isAdmin = currentUser?.isAdmin === true;
  const season = appState.status === 'season_setup' ? appState.season : null;
  const users = appState.status === 'season_setup' ? appState.users : [];

  const [selectedTreasurer, setSelectedTreasurer] = useState<string>(
    season?.treasurerUserId ?? '',
  );
  const [saving, setSaving] = useState(false);

  const hasChanged = selectedTreasurer !== season?.treasurerUserId;

  const handleSave = useCallback(async () => {
    if (!hasChanged || saving) return;
    setSaving(true);
    try {
      await appState.updateTreasurer(selectedTreasurer);
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update treasurer');
    } finally {
      setSaving(false);
    }
  }, [hasChanged, saving, appState, selectedTreasurer, router]);

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <Text className="mb-2 text-xl font-bold text-sand-950 dark:text-sand-50">
          Admin Only
        </Text>
        <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
          Only admins can change season settings.
        </Text>
        <Pressable
          className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (season?.status !== 'setup') {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <Text className="mb-2 text-xl font-bold text-sand-950 dark:text-sand-50">
          Not Available
        </Text>
        <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
          Settings can only be changed during season setup.
        </Text>
        <Pressable
          className="rounded-lg bg-gold-500 px-6 py-3 active:bg-gold-600"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      <ScrollView className="flex-1 px-6" contentContainerClassName="py-6">
        <Text className="mb-1 text-lg font-bold text-sand-950 dark:text-sand-50">
          Change Treasurer
        </Text>
        <Text className="mb-4 text-sm text-sand-500 dark:text-sand-400">
          Select who will manage deposits and session approvals for this season.
        </Text>

        {users.map((user) => {
          const isSelected = selectedTreasurer === user.id;
          const isCurrent = user.id === season.treasurerUserId;

          return (
            <Pressable
              key={user.id}
              className={`mb-2 flex-row items-center rounded-lg border px-4 py-3 ${
                isSelected
                  ? 'border-felt-600 bg-felt-50 dark:border-felt-400 dark:bg-felt-900/30'
                  : 'border-sand-200 bg-sand-50 dark:border-sand-700 dark:bg-sand-800'
              }`}
              onPress={() => setSelectedTreasurer(user.id)}
              disabled={saving}
            >
              <View
                className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                  isSelected ? 'bg-felt-600' : 'bg-sand-200 dark:bg-sand-600'
                }`}
              >
                <Text
                  className={`text-lg font-bold ${
                    isSelected ? 'text-white' : 'text-sand-600 dark:text-sand-300'
                  }`}
                >
                  {user.displayName.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className={`text-base font-medium ${
                    isSelected
                      ? 'text-felt-700 dark:text-felt-300'
                      : 'text-sand-950 dark:text-sand-50'
                  }`}
                >
                  {user.displayName}
                </Text>
                <View className="flex-row gap-2">
                  {user.isAdmin && (
                    <Text className="text-xs text-gold-600 dark:text-gold-400">Admin</Text>
                  )}
                  {isCurrent && (
                    <Text className="text-xs text-felt-600 dark:text-felt-400">
                      Current treasurer
                    </Text>
                  )}
                </View>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isSelected
                    ? 'border-felt-600 bg-felt-600'
                    : 'border-sand-300 dark:border-sand-500'
                }`}
              >
                {isSelected && <View className="h-2 w-2 rounded-full bg-white" />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom save button */}
      <View className="border-t border-sand-200 px-6 py-4 dark:border-sand-700">
        <Pressable
          className={`items-center rounded-lg py-3 ${
            hasChanged && !saving
              ? 'bg-gold-500 active:bg-gold-600'
              : 'bg-sand-300 dark:bg-sand-700'
          }`}
          onPress={handleSave}
          disabled={!hasChanged || saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`text-base font-semibold ${
                hasChanged ? 'text-white' : 'text-sand-500 dark:text-sand-400'
              }`}
            >
              Save Changes
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
