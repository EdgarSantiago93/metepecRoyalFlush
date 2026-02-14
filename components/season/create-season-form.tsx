import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { User } from '@/types';

type Props = {
  users: User[];
  onSubmit: (treasurerUserId: string, name?: string) => Promise<void>;
  onCancel: () => void;
};

export function CreateSeasonForm({ users, onSubmit, onCancel }: Props) {
  const [selectedTreasurer, setSelectedTreasurer] = useState<string | null>(null);
  const [seasonName, setSeasonName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedTreasurer || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedTreasurer, seasonName.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <View className="border-b border-gray-200 px-6 pb-4 pt-16 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Season
        </Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="py-6">
        {/* Season Name */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Season Name (optional)
          </Text>
          <TextInput
            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="e.g. Season Feb 2026"
            placeholderTextColor="#9CA3AF"
            value={seasonName}
            onChangeText={setSeasonName}
            editable={!submitting}
          />
        </View>

        {/* Treasurer Picker */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Treasurer (required)
          </Text>
          <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Select who will manage deposits and session approvals.
          </Text>

          {users.map((user) => {
            const isSelected = selectedTreasurer === user.id;
            return (
              <Pressable
                key={user.id}
                className={`mb-2 flex-row items-center rounded-lg border px-4 py-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
                onPress={() => setSelectedTreasurer(user.id)}
                disabled={submitting}
              >
                <View
                  className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                    isSelected
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <Text
                    className={`text-lg font-bold ${
                      isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {user.displayName.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base font-medium ${
                      isSelected
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {user.displayName}
                  </Text>
                  {user.isAdmin && (
                    <Text className="text-xs text-amber-600 dark:text-amber-400">Admin</Text>
                  )}
                </View>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {isSelected && (
                    <View className="h-2 w-2 rounded-full bg-white" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="flex-row gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <Pressable
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 active:bg-gray-100 dark:border-gray-600 dark:active:bg-gray-800"
          onPress={onCancel}
          disabled={submitting}
        >
          <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
            Cancel
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-lg py-3 ${
            selectedTreasurer && !submitting
              ? 'bg-blue-600 active:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700'
          }`}
          onPress={handleSubmit}
          disabled={!selectedTreasurer || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`text-base font-semibold ${
                selectedTreasurer ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Create
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
