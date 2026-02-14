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
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      <View className="border-b border-sand-200 px-6 pb-4 pt-16 dark:border-sand-700">
        <Text className="text-2xl font-bold text-sand-950 dark:text-sand-50">
          Create Season
        </Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="py-6">
        {/* Season Name */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Season Name (optional)
          </Text>
          <TextInput
            className="rounded-lg border border-sand-300 bg-sand-100 px-4 py-3 text-base text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
            placeholder="e.g. Season Feb 2026"
            placeholderTextColor="#b5ac9e"
            value={seasonName}
            onChangeText={setSeasonName}
            editable={!submitting}
          />
        </View>

        {/* Treasurer Picker */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Treasurer (required)
          </Text>
          <Text className="mb-3 text-sm text-sand-500 dark:text-sand-400">
            Select who will manage deposits and session approvals.
          </Text>

          {users.map((user) => {
            const isSelected = selectedTreasurer === user.id;
            return (
              <Pressable
                key={user.id}
                className={`mb-2 flex-row items-center rounded-lg border px-4 py-3 ${
                  isSelected
                    ? 'border-felt-600 bg-felt-50 dark:border-felt-400 dark:bg-felt-900/30'
                    : 'border-sand-200 bg-sand-50 dark:border-sand-700 dark:bg-sand-800'
                }`}
                onPress={() => setSelectedTreasurer(user.id)}
                disabled={submitting}
              >
                <View
                  className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                    isSelected
                      ? 'bg-felt-600'
                      : 'bg-sand-200 dark:bg-sand-600'
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
                  {user.isAdmin && (
                    <Text className="text-xs text-gold-600 dark:text-gold-400">Admin</Text>
                  )}
                </View>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? 'border-felt-600 bg-felt-600'
                      : 'border-sand-300 dark:border-sand-500'
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
      <View className="flex-row gap-3 border-t border-sand-200 px-6 py-4 dark:border-sand-700">
        <Pressable
          className="flex-1 items-center rounded-lg border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
          onPress={onCancel}
          disabled={submitting}
        >
          <Text className="text-base font-semibold text-sand-700 dark:text-sand-300">
            Cancel
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-lg py-3 ${
            selectedTreasurer && !submitting
              ? 'bg-gold-500 active:bg-gold-600'
              : 'bg-sand-300 dark:bg-sand-700'
          }`}
          onPress={handleSubmit}
          disabled={!selectedTreasurer || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`text-base font-semibold ${
                selectedTreasurer ? 'text-white' : 'text-sand-500 dark:text-sand-400'
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
