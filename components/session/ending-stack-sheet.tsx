import { AppTextInput } from '@/components/ui/app-text-input';
import { ButtonActivityIndicator } from '@/components/ui/button-activity-indicator';
import { PhotoThumbnail } from '@/components/ui/photo-viewer';
import { useAppState } from '@/hooks/use-app-state';
import { uploadMedia } from '@/services/media/upload';
import type { EndingSubmission, SessionParticipant, User } from '@/types';
import { pickMedia } from '@/utils/media-picker';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { IconCamera, IconCheck, IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  participant: SessionParticipant;
  participants: SessionParticipant[];
  endingSubmissions: EndingSubmission[];
  users: User[];
  rejectedSubmission: EndingSubmission | null;
};

function getLatestSubmission(
  participantId: string,
  submissions: EndingSubmission[],
): EndingSubmission | null {
  const forParticipant = submissions
    .filter((s) => s.participantId === participantId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return forParticipant[0] ?? null;
}

export function EndingStackSheet({
  visible,
  onClose,
  participant,
  participants,
  endingSubmissions,
  users,
  rejectedSubmission,
}: Props) {
  const appState = useAppState();
  const colorScheme = useColorScheme();
  const inset = useSafeAreaInsets();
  const iconColor = colorScheme === 'dark' ? '#b5ac9e' : '#918779';
  const sheetBg = colorScheme === 'dark' ? '#252119' : '#fdfbf7'; // sand-900 / sand-50

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const amountInputRef = useRef<TextInput>(null);

  // Present / dismiss based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // ── Form state ──
  // endingStack stores raw digits only (e.g. "850", "1250")
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [endingStack, setEndingStack] = useState(
    rejectedSubmission ? String(rejectedSubmission.endingStackCents / 100) : '',
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState(rejectedSubmission?.note ?? '');
  const [loading, setLoading] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(participant.id);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior={loading ? 'none' : 'close'}
      />
    ),
    [loading],
  );

  const handleAmountChange = useCallback((text: string) => {
    setEndingStack(text.replace(/[^0-9]/g, ''));
  }, []);

  const displayAmount = endingStack
    ? `$ ${parseInt(endingStack, 10).toLocaleString()}.00`
    : '';

  const eligibleOthers = useMemo(() => {
    return participants.filter((p) => {
      if (p.id === participant.id) return false;
      const latest = getLatestSubmission(p.id, endingSubmissions);
      return !latest || latest.status === 'rejected';
    });
  }, [participants, participant.id, endingSubmissions]);

  const handlePickImage = useCallback(async () => {
    const uri = await pickMedia({ quality: 0.7 });
    if (uri) setPhotoUri(uri);
  }, []);

  const handleSubmit = useCallback(async () => {
    const pesos = parseInt(endingStack, 10);
    if (isNaN(pesos) || pesos < 0) {
      Alert.alert('Inválido', 'Monto de stack final no válido');
      return;
    }
    if (!photoUri) {
      Alert.alert('Requerido', 'Adjunta una foto de comprobante');
      return;
    }
    setLoading(true);
    try {
      const cents = pesos * 100;
      const { mediaKey } = await uploadMedia(photoUri);
      await appState.submitEndingStack(
        selectedParticipantId,
        cents,
        mediaKey,
        note.trim() || undefined,
      );
      // Reset
      setEndingStack('');
      setPhotoUri(null);
      setNote('');
      setStep(1);
      setSelectedParticipantId(participant.id);
      bottomSheetRef.current?.dismiss();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setLoading(false);
    }
  }, [appState, endingStack, photoUri, note, selectedParticipantId, participant.id]);

  const handleDismiss = () => {
    if (!loading) bottomSheetRef.current?.dismiss();
  };

  const amountValid = endingStack !== '' && parseInt(endingStack, 10) >= 0;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: sheetBg }}
      handleIndicatorStyle={{ display: 'none' }}
      handleStyle={{ height: 0, padding: 0 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enablePanDownToClose={!loading}
    >
      <BottomSheetView style={{ paddingBottom: Math.max(inset.bottom, 20) }}>
        {/* Close button */}
        <View className="flex-row items-center justify-end px-4 pt-4 pb-1">
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full bg-sand-200 active:bg-sand-300 dark:bg-sand-700 dark:active:bg-sand-600"
            onPress={handleDismiss}
            disabled={loading}
            hitSlop={8}
          >
            <IconX size={16} color={iconColor} />
          </Pressable>
        </View>

        {/* Step dots */}
        <View className="flex-row items-center justify-center gap-1.5 pb-5">
          {([1, 2, 3] as const).map((s) => (
            <View
              key={s}
              className={`h-1.5 rounded-full ${
                s === step
                  ? 'w-5 bg-gold-500'
                  : s < step
                    ? 'w-1.5 bg-felt-500'
                    : 'w-1.5 bg-sand-300 dark:bg-sand-600'
              }`}
            />
          ))}
        </View>

        {/* Step content */}
        <View className="px-6">
          {/* ── Step 1: Amount ── */}
          {step === 1 && (
            <View>
              {rejectedSubmission && (
                <View className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30">
                  <View className="mb-1 flex-row items-center gap-2">
                    <View className="rounded-full bg-red-100 px-2 py-0.5 dark:bg-red-900/40">
                      <Text className="text-[10px] font-semibold text-red-700 dark:text-red-300">
                        Rechazado
                      </Text>
                    </View>
                  </View>
                  {rejectedSubmission.reviewNote && (
                    <Text className="text-sm text-red-600 dark:text-red-400">
                      {rejectedSubmission.reviewNote}
                    </Text>
                  )}
                </View>
              )}

              <Text className="mb-1 text-lg font-sans-bold text-sand-950 dark:text-sand-50">
                Stack Final
              </Text>
              <Text className="mb-5 text-sm text-sand-500 dark:text-sand-400">
                ¿Con cuánto terminaste?
              </Text>

              <Pressable onPress={() => amountInputRef.current?.focus()}>
                <View className="relative min-h-[56px] items-center justify-center rounded-lg border border-sand-300 bg-sand-100 px-4 dark:border-sand-600 dark:bg-sand-800">
                  {/* Hidden input captures keystrokes */}
                  <TextInput
                    ref={amountInputRef}
                    value={endingStack}
                    onChangeText={handleAmountChange}
                    keyboardType="number-pad"
                    caretHidden
                    autoFocus
                    style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                  />
                  {/* Formatted display */}
                  <Text
                    className={`text-center text-xl font-sans-bold ${
                      endingStack
                        ? 'text-sand-950 dark:text-sand-50'
                        : 'text-sand-400 dark:text-sand-500'
                    }`}
                  >
                    {displayAmount || '$ 0.00'}
                  </Text>
                </View>
              </Pressable>
              <Text className="mb-6 mt-1.5 text-center text-xs text-sand-400 dark:text-sand-500">
                MXN
              </Text>

              {/* Navigation */}
              <View className="flex-row items-center justify-between">
                <Pressable className="px-2 py-3" onPress={handleDismiss}>
                  <Text className="text-sm font-sans-medium text-sand-500 dark:text-sand-400">
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center gap-1 rounded-full px-6 py-3 ${
                    amountValid
                      ? 'bg-gold-500 active:bg-gold-600'
                      : 'bg-sand-300 dark:bg-sand-700'
                  }`}
                  onPress={() => setStep(2)}
                  disabled={!amountValid}
                >
                  <Text className="text-sm font-sans-semibold text-white">Siguiente</Text>
                  <IconChevronRight size={16} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Step 2: Photo ── */}
          {step === 2 && (
            <View>
              <Text className="mb-1 text-lg font-sans-bold text-sand-950 dark:text-sand-50">
                Foto de Comprobante
              </Text>
              <Text className="mb-5 text-sm text-sand-500 dark:text-sand-400">
                Toma una foto del conteo de fichas
              </Text>

              <View className="mb-6 items-center">
                {photoUri ? (
                  <View className="items-center gap-3">
                    <PhotoThumbnail uri={photoUri} size={120} />
                    <View className="flex-row gap-4">
                      <Pressable className="px-2 py-1" onPress={handlePickImage}>
                        <Text className="text-sm font-sans-medium text-felt-600 dark:text-felt-400">
                          Cambiar
                        </Text>
                      </Pressable>
                      <Pressable className="px-2 py-1" onPress={() => setPhotoUri(null)}>
                        <Text className="text-sm font-sans-medium text-red-500">Eliminar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    className="w-full items-center rounded-xl border-2 border-dashed border-sand-300 py-10 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
                    onPress={handlePickImage}
                  >
                    <IconCamera size={32} color={iconColor} />
                    <Text className="mt-2 text-sm font-sans-medium text-sand-500 dark:text-sand-400">
                      Tomar o elegir foto
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Navigation */}
              <View className="flex-row items-center justify-between">
                <Pressable
                  className="flex-row items-center gap-1 px-2 py-3"
                  onPress={() => setStep(1)}
                >
                  <IconChevronLeft size={16} color={iconColor} />
                  <Text className="text-sm font-sans-medium text-sand-500 dark:text-sand-400">
                    Atrás
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center gap-1 rounded-full px-6 py-3 ${
                    photoUri
                      ? 'bg-gold-500 active:bg-gold-600'
                      : 'bg-sand-300 dark:bg-sand-700'
                  }`}
                  onPress={() => setStep(3)}
                  disabled={!photoUri}
                >
                  <Text className="text-sm font-sans-semibold text-white">Siguiente</Text>
                  <IconChevronRight size={16} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Step 3: Review & Confirm ── */}
          {step === 3 && (
            <View>
              <Text className="mb-1 text-lg font-sans-bold text-sand-950 dark:text-sand-50">
                Confirmar Envío
              </Text>
              <Text className="mb-5 text-sm text-sand-500 dark:text-sand-400">
                Revisa los datos antes de enviar
              </Text>

              {/* Summary card */}
              <View className="mb-4 flex-row items-center gap-3 rounded-xl bg-sand-100 p-3 dark:bg-sand-800">
                {photoUri && <PhotoThumbnail uri={photoUri} size={48} />}
                <View className="flex-1">
                  <Text className="text-xs text-sand-500 dark:text-sand-400">Stack Final</Text>
                  <Text className="text-lg font-sans-bold text-sand-950 dark:text-sand-50">
                    {displayAmount} MXN
                  </Text>
                </View>
              </View>

              {/* Optional note */}
              <View className="mb-4">
                <Text className="mb-1 text-xs text-sand-500 dark:text-sand-400">
                  Nota (opcional)
                </Text>
                <AppTextInput
                  size="sm"
                  placeholder="Comentarios sobre el conteo"
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              {/* Submit for someone else */}
              {eligibleOthers.length > 0 && (
                <View className="mb-4">
                  <Text className="mb-2 text-xs text-sand-500 dark:text-sand-400">
                    Enviando por
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Pressable
                      className={`rounded-full border px-3 py-1.5 ${
                        selectedParticipantId === participant.id
                          ? 'border-felt-600 bg-felt-50 dark:border-felt-400 dark:bg-felt-900/30'
                          : 'border-sand-300 bg-white dark:border-sand-600 dark:bg-sand-800'
                      }`}
                      onPress={() => setSelectedParticipantId(participant.id)}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          selectedParticipantId === participant.id
                            ? 'text-felt-700 dark:text-felt-300'
                            : 'text-sand-700 dark:text-sand-300'
                        }`}
                      >
                        Yo mismo
                      </Text>
                    </Pressable>
                    {eligibleOthers.map((p) => {
                      const user = users.find((u) => u.id === p.userId);
                      const name = user?.displayName ?? p.guestName ?? 'Unknown';
                      const isSelected = selectedParticipantId === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          className={`rounded-full border px-3 py-1.5 ${
                            isSelected
                              ? 'border-felt-600 bg-felt-50 dark:border-felt-400 dark:bg-felt-900/30'
                              : 'border-sand-300 bg-white dark:border-sand-600 dark:bg-sand-800'
                          }`}
                          onPress={() => setSelectedParticipantId(p.id)}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              isSelected
                                ? 'text-felt-700 dark:text-felt-300'
                                : 'text-sand-700 dark:text-sand-300'
                            }`}
                          >
                            {name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Navigation */}
              <View className="flex-row items-center justify-between">
                <Pressable
                  className="flex-row items-center gap-1 px-2 py-3"
                  onPress={() => setStep(2)}
                  disabled={loading}
                >
                  <IconChevronLeft size={16} color={iconColor} />
                  <Text className="text-sm font-sans-medium text-sand-500 dark:text-sand-400">
                    Atrás
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center gap-1.5 rounded-full px-6 py-3 ${
                    loading ? 'bg-gold-300 dark:bg-gold-700' : 'bg-gold-500 active:bg-gold-600'
                  }`}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ButtonActivityIndicator />
                  ) : (
                    <>
                      <IconCheck size={16} color="#fff" />
                      <Text className="text-sm font-sans-semibold text-white">
                        {rejectedSubmission ? 'Reenviar' : 'Enviar'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
