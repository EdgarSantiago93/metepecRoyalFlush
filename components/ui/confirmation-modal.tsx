import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const confirmBg =
    variant === 'destructive'
      ? 'bg-red-600 active:bg-red-700'
      : 'bg-gold-500 active:bg-gold-600';

  const confirmBgDisabled =
    variant === 'destructive'
      ? 'bg-red-400 dark:bg-red-800'
      : 'bg-gold-300 dark:bg-gold-700';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-2xl bg-sand-50 p-6 dark:bg-sand-800">
          <Text className="mb-2 text-lg font-bold text-sand-950 dark:text-sand-50">
            {title}
          </Text>
          <Text className="mb-6 text-sm leading-5 text-sand-600 dark:text-sand-300">
            {message}
          </Text>

          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-lg border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-700"
              onPress={onCancel}
              disabled={loading}
            >
              <Text className="text-sm font-semibold text-sand-700 dark:text-sand-300">
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 items-center rounded-lg py-3 ${loading ? confirmBgDisabled : confirmBg}`}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
