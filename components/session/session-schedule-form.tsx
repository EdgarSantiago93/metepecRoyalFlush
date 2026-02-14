import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { SeasonHostOrder, User } from '@/types';

type InitialValues = {
  hostUserId: string;
  scheduledFor?: string | null;
  location?: string | null;
};

type Props = {
  hostOrder: SeasonHostOrder[];
  users: User[];
  initialValues?: InitialValues;
  submitLabel: string;
  onSubmit: (data: { hostUserId: string; scheduledFor?: string; location?: string }) => Promise<void>;
  onCancel: () => void;
};

export function SessionScheduleForm({
  hostOrder,
  users,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [selectedHost, setSelectedHost] = useState<string | null>(
    initialValues?.hostUserId ?? null,
  );
  const [scheduledFor, setScheduledFor] = useState(initialValues?.scheduledFor ?? '');
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [submitting, setSubmitting] = useState(false);

  const sortedHosts = [...hostOrder].sort((a, b) => a.sortIndex - b.sortIndex);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const handleSubmit = async () => {
    if (!selectedHost || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        hostUserId: selectedHost,
        scheduledFor: scheduledFor.trim() || undefined,
        location: location.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      <ScrollView className="flex-1 px-6" contentContainerClassName="py-6">
        {/* Host picker */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Host (required)
          </Text>
          <Text className="mb-3 text-sm text-sand-500 dark:text-sand-400">
            Select who will host the session. Sorted by host rotation order.
          </Text>

          {sortedHosts.map((ho, index) => {
            const user = userMap.get(ho.userId);
            if (!user) return null;
            const isSelected = selectedHost === user.id;
            return (
              <Pressable
                key={user.id}
                className={`mb-2 flex-row items-center rounded-lg border px-4 py-3 ${
                  isSelected
                    ? 'border-felt-600 bg-felt-50 dark:border-felt-400 dark:bg-felt-900/30'
                    : 'border-sand-200 bg-sand-50 dark:border-sand-700 dark:bg-sand-800'
                }`}
                onPress={() => setSelectedHost(user.id)}
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
                  <Text className="text-xs text-sand-500 dark:text-sand-400">
                    #{index + 1} in rotation
                  </Text>
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

        {/* Date/Time */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Date / Time (optional)
          </Text>
          <TextInput
            className="rounded-lg border border-sand-300 bg-sand-100 px-4 py-3 text-base text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
            placeholder='e.g. "Saturday 8pm"'
            placeholderTextColor="#b5ac9e"
            value={scheduledFor}
            onChangeText={setScheduledFor}
            editable={!submitting}
          />
        </View>

        {/* Location */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Location (optional)
          </Text>
          <TextInput
            className="rounded-lg border border-sand-300 bg-sand-100 px-4 py-3 text-base text-sand-950 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-50"
            placeholder="e.g. Miguel's place"
            placeholderTextColor="#b5ac9e"
            value={location}
            onChangeText={setLocation}
            editable={!submitting}
          />
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
            selectedHost && !submitting
              ? 'bg-gold-500 active:bg-gold-600'
              : 'bg-sand-300 dark:bg-sand-700'
          }`}
          onPress={handleSubmit}
          disabled={!selectedHost || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`text-base font-semibold ${
                selectedHost ? 'text-white' : 'text-sand-500 dark:text-sand-400'
              }`}
            >
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
