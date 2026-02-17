import { DevStateToggle } from '@/components/profile/dev-state-toggle';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/hooks/use-auth';
import { IconCheck, IconCreditCard, IconPencil } from '@tabler/icons-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-simple-toast';

const BANK_FIELDS: { key: 'bankingNombre' | 'bankingCuenta' | 'bankingBanco' | 'bankingClabe'; label: string }[] = [
  { key: 'bankingNombre', label: 'Nombre' },
  { key: 'bankingBanco', label: 'Banco' },
  { key: 'bankingCuenta', label: 'Cuenta' },
  { key: 'bankingClabe', label: 'CLABE' },
];

export default function ProfileScreen() {
  const auth = useAuth();
  const appState = useAppState();
  const colorScheme = useColorScheme();
  const inset = useSafeAreaInsets();
  const paddingTop = inset.top + 10;
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779'; // sand-400 / sand-500

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({
    bankingNombre: '',
    bankingCuenta: '',
    bankingBanco: '',
    bankingClabe: '',
  });

  const handleStartEdit = useCallback(() => {
    if (auth.status !== 'authenticated') return;
    setEditValues({
      bankingNombre: auth.user.bankingNombre ?? '',
      bankingCuenta: auth.user.bankingCuenta ?? '',
      bankingBanco: auth.user.bankingBanco ?? '',
      bankingClabe: auth.user.bankingClabe ?? '',
    });
    setEditing(true);
  }, [auth]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await appState.updateBankingInfo({
        bankingNombre: editValues.bankingNombre || null,
        bankingCuenta: editValues.bankingCuenta || null,
        bankingBanco: editValues.bankingBanco || null,
        bankingClabe: editValues.bankingClabe || null,
      });
      setEditing(false);
      Toast.show('Datos actualizados', Toast.SHORT);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudieron guardar los datos');
    } finally {
      setSaving(false);
    }
  }, [appState, editValues]);

  if (auth.status !== 'authenticated') {
    return null;
  }

  const { user, logout } = auth;

  const copyToClipboard = async (value: string, type: string) => {
    await Clipboard.setStringAsync(value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const buildString = () => `✅ ${type} copiad${type === 'Cuenta' || type === 'CLABE' ? 'a' : 'o'}`;
    Toast.showWithGravity(
     buildString(),
      Toast.SHORT,
      Toast.TOP,
    );
  };

  return (
    <ScrollView className="flex-1 bg-sand-50 dark:bg-sand-900" contentContainerClassName="pb-12" style={{ paddingTop }}>
      {/* Profile header — Content Section */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <View className="items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-felt-100 dark:bg-felt-900">
            <Text className="text-3xl font-sans-bold text-felt-600 dark:text-felt-300">
              {user.displayName.charAt(0)}
            </Text>
          </View>
          <Text className="text-2xl font-heading text-sand-950 dark:text-sand-50">
            {user.displayName}
          </Text>
          <Text className="mt-1 text-sm text-sand-500 dark:text-sand-400">
            {user.email}
          </Text>
          {user.isAdmin && (
            <View className="mt-2 rounded-full bg-gold-100 px-3 py-1 dark:bg-gold-900">
              <Text className="text-xs font-sans-semibold text-gold-700 dark:text-gold-300">
                Admin
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Datos de cuenta — bank info card */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <IconCreditCard size={18} color={iconColor} />
            <Text className="text-base font-sans-bold text-sand-950 dark:text-sand-50">
              Datos de cuenta
            </Text>
          </View>
          {!editing ? (
            <Pressable
              className="flex-row items-center gap-1 rounded-full bg-sand-200 px-3 py-1.5 active:bg-sand-300 dark:bg-sand-700 dark:active:bg-sand-600"
              onPress={handleStartEdit}
            >
              <IconPencil size={14} color={iconColor} />
              <Text className="text-xs font-sans-semibold text-sand-600 dark:text-sand-400">
                Editar
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row gap-2">
              <Pressable
                className="rounded-full border border-sand-300 px-3 py-1.5 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text className="text-xs font-sans-semibold text-sand-600 dark:text-sand-400">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${saving ? 'bg-gold-300 dark:bg-gold-700' : 'bg-gold-500 active:bg-gold-600'}`}
                onPress={handleSave}
                disabled={saving}
              >
                <IconCheck size={14} color="#ffffff" />
                <Text className="text-xs font-sans-semibold text-white">
                  Guardar
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View className="rounded-xl border border-sand-300 bg-sand-200 p-4 dark:border-sand-600 dark:bg-sand-700">
          {editing ? (
            // Edit mode
            BANK_FIELDS.map(({ key, label }) => (
              <View key={key} className="mb-3 last:mb-0">
                <Text className="mb-1 font-mono text-sm text-sand-600 dark:text-sand-400">{label}</Text>
                <TextInput
                  className="rounded-lg border border-sand-300 bg-white px-3 py-2 font-mono text-sm text-sand-900 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-100"
                  value={editValues[key]}
                  onChangeText={(text) => setEditValues((prev) => ({ ...prev, [key]: text }))}
                  placeholder={`Ingresa ${label.toLowerCase()}`}
                  placeholderTextColor={colorScheme === 'dark' ? '#78716c' : '#a8a29e'}
                  autoCapitalize={key === 'bankingNombre' ? 'words' : 'none'}
                  keyboardType={key === 'bankingCuenta' || key === 'bankingClabe' ? 'number-pad' : 'default'}
                />
              </View>
            ))
          ) : (
            // View mode
            BANK_FIELDS.map(({ key, label }) => {
              const value = user[key];
              const display = value?.trim() || '—';
              return (
                <Pressable
                  key={key}
                  className="mb-3 active:opacity-70 last:mb-0"
                  onPress={() => value ? copyToClipboard(value, label) : undefined}
                  disabled={!value}
                >
                  <Text className="font-mono text-sm text-sand-600 dark:text-sand-400">{label}</Text>
                  <Text className="font-mono-bold text-sm text-sand-900 dark:text-sand-100" numberOfLines={1}>
                    {display}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      {/* Cerrar sesión — Destructive pill */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <Pressable
          className="items-center rounded-full bg-red-600 py-3.5 active:bg-red-700"
          onPress={logout}
        >
          <Text className="text-sm font-sans-semibold text-white">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>

      {__DEV__ && <DevStateToggle />}
    </ScrollView>
  );
}
