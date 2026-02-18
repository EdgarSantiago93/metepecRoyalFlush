import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';

import type { DisplayRect } from '@/types/chip-counter';

type LassoCanvasProps = {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  onConfirm: (path: SkPath, displayRect: DisplayRect) => void;
  onBack: () => void;
};

const MIN_POINT_DISTANCE_SQ = 9; // 3px squared

function computeDisplayRect(
  imgW: number,
  imgH: number,
  containerW: number,
  containerH: number,
): DisplayRect {
  const scaleX = containerW / imgW;
  const scaleY = containerH / imgH;
  const scale = Math.min(scaleX, scaleY);
  const displayWidth = imgW * scale;
  const displayHeight = imgH * scale;
  const offsetX = (containerW - displayWidth) / 2;
  const offsetY = (containerH - displayHeight) / 2;
  return { offsetX, offsetY, scale, displayWidth, displayHeight };
}

export function LassoCanvas({
  imageUri,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  onConfirm,
  onBack,
}: LassoCanvasProps) {
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [completedPath, setCompletedPath] = useState<SkPath | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pathRef = useRef<SkPath | null>(null);

  const displayRect = computeDisplayRect(imageWidth, imageHeight, containerWidth, containerHeight);

  // .runOnJS(true) forces callbacks to JS thread, avoiding the worklet error.
  // With point thinning (3px min), this is performant enough for freehand drawing.
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      pathRef.current = path;
      lastPointRef.current = { x: e.x, y: e.y };
      setCompletedPath(null);
      setCurrentPath(path.copy());
    })
    .onChange((e) => {
      const path = pathRef.current;
      const lastPoint = lastPointRef.current;
      if (!path || !lastPoint) return;

      const dx = e.x - lastPoint.x;
      const dy = e.y - lastPoint.y;
      if (dx * dx + dy * dy < MIN_POINT_DISTANCE_SQ) return;

      path.lineTo(e.x, e.y);
      lastPointRef.current = { x: e.x, y: e.y };
      setCurrentPath(path.copy());
    })
    .onEnd(() => {
      const path = pathRef.current;
      if (!path) return;
      path.close();
      setCompletedPath(path.copy());
      setCurrentPath(null);
      pathRef.current = null;
      lastPointRef.current = null;
    });

  const handleClear = useCallback(() => {
    setCurrentPath(null);
    setCompletedPath(null);
    pathRef.current = null;
    lastPointRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    if (completedPath) {
      onConfirm(completedPath, displayRect);
    }
  }, [completedPath, displayRect, onConfirm]);

  const activePath = currentPath ?? completedPath;

  return (
    <View className="flex-1">
      <View className="flex-1" style={{ width: containerWidth, height: containerHeight }}>
        <Image
          source={{ uri: imageUri }}
          style={{
            position: 'absolute',
            left: displayRect.offsetX,
            top: displayRect.offsetY,
            width: displayRect.displayWidth,
            height: displayRect.displayHeight,
          }}
          contentFit="contain"
        />
        <GestureDetector gesture={panGesture}>
          <Canvas style={{ flex: 1, width: containerWidth, height: containerHeight }}>
            {activePath && (
              <>
                {/* Semi-transparent fill */}
                <Path
                  path={activePath}
                  color="rgba(42, 157, 104, 0.15)"
                  style="fill"
                />
                {/* Dark outline for contrast */}
                <Path
                  path={activePath}
                  color="rgba(0, 0, 0, 0.4)"
                  style="stroke"
                  strokeWidth={4}
                />
                {/* White stroke */}
                <Path
                  path={activePath}
                  color="rgba(255, 255, 255, 0.9)"
                  style="stroke"
                  strokeWidth={2}
                />
              </>
            )}
          </Canvas>
        </GestureDetector>
      </View>

      {/* Instructions + buttons */}
      <View className="border-t border-sand-200 bg-sand-50 px-6 py-4 dark:border-sand-700 dark:bg-sand-900">
        {!completedPath && (
          <Text className="mb-3 text-center text-sm text-sand-500 dark:text-sand-400">
            Dibuja un círculo alrededor de las fichas
          </Text>
        )}
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
            onPress={completedPath ? handleClear : onBack}
          >
            <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
              {completedPath ? 'Limpiar' : 'Atrás'}
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-full py-3 ${
              completedPath
                ? 'bg-felt-600 active:bg-felt-700'
                : 'bg-sand-300 dark:bg-sand-600'
            }`}
            onPress={handleConfirm}
            disabled={!completedPath}
          >
            <Text
              className={`text-sm font-sans-semibold ${
                completedPath ? 'text-white' : 'text-sand-400 dark:text-sand-500'
              }`}
            >
              Confirmar
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export { computeDisplayRect };
