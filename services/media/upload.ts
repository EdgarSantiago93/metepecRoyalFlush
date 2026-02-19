import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { apiFetch } from '@/services/api/http-auth-client';

type UploadMediaResult = {
  mediaKey: string;
};

type PresignedUrlResponse = {
  id: string;
  url: string;
};

/**
 * Uploads a local image to the backend via presigned R2 URL.
 *
 * 1. Converts any format (HEIC/HEIF/PNG) to compressed JPEG
 * 2. Gets a presigned upload URL from POST /media
 * 3. PUTs the binary to R2
 * 4. Returns the mediaKey (R2 ID)
 */
export async function uploadMedia(
  localUri: string,
  options?: { compress?: number },
): Promise<UploadMediaResult> {
  const compress = options?.compress ?? 0.7;

  // 1. Convert to compressed JPEG
  const manipulated = await manipulateAsync(localUri, [], {
    compress,
    format: SaveFormat.JPEG,
  });

  // 2. Get presigned URL
  const filename = `upload-${Date.now()}.jpg`;
  const { id, url } = await apiFetch<PresignedUrlResponse>('/media', {
    method: 'POST',
    body: JSON.stringify({ contentType: 'image/jpeg', filename }),
  });

  // 3. Upload binary to R2
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });

  // 4. Return the media key
  return { mediaKey: id };
}

/**
 * Resolves a mediaKey to a publicly accessible URL.
 */
export async function getMediaUrl(mediaKey: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/media/${mediaKey}`);
  return url;
}
