import { AppTextInput } from '@/components/ui/app-text-input';
import { ButtonActivityIndicator } from '@/components/ui/button-activity-indicator';
import type { SeasonHostOrder, User } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconCheck, IconPencil, IconX } from '@tabler/icons-react-native';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

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

function parseInitialDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function defaultDate(): Date {
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  return d;
}

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    parseInitialDate(initialValues?.scheduledFor),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [submitting, setSubmitting] = useState(false);

  const sortedHosts = [...hostOrder].sort((a, b) => a.sortIndex - b.sortIndex);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const handleSubmit = async () => {
    console.log('handleSubmit', selectedHost, selectedDate, location);
    if (!selectedHost || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        hostUserId: selectedHost,
        scheduledFor: selectedDate ? selectedDate.toISOString() : undefined,
        location: location.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      <ScrollView className="flex-1 px-6" contentContainerClassName="py-6">
        {/* Date/Time */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Fecha / Hora (opcional)
          </Text>
          {selectedDate ? (
            <View className="flex-row items-center gap-2">
              <View className="flex-1 justify-center rounded-lg border border-sand-300 bg-sand-100 px-4 min-h-[56px] dark:border-sand-600 dark:bg-sand-800">
                <Text numberOfLines={1} className="font-sans-semibold text-base leading-6 text-sand-950 dark:text-sand-50">
                  {formatDate(selectedDate)}
                </Text>
              </View>
              <Pressable
                className="rounded-full border border-sand-300 px-3 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                {showDatePicker
                  ? <IconCheck size={16} color="#2a9d68" strokeWidth={3} />
                  : <IconPencil size={16} color="#c49a3c" strokeWidth={2.5} />}
              </Pressable>
              <Pressable
                className="rounded-full border border-sand-300 px-3 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
                onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}
              >
                <IconX size={16} color="#ef4444" strokeWidth={2.5} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              className="items-center rounded-xl border border-dashed border-sand-300 py-4 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
              onPress={() => {
                setSelectedDate(defaultDate());
                setShowDatePicker(true);
              }}
            >
              <Text className="text-sm font-semibold text-gold-600 dark:text-gold-400">
                Seleccionar fecha y hora
              </Text>
            </Pressable>
          )}

          {showDatePicker && (
            <View className="mt-3 items-center overflow-hidden rounded-xl border border-sand-200 bg-sand-100 pb-4 dark:border-sand-700 dark:bg-sand-800">
              <DateTimePicker
                value={selectedDate ?? defaultDate()}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_event, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
                minimumDate={new Date()}
                locale="es-MX"
                themeVariant="light"
                textColor="#333333"
                accentColor="#2a9d68"
              />
            </View>
          )}
        </View>

        {/* Location */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Ubicación (opcional)
          </Text>
          <AppTextInput
            placeholder="ej. Casa de Miguel"
            value={location}
            onChangeText={setLocation}
            editable={!submitting}
          />
        </View>

        {/* Host picker */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-sand-700 dark:text-sand-300">
            Host (requerido)
          </Text>
          <Text className="mb-3 text-sm text-sand-500 dark:text-sand-400">
            Selecciona quién será el host del juego. Ordenado por rotación de host.
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
                    #{index + 1} en rotación
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
      </ScrollView>

      {/* Bottom Actions */}
      <View className="flex-row gap-3 border-t border-sand-200 px-6 py-4 dark:border-sand-700">
        <Pressable
          className="flex-1 items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
          onPress={onCancel}
          disabled={submitting}
        >
          <Text className="text-base font-semibold text-sand-700 dark:text-sand-300">
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-full py-3.5 ${
            selectedHost && !submitting
              ? 'bg-gold-500 active:bg-gold-600'
              : 'bg-sand-300 dark:bg-sand-700'
          }`}
          onPress={handleSubmit}
          disabled={!selectedHost || submitting}
        >
          {submitting ? (
            <ButtonActivityIndicator />
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
