import { LassoCanvas } from '@/components/chip-counter/lasso-canvas';
import { MaskPreview } from '@/components/chip-counter/mask-preview';
import { ResultsView } from '@/components/chip-counter/results-view';
import { aggregateResults, detectChips, filterPredictions } from '@/services/chip-counter/roboflow';
import type {
  ChipCountResult,
  CounterStep,
  DisplayRect,
  RoboflowPrediction,
} from '@/types/chip-counter';
import { pickMedia } from '@/utils/media-picker';
import type { SkPath } from '@shopify/react-native-skia';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChipCounterScreen() {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<CounterStep>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [lassoPath, setLassoPath] = useState<SkPath | null>(null);
  const [displayRect, setDisplayRect] = useState<DisplayRect | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<RoboflowPrediction[]>([]);
  const [results, setResults] = useState<ChipCountResult[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [maskedImage, setMaskedImage] = useState<{ base64: string; width: number; height: number } | null>(null);

  // Canvas area height: full height minus header (~56px) and bottom inset
  const canvasHeight = screenHeight - 56 - insets.bottom - 80;

  const handlePickImage = useCallback(async () => {
    const uri = await pickMedia({ quality: 1 });
    if (!uri) return;

    try {
      // Use ImageManipulator to get dimensions (no-op transform returns width/height)
      const context = ImageManipulator.manipulate(uri);
      const imageRef = await context.renderAsync();
      const result = await imageRef.saveAsync({ format: SaveFormat.JPEG });

      setImageUri(uri);
      setImageSize({ width: result.width, height: result.height });
      setStep('draw');
    } catch {
      Alert.alert('Error', 'No se pudo obtener las dimensiones de la imagen');
    }
  }, []);

  const handleLassoConfirm = useCallback((path: SkPath, rect: DisplayRect) => {
    setLassoPath(path);
    setDisplayRect(rect);
    setStep('preview');
  }, []);

  const handleBackToDraw = useCallback(() => {
    setLassoPath(null);
    setDisplayRect(null);
    setStep('draw');
  }, []);

  const handleAnalyze = useCallback(async (base64: string, width: number, height: number) => {
    setAnalyzing(true);
    setApiError(null);
    setMaskedImage({ base64, width, height });
    try {
      const response = await detectChips(base64);
      const filtered = filterPredictions(response.predictions);
      const { results: chipResults, grandTotal: total, filteredCount: fCount } =
        aggregateResults(response.predictions);

      setPredictions(filtered);
      setResults(chipResults);
      setGrandTotal(total);
      setFilteredCount(fCount);
      setStep('results');
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Error al analizar la imagen');
      setStep('results');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setStep('pick');
    setImageUri(null);
    setImageSize({ width: 0, height: 0 });
    setLassoPath(null);
    setDisplayRect(null);
    setPredictions([]);
    setResults([]);
    setGrandTotal(0);
    setFilteredCount(0);
    setApiError(null);
    setAnalyzing(false);
    setMaskedImage(null);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // Step 1: Pick image
  if (step === 'pick') {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <Text className="mb-2 text-xl font-heading text-sand-950 dark:text-sand-50">
          Contador de Fichas
        </Text>
        <Text className="mb-8 text-center text-sm text-sand-500 dark:text-sand-400">
          Toma una foto de las fichas del jugador para contar automáticamente su valor
        </Text>
        <Pressable
          className="w-full items-center rounded-full bg-felt-600 py-4 active:bg-felt-700"
          onPress={handlePickImage}
        >
          <Text className="text-base font-sans-semibold text-white">
            Seleccionar Imagen
          </Text>
        </Pressable>
        <Pressable
          className="mt-4 py-3"
          onPress={handleClose}
        >
          <Text className="text-sm font-sans-semibold text-sand-500 dark:text-sand-400">
            Cancelar
          </Text>
        </Pressable>
      </View>
    );
  }

  // Step 2: Draw lasso
  if (step === 'draw' && imageUri) {
    return (
      <LassoCanvas
        imageUri={imageUri}
        imageWidth={imageSize.width}
        imageHeight={imageSize.height}
        containerWidth={screenWidth}
        containerHeight={canvasHeight}
        onConfirm={handleLassoConfirm}
        onBack={() => setStep('pick')}
      />
    );
  }

  // Step 3: Preview mask
  if (step === 'preview' && imageUri && lassoPath && displayRect) {
    return (
      <MaskPreview
        imageUri={imageUri}
        imageWidth={imageSize.width}
        imageHeight={imageSize.height}
        lassoPath={lassoPath}
        displayRect={displayRect}
        onBack={handleBackToDraw}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />
    );
  }

  // Step 4: Results
  if (step === 'results' && maskedImage) {
    return (
      <ResultsView
        imageBase64={maskedImage.base64}
        imageWidth={maskedImage.width}
        imageHeight={maskedImage.height}
        predictions={predictions}
        results={results}
        grandTotal={grandTotal}
        filteredCount={filteredCount}
        loading={analyzing}
        error={apiError}
        onRetry={handleRetry}
        onClose={handleClose}
      />
    );
  }

  // Fallback
  return null;
}
