import { Loader } from '@/components/ui/loader';
import type { DisplayRect } from '@/types/chip-counter';
import { ClipOp, Skia, type SkPath } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type MaskPreviewProps = {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  lassoPath: SkPath;
  displayRect: DisplayRect;
  onBack: () => void;
  onAnalyze: (base64: string, width: number, height: number) => void;
  analyzing: boolean;
};

const MAX_API_EDGE = 1200;
const JPEG_QUALITY = 0.7;

function scalePathToOriginal(path: SkPath, displayRect: DisplayRect): SkPath {
  const { offsetX, offsetY, scale } = displayRect;
  // Order matters: Skia post-concatenates, so S · T applies T first (subtract
  // display offset), then S (scale up to original image coords).
  const matrix = Skia.Matrix();
  matrix.scale(1 / scale, 1 / scale);
  matrix.translate(-offsetX, -offsetY);
  const scaled = path.copy();
  scaled.transform(matrix);
  return scaled;
}

export function MaskPreview({
  imageUri,
  imageWidth,
  imageHeight,
  lassoPath,
  displayRect,
  onBack,
  onAnalyze,
  analyzing,
}: MaskPreviewProps) {
  const [maskedBase64, setMaskedBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generateMask() {
      try {
        // Scale the lasso path to original image coordinates
        const originalPath = scalePathToOriginal(lassoPath, displayRect);

        // Create offscreen surface at original image size
        const surface = Skia.Surface.MakeOffscreen(imageWidth, imageHeight)!;
        const canvas = surface.getCanvas();

        // Fill with white background
        const whitePaint = Skia.Paint();
        whitePaint.setColor(Skia.Color('white'));
        canvas.drawRect(
          Skia.XYWHRect(0, 0, imageWidth, imageHeight),
          whitePaint,
        );

        // Load the original image as base64 using new File API
        const file = new File(imageUri);
        const imageData = await file.base64();
        const skData = Skia.Data.fromBase64(imageData);
        const skImage = Skia.Image.MakeImageFromEncoded(skData);

        if (!skImage) {
          throw new Error('No se pudo cargar la imagen');
        }

        // Clip to lasso path and draw the image
        canvas.save();
        canvas.clipPath(originalPath, ClipOp.Intersect, true);
        const imgPaint = Skia.Paint();
        canvas.drawImage(skImage, 0, 0, imgPaint);
        canvas.restore();

        // Export to base64
        surface.flush();
        const snapshot = surface.makeImageSnapshot();
        const encoded = snapshot.encodeToBase64();

        if (cancelled) return;
        setMaskedBase64(encoded);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Error al generar vista previa');
      }
    }

    generateMask();
    return () => {
      cancelled = true;
    };
  }, [imageUri, imageWidth, imageHeight, lassoPath, displayRect]);

  const handleAnalyze = async () => {
    if (!maskedBase64) return;

    try {
      // Write base64 to a temp file using new File API
      const tempFile = new File(Paths.cache, 'chip-mask-temp.jpg');
      if (tempFile.exists) {
        tempFile.delete();
      }
      tempFile.create();
      tempFile.write(maskedBase64, { encoding: 'base64' });

      // Resize for API using new ImageManipulator API
      const longestEdge = Math.max(imageWidth, imageHeight);
      const resizeScale = longestEdge > MAX_API_EDGE ? MAX_API_EDGE / longestEdge : 1;

      const context = ImageManipulator.manipulate(tempFile.uri);

      if (resizeScale < 1) {
        context.resize({
          width: Math.round(imageWidth * resizeScale),
          height: Math.round(imageHeight * resizeScale),
        });
      }

      const imageRef = await context.renderAsync();
      const result = await imageRef.saveAsync({
        compress: JPEG_QUALITY,
        format: SaveFormat.JPEG,
        base64: true,
      });

      if (result.base64) {
        onAnalyze(result.base64, result.width, result.height);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al comprimir imagen');
    }
  };

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 px-6 dark:bg-sand-900">
        <Text className="mb-4 text-center text-base text-red-600">{error}</Text>
        <Pressable
          className="rounded-full border border-sand-300 px-6 py-3 active:bg-sand-100 dark:border-sand-600"
          onPress={onBack}
        >
          <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!maskedBase64) {
    return (
      <View className="flex-1 items-center justify-center bg-sand-50 dark:bg-sand-900">
        <Loader size={80} />
        <Text className="mt-4 text-sm text-sand-500 dark:text-sand-400">
          Generando vista previa…
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-sand-50 dark:bg-sand-900">
      <View className="flex-1 items-center justify-center px-4">
        <Image
          source={{ uri: `data:image/jpeg;base64,${maskedBase64}` }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
      </View>

      <View className="border-t border-sand-200 px-6 py-4 dark:border-sand-700">
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 items-center rounded-full border border-sand-300 py-3 active:bg-sand-100 dark:border-sand-600 dark:active:bg-sand-800"
            onPress={onBack}
            disabled={analyzing}
          >
            <Text className="text-sm font-sans-semibold text-sand-700 dark:text-sand-300">
              Volver
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-full py-3 ${
              analyzing ? 'bg-felt-400' : 'bg-felt-600 active:bg-felt-700'
            }`}
            onPress={handleAnalyze}
            disabled={analyzing}
          >
            <Text className="text-sm font-sans-semibold text-white">
              {analyzing ? 'Analizando…' : 'Analizar'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
