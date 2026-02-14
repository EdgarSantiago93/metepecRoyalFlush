import { Pressable, Text, View } from 'react-native';
import { useAppState } from '@/hooks/use-app-state';
import type { PresetKey } from '@/data/seed-seasons';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'no_season', label: 'No Season' },
  { key: 'season_setup', label: 'Season Setup' },
  { key: 'season_active_no_session', label: 'Active (no session)' },
  { key: 'season_active_with_session', label: 'Active (with session)' },
  { key: 'season_ended', label: 'Season Ended' },
];

function statusToPreset(status: string, hasSession: boolean): PresetKey {
  if (status === 'no_season') return 'no_season';
  if (status === 'season_setup') return 'season_setup';
  if (status === 'season_active') return hasSession ? 'season_active_with_session' : 'season_active_no_session';
  if (status === 'season_ended') return 'season_ended';
  return 'no_season';
}

export function DevStateToggle() {
  const appState = useAppState();

  const currentPreset =
    appState.status === 'loading' || appState.status === 'error'
      ? null
      : statusToPreset(
          appState.status,
          appState.status === 'season_active' ? appState.session !== null : false,
        );

  return (
    <View className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
      <Text className="mb-1 text-sm font-bold text-orange-600 dark:text-orange-400">
        Dev Tools
      </Text>
      <Text className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Switch app state preset
      </Text>

      {PRESETS.map(({ key, label }) => {
        const isActive = currentPreset === key;
        return (
          <Pressable
            key={key}
            className={`mb-2 rounded-lg border px-4 py-2.5 ${
              isActive
                ? 'border-orange-500 bg-orange-50 dark:border-orange-400 dark:bg-orange-900/30'
                : 'border-gray-200 bg-white active:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700'
            }`}
            onPress={() => appState._devSetPreset(key)}
            disabled={appState.status === 'loading'}
          >
            <Text
              className={`text-sm font-medium ${
                isActive
                  ? 'text-orange-700 dark:text-orange-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
