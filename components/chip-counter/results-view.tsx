import { Loader } from '@/components/ui/loader';
import {
  CHIP_MAP,
  DEFAULT_CONFIDENCE,
  DEFAULT_OVERLAP,
  type ChipCountResult,
  type ManualChip,
  type RoboflowPrediction,
} from '@/types/chip-counter';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Canvas, Circle, Rect, Skia } from '@shopify/react-native-skia';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { LayoutChangeEvent } from 'react-native';

type ResultsViewProps = {
  imageBase64: string;
  imageWidth: number;
  imageHeight: number;
  predictions: RoboflowPrediction[];
  results: ChipCountResult[];
  grandTotal: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  onReanalyze: (confidence: number, overlap: number) => void;
};

function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('es-MX')}`;
}

const CHIP_OPTIONS = Object.entries(CHIP_MAP).map(([key, config]) => ({
  chipClass: key,
  ...config,
}));

// ── Simple track slider ──────────────────────────────────────────────

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (v: number) => void;
};

function ThresholdSlider({ label, value, min, max, onValueChange }: SliderProps) {
  const trackRef = useRef<View>(null);
  const trackWidth = useRef(0);

  const pct = (value - min) / (max - min);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const handleTrackPress = (pageX: number) => {
    trackRef.current?.measureInWindow((x) => {
      const relX = Math.max(0, Math.min(pageX - x, trackWidth.current));
      const newVal = Math.round(min + (relX / trackWidth.current) * (max - min));
      onValueChange(newVal);
    });
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => handleTrackPress(e.absoluteX))
    .onChange((e) => handleTrackPress(e.absoluteX));

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => handleTrackPress(e.absoluteX));

  const gesture = Gesture.Race(panGesture, tapGesture);

  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs font-sans-semibold text-sand-600 dark:text-sand-400">
          {label}
        </Text>
        <Text className="font-mono text-xs text-sand-950 dark:text-sand-50">
          {value}%
        </Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          ref={trackRef}
          onLayout={onTrackLayout}
          className="h-8 justify-center rounded-full bg-sand-200 dark:bg-sand-700"
        >
          {/* Filled portion */}
          <View
            className="absolute left-0 top-0 h-8 rounded-full bg-felt-200 dark:bg-felt-800"
            style={{ width: `${pct * 100}%` }}
          />
          {/* Thumb */}
          <View
            className="absolute h-6 w-6 rounded-full border-2 border-felt-600 bg-white shadow dark:bg-sand-100"
            style={{ left: `${pct * 100}%`, marginLeft: -12 }}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

// ── Results View ─────────────────────────────────────────────────────

export function ResultsView({
  imageBase64,
  imageWidth,
  imageHeight,
  predictions,
  results: initialResults,
  grandTotal: initialGrandTotal,
  loading,
  error,
  onRetry,
  onClose,
  onReanalyze,
}: ResultsViewProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [manualChips, setManualChips] = useState<ManualChip[]>([]);
  const [pendingTap, setPendingTap] = useState<{ x: number; y: number } | null>(null);
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE);
  const [overlap, setOverlap] = useState(DEFAULT_OVERLAP);

  const onImageLayout = (e: LayoutChangeEvent) => {
    setContainerSize({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  // Calculate display rect for bounding boxes
  const displayRect = useMemo(() => {
    if (!containerSize.width || !containerSize.height) return null;
    const scaleX = containerSize.width / imageWidth;
    const scaleY = containerSize.height / imageHeight;
    const scale = Math.min(scaleX, scaleY);
    const dw = imageWidth * scale;
    const dh = imageHeight * scale;
    return {
      offsetX: (containerSize.width - dw) / 2,
      offsetY: (containerSize.height - dh) / 2,
      scale,
      displayWidth: dw,
      displayHeight: dh,
    };
  }, [containerSize, imageWidth, imageHeight]);

  // Merge initial results with manual chips
  const { mergedResults, mergedGrandTotal, totalChips } = useMemo(() => {
    const countMap = new Map<string, ChipCountResult>();
    for (const r of initialResults) {
      countMap.set(r.chipClass, { ...r });
    }

    for (const mc of manualChips) {
      const existing = countMap.get(mc.chipClass);
      if (existing) {
        existing.count += 1;
        existing.total = existing.count * existing.value;
      } else {
        const config = CHIP_MAP[mc.chipClass];
        if (config) {
          countMap.set(mc.chipClass, {
            chipClass: mc.chipClass,
            label: config.label,
            count: 1,
            value: config.value,
            total: config.value,
            color: config.color,
            bgColor: config.bgColor,
          });
        }
      }
    }

    const merged = Array.from(countMap.values()).sort((a, b) => b.value - a.value);
    const total = merged.reduce((sum, r) => sum + r.total, 0);
    const chips = merged.reduce((sum, r) => sum + r.count, 0);
    return { mergedResults: merged, mergedGrandTotal: total, totalChips: chips };
  }, [initialResults, manualChips]);

  // Bounding boxes for API predictions
  const boxElements = useMemo(() => {
    if (!displayRect) return [];
    return predictions.map((p) => {
      const config = CHIP_MAP[p.class];
      const color = config?.color ?? '#FFFFFF';
      const cx = p.x * displayRect.scale + displayRect.offsetX;
      const cy = p.y * displayRect.scale + displayRect.offsetY;
      const w = p.width * displayRect.scale;
      const h = p.height * displayRect.scale;
      return {
        id: p.detection_id,
        x: cx - w / 2,
        y: cy - h / 2,
        width: w,
        height: h,
        color,
      };
    });
  }, [predictions, displayRect]);

  // Dot markers for manual chips
  const manualDots = useMemo(() => {
    return manualChips.map((mc) => {
      const config = CHIP_MAP[mc.chipClass];
      return { id: mc.id, x: mc.x, y: mc.y, color: config?.color ?? '#FFFFFF' };
    });
  }, [manualChips]);

  // Tap gesture to add manual chip
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      setPendingTap({ x: e.x, y: e.y });
    });

  const handleSelectChipType = useCallback((chipClass: string) => {
    if (!pendingTap) return;
    setManualChips((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random()}`,
        x: pendingTap.x,
        y: pendingTap.y,
        chipClass,
      },
    ]);
    setPendingTap(null);
  }, [pendingTap]);

  const handleCancelPicker = useCallback(() => {
    setPendingTap(null);
  }, []);

  const handleUndoLastManual = useCallback(() => {
    setManualChips((prev) => prev.slice(0, -1));
  }, []);

  const handleReanalyze = useCallback(() => {
    setManualChips([]);
    onReanalyze(confidence, overlap);
  }, [confidence, overlap, onReanalyze]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <Loader size={80} />
        <Text className="mt-4 text-sm text-sand-500 dark:text-sand-400">
          Detectando fichas…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <Text className="mb-4 text-center text-base text-red-600">{error}</Text>
        <View className="flex-row gap-3">
          <Pressable
            className="rounded-full border border-sand-300 px-6 py-3 active:bg-sand-100 dark:border-sand-600"
            onPress={onRetry}
          >
            <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
              Reintentar
            </Text>
          </Pressable>
          <Pressable
            className="rounded-full bg-sand-300 px-6 py-3 active:bg-sand-400 dark:bg-sand-600"
            onPress={onClose}
          >
            <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
              Cerrar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (mergedResults.length === 0 && manualChips.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <Text className="mb-2 text-lg font-sans-bold text-sand-950 dark:text-sand-50">
          No se detectaron fichas
        </Text>
        <Text className="mb-6 text-center text-sm text-sand-500 dark:text-sand-400">
          Intenta seleccionar un área más precisa o con mejor iluminación
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            className="rounded-full border border-sand-300 px-6 py-3 active:bg-sand-100 dark:border-sand-600"
            onPress={onRetry}
          >
            <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
              Reintentar
            </Text>
          </Pressable>
          <Pressable
            className="rounded-full bg-sand-300 px-6 py-3 active:bg-sand-400 dark:bg-sand-600"
            onPress={onClose}
          >
            <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
              Cerrar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-sand-50 dark:bg-sand-900" contentContainerClassName="pb-8">
        {/* Image with bounding boxes + manual dots */}
        <View
          className="mx-4 mt-4 overflow-hidden rounded-xl"
          style={{ aspectRatio: imageWidth / imageHeight }}
          onLayout={onImageLayout}
        >
          <Image
            source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
          {displayRect && (
            <GestureDetector gesture={tapGesture}>
              <Canvas
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: containerSize.width,
                  height: containerSize.height,
                }}
              >
                {/* API bounding boxes */}
                {boxElements.map((box) => {
                  const strokePaint = Skia.Paint();
                  strokePaint.setStyle(1);
                  strokePaint.setStrokeWidth(2);
                  strokePaint.setColor(Skia.Color(box.color === '#FFFFFF' ? '#E5E5E5' : box.color));
                  return (
                    <Rect
                      key={box.id}
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      paint={strokePaint}
                    />
                  );
                })}
                {/* Manual chip dots — fill */}
                {manualDots.map((dot) => {
                  const fillPaint = Skia.Paint();
                  fillPaint.setColor(Skia.Color(dot.color === '#FFFFFF' ? '#E5E5E5' : dot.color));
                  fillPaint.setStyle(0);
                  return <Circle key={dot.id} cx={dot.x} cy={dot.y} r={10} paint={fillPaint} />;
                })}
                {/* Manual chip dots — white border */}
                {manualDots.map((dot) => {
                  const borderPaint = Skia.Paint();
                  borderPaint.setColor(Skia.Color('white'));
                  borderPaint.setStyle(1);
                  borderPaint.setStrokeWidth(2);
                  return <Circle key={`${dot.id}-b`} cx={dot.x} cy={dot.y} r={10} paint={borderPaint} />;
                })}
              </Canvas>
            </GestureDetector>
          )}
        </View>

        {/* Tap hint */}
        <Text className="mx-4 mt-2 text-center text-xs text-sand-400 dark:text-sand-500">
          Toca la imagen para agregar fichas no detectadas
        </Text>

        {/* Undo button for manual chips */}
        {manualChips.length > 0 && (
          <Pressable
            className="mx-4 mt-2 items-center rounded-full border border-sand-300 py-2 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
            onPress={handleUndoLastManual}
          >
            <Text className="text-xs font-sans-semibold text-sand-600 dark:text-sand-400">
              Deshacer última ficha manual ({manualChips.length} agregada{manualChips.length !== 1 ? 's' : ''})
            </Text>
          </Pressable>
        )}

        {/* Detection thresholds */}
        <View className="mx-4 mt-4 rounded-xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-700 dark:bg-sand-800">
          <ThresholdSlider
            label="Confianza"
            value={confidence}
            min={10}
            max={90}
            onValueChange={setConfidence}
          />
          <ThresholdSlider
            label="Superposición"
            value={overlap}
            min={0}
            max={100}
            onValueChange={setOverlap}
          />
          <Pressable
            className="mt-1 items-center rounded-full bg-felt-600 py-2.5 active:bg-felt-700"
            onPress={handleReanalyze}
          >
            <Text className="text-sm font-sans-semibold text-white">
              Re-analizar
            </Text>
          </Pressable>
        </View>

        {/* Results table */}
        <View className="mx-4 mt-4 overflow-hidden rounded-xl border border-sand-200 dark:border-sand-700">
          {/* Header */}
          <View className="flex-row border-b border-sand-200 bg-sand-100 px-4 py-3 dark:border-sand-700 dark:bg-sand-800">
            <Text className="flex-1 text-xs font-sans-bold uppercase text-sand-500 dark:text-sand-400">
              Ficha
            </Text>
            <Text className="w-16 text-center text-xs font-sans-bold uppercase text-sand-500 dark:text-sand-400">
              Cant.
            </Text>
            <Text className="w-16 text-center text-xs font-sans-bold uppercase text-sand-500 dark:text-sand-400">
              Valor
            </Text>
            <Text className="w-20 text-right text-xs font-sans-bold uppercase text-sand-500 dark:text-sand-400">
              Subtotal
            </Text>
          </View>

          {/* Rows */}
          {mergedResults.map((r) => (
            <View
              key={r.chipClass}
              className="flex-row items-center border-b border-sand-100 px-4 py-3 dark:border-sand-800"
            >
              <View className="flex-1 flex-row items-center gap-2">
                <View
                  className="h-4 w-4 rounded-full border border-sand-300 dark:border-sand-600"
                  style={{ backgroundColor: r.color }}
                />
                <Text className="text-sm font-sans-semibold text-sand-950 dark:text-sand-50">
                  {r.label}
                </Text>
              </View>
              <Text className="w-16 text-center font-mono text-sm text-sand-700 dark:text-sand-300">
                {r.count}
              </Text>
              <Text className="w-16 text-center font-mono text-sm text-sand-500 dark:text-sand-400">
                {formatMXN(r.value)}
              </Text>
              <Text className="w-20 text-right font-mono-bold text-sm text-sand-950 dark:text-sand-50">
                {formatMXN(r.total)}
              </Text>
            </View>
          ))}

          {/* Grand total */}
          <View className="flex-row items-center bg-felt-50 px-4 py-4 dark:bg-felt-900/30">
            <Text className="flex-1 text-base font-sans-bold text-sand-950 dark:text-sand-50">
              Total
            </Text>
            <Text className="w-16 text-center font-mono-bold text-sm text-sand-950 dark:text-sand-50">
              {totalChips}
            </Text>
            <View className="w-16" />
            <Text className="w-20 text-right text-lg font-heading text-felt-700 dark:text-felt-300">
              {formatMXN(mergedGrandTotal)}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="mx-4 mt-6 flex-row gap-3">
          <Pressable
            className="flex-1 items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
            onPress={onRetry}
          >
            <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
              Reintentar
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-full bg-felt-600 py-3 active:bg-felt-700"
            onPress={onClose}
          >
            <Text className="text-sm font-sans-semibold text-white">
              Cerrar
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Chip type picker modal */}
      <Modal visible={pendingTap !== null} transparent animationType="fade" onRequestClose={handleCancelPicker}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={handleCancelPicker}>
          <Pressable className="rounded-t-2xl bg-sand-50 px-6 pb-10 pt-6 dark:bg-sand-800" onPress={() => {}}>
            <Text className="mb-4 text-center text-base font-sans-bold text-sand-950 dark:text-sand-50">
              Seleccionar tipo de ficha
            </Text>
            <View className="flex-row flex-wrap justify-center gap-3">
              {CHIP_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.chipClass}
                  className="items-center rounded-xl border border-sand-200 px-4 py-3 active:bg-sand-100 dark:border-sand-700 dark:active:bg-sand-700"
                  style={{ minWidth: 90 }}
                  onPress={() => handleSelectChipType(opt.chipClass)}
                >
                  <View
                    className="mb-2 h-8 w-8 rounded-full border border-sand-300 dark:border-sand-600"
                    style={{ backgroundColor: opt.color }}
                  />
                  <Text className="text-xs font-sans-semibold text-sand-950 dark:text-sand-50">
                    {opt.label}
                  </Text>
                  <Text className="text-xs text-sand-500 dark:text-sand-400">
                    {formatMXN(opt.value)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              className="mt-4 items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600"
              onPress={handleCancelPicker}
            >
              <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
                Cancelar
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
