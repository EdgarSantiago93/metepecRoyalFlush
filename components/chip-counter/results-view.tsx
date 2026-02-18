import { Loader } from '@/components/ui/loader';
import { CHIP_MAP, type ChipCountResult, type RoboflowPrediction } from '@/types/chip-counter';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Canvas, Rect, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

type ResultsViewProps = {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  predictions: RoboflowPrediction[];
  results: ChipCountResult[];
  grandTotal: number;
  filteredCount: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
};

function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('es-MX')}`;
}

export function ResultsView({
  imageUri,
  imageWidth,
  imageHeight,
  predictions,
  results,
  grandTotal,
  filteredCount,
  loading,
  error,
  onRetry,
  onClose,
}: ResultsViewProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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

  // Create bounding box paint objects per class
  const boxElements = useMemo(() => {
    if (!displayRect) return [];
    return predictions.map((p) => {
      const config = CHIP_MAP[p.class];
      const color = config?.color ?? '#FFFFFF';
      // Map prediction coords (relative to sent image) to display coords
      // Predictions are in original image coordinates
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

  if (results.length === 0) {
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
    <ScrollView className="flex-1 bg-sand-50 dark:bg-sand-900" contentContainerClassName="pb-8">
      {/* Image with bounding boxes */}
      <View
        className="mx-4 mt-4 overflow-hidden rounded-xl"
        style={{ aspectRatio: imageWidth / imageHeight }}
        onLayout={onImageLayout}
      >
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
        {displayRect && boxElements.length > 0 && (
          <Canvas
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: containerSize.width,
              height: containerSize.height,
            }}
          >
            {boxElements.map((box) => {
              const strokePaint = Skia.Paint();
              strokePaint.setStyle(1); // Stroke
              strokePaint.setStrokeWidth(2);
              strokePaint.setColor(Skia.Color(box.color === '#FFFFFF' ? '#E5E5E5' : box.color));

              const fillPaint = Skia.Paint();
              fillPaint.setStyle(0); // Fill
              const fillColor = box.color === '#FFFFFF' ? 'rgba(229,229,229,0.2)' : `${box.color}33`;
              fillPaint.setColor(Skia.Color(fillColor));

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
          </Canvas>
        )}
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
        {results.map((r) => (
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
          <Text className="text-lg font-heading text-felt-700 dark:text-felt-300">
            {formatMXN(grandTotal)}
          </Text>
        </View>
      </View>

      {/* Filtered note */}
      {filteredCount > 0 && (
        <Text className="mx-4 mt-2 text-xs text-sand-400 dark:text-sand-500">
          {filteredCount} detección{filteredCount !== 1 ? 'es' : ''} con baja confianza omitida{filteredCount !== 1 ? 's' : ''}
        </Text>
      )}

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
  );
}
