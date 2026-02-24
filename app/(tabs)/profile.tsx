import { DevStateToggle } from '@/components/profile/dev-state-toggle';
import { AppTextInput } from '@/components/ui/app-text-input';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/hooks/use-auth';
import { uploadMedia } from '@/services/media/upload';
import { pickMedia } from '@/utils/media-picker';
import { IconCheck, IconCreditCard, IconPencil, IconX } from '@tabler/icons-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-simple-toast';

type BankingKey = 'bankingNombre' | 'bankingCuenta' | 'bankingBanco' | 'bankingClabe';

const BANK_FIELDS: { key: BankingKey; label: string }[] = [
  { key: 'bankingNombre', label: 'Nombre' },
  { key: 'bankingBanco', label: 'Banco' },
  { key: 'bankingCuenta', label: 'Cuenta' },
  { key: 'bankingClabe', label: 'CLABE' },
];

export default function ProfileScreen() {
  const auth = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const inset = useSafeAreaInsets();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';
  // Spinner color: visible on both light and dark backgrounds
  const refreshTint = colorScheme === 'dark' ? '#72c496' : '#1a7d52';

  const [refreshing, setRefreshing] = useState(false);
  const [avatarLocalUri, setAvatarLocalUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<BankingKey, string>>({
    bankingNombre: '',
    bankingBanco: '',
    bankingCuenta: '',
    bankingClabe: '',
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await auth.refreshUser();
    } finally {
      setRefreshing(false);
    }
  }, [auth]);

  const handleAvatarPress = useCallback(async () => {
    if (uploadingAvatar) return;
    const localUri = await pickMedia({ quality: 0.8 });
    if (!localUri) return;

    setAvatarLocalUri(localUri);
    setUploadingAvatar(true);
    try {
      const { mediaId } = await uploadMedia(localUri);
      await auth.updateAvatar(mediaId);
      setAvatarLocalUri(null);
    } catch (e) {
      setAvatarLocalUri(null);
      Toast.showWithGravity(
        e instanceof Error ? e.message : 'Error al subir foto',
        Toast.SHORT,
        Toast.TOP,
      );
    } finally {
      setUploadingAvatar(false);
    }
  }, [auth, uploadingAvatar]);

  if (auth.status !== 'authenticated') {
    return null;
  }

  const { user, logout, updateBankingInfo } = auth;

  const startEditing = () => {
    setDraft({
      bankingNombre: user.bankingNombre ?? '',
      bankingBanco: user.bankingBanco ?? '',
      bankingCuenta: user.bankingCuenta ?? '',
      bankingClabe: user.bankingClabe ?? '',
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBankingInfo({
        bankingNombre: draft.bankingNombre || null,
        bankingBanco: draft.bankingBanco || null,
        bankingCuenta: draft.bankingCuenta || null,
        bankingClabe: draft.bankingClabe || null,
      });
      setEditing(false);
      Toast.showWithGravity('Datos guardados', Toast.SHORT, Toast.TOP);
    } catch (e) {
      Toast.showWithGravity(
        e instanceof Error ? e.message : 'Error al guardar',
        Toast.SHORT,
        Toast.TOP,
      );
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (value: string, type: string) => {
    await Clipboard.setStringAsync(value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const suffix = type === 'Cuenta' || type === 'CLABE' ? 'a' : 'o';
    Toast.showWithGravity(
      `${type} copiad${suffix}`,
      Toast.SHORT,
      Toast.TOP,
    );
  };

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900" style={{ paddingTop: inset.top }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-12"
        contentContainerStyle={{ paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={refreshTint}
            colors={[refreshTint]}
            progressViewOffset={inset.top}
          />
        }
      >
      {/* Profile header */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <View className="items-center">
          <Pressable className="relative mb-4 active:opacity-70" onPress={handleAvatarPress}>
            <UserAvatar
              displayName={user.displayName}
              avatarMediaId={user.avatarMediaId}
              localUri={avatarLocalUri}
              size={80}
              fallbackClassName="bg-felt-100 dark:bg-felt-900"
              fallbackTextClassName="text-3xl font-sans-bold text-felt-600 dark:text-felt-300"
            />
            {uploadingAvatar && (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </Pressable>
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

      {/* Datos de cuenta */}
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
              className="flex-row items-center gap-1 rounded-lg px-3 py-1.5 active:opacity-70"
              onPress={startEditing}
            >
              <IconPencil size={16} color={iconColor} />
              <Text className="text-sm font-sans-semibold text-sand-500 dark:text-sand-400">
                Editar
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-2">
              <Pressable
                className="rounded-lg px-3 py-1.5 active:opacity-70"
                onPress={cancelEditing}
                disabled={saving}
              >
                <IconX size={18} color={iconColor} />
              </Pressable>
              <Pressable
                className="flex-row items-center gap-1 rounded-lg bg-felt-600 px-3 py-1.5 active:bg-felt-700"
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <IconCheck size={16} color="#fff" />
                )}
                <Text className="text-sm font-sans-semibold text-white">
                  Guardar
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View className="rounded-xl border border-sand-300 bg-sand-200 p-4 dark:border-sand-600 dark:bg-sand-700">
          {BANK_FIELDS.map(({ key, label }) => {
            if (editing) {
              return (
                <View key={key} className="mb-3 last:mb-0">
                  <Text className="mb-1 font-mono text-sm text-sand-600 dark:text-sand-400">{label}</Text>
                  <AppTextInput
                    size="sm"
                    value={draft[key]}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, [key]: text }))}
                    placeholder={label}
                    editable={!saving}
                  />
                </View>
              );
            }

            const value = user[key];
            const display = value?.trim() || '\u2014';
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
          })}
        </View>
      </View>

      {/* Contador de fichas (admin only) */}
      {user.isAdmin && (
        <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-full bg-felt-600 py-3.5 active:bg-felt-700"
            onPress={() => router.push('/chip-counter')}
          >
            <Text className="text-sm font-sans-semibold text-white">
              Contador de Fichas
            </Text>
          </Pressable>
        </View>
      )}

      {/* Cerrar sesion */}
      <View className="border-b border-sand-200 px-6 py-6 dark:border-sand-700">
        <Pressable
          className="items-center rounded-full bg-red-600 py-3.5 active:bg-red-700"
          onPress={logout}
        >
          <Text className="text-sm font-sans-semibold text-white">
            Cerrar sesion
          </Text>
        </Pressable>
      </View>

      {__DEV__ && <DevStateToggle />}
      </ScrollView>
    </View>
  );
}
