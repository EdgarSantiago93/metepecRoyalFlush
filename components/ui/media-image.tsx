import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PressablePhoto, PhotoThumbnail } from '@/components/ui/photo-viewer';
import { getMediaUrl } from '@/services/media/upload';

type MediaImageProps = {
  mediaKey: string;
  variant: 'thumbnail' | 'pressable';
  /** PhotoThumbnail size (default 36) */
  size?: number;
  /** PhotoThumbnail label */
  label?: string;
  /** PressablePhoto height (default 180) */
  height?: number;
  /** PressablePhoto className */
  className?: string;
};

/**
 * Resolves a mediaKey to a displayable URL and renders the appropriate photo component.
 * In mock mode (when mediaKey is already a URL/file URI), uses it directly.
 */
export function MediaImage({
  mediaKey,
  variant,
  size,
  label,
  height,
  className,
}: MediaImageProps) {
  const [uri, setUri] = useState<string | null>(null);
  const [blurhash, setBlurhash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the mediaKey is already a URL or file URI, use it directly (mock mode)
    if (
      mediaKey.startsWith('http://') ||
      mediaKey.startsWith('https://') ||
      mediaKey.startsWith('file://') ||
      mediaKey.startsWith('mock://')
    ) {
      setUri(mediaKey);
      setLoading(false);
      return;
    }

    // Otherwise resolve via API
    let cancelled = false;
    getMediaUrl(mediaKey)
      .then(({ url, blurhash: hash }) => {
        if (!cancelled) {
          setUri(url);
          setBlurhash(hash);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaKey]);

  if (loading) {
    return (
      <View className="items-center justify-center" style={{ height: variant === 'pressable' ? (height ?? 180) : (size ?? 36) }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!uri) return null;

  if (variant === 'thumbnail') {
    return <PhotoThumbnail uri={uri} size={size} label={label} blurhash={blurhash} />;
  }

  return <PressablePhoto uri={uri} height={height} className={className} blurhash={blurhash} />;
}
