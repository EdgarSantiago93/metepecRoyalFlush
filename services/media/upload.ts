import { apiFetch } from '@/services/api/http-auth-client';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * PUT a local file to a URL using XHR. React Native's fetch often does not send
 * Blob/body on PUT; XHR with { uri } lets the native layer read the file and send the bytes.
 */
function putFileToUrl(
  fileUri: string,
  url: string,
  contentType: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = (e) => reject(new Error(e.toString()));
    // React Native: send file by URI so native layer reads and sends the bytes
    (xhr as unknown as { send(body: { uri: string; type: string }): void }).send({
      uri: fileUri,
      type: contentType,
    });
  });
}

type UploadMediaResult = {
  mediaKey: string;
};

type PresignedUrlResponse = {
  r2Key: string;
  uploadUrl: string;
};

/**
 * Uploads a local image to the backend via presigned R2 URL.
 *
 * 1. Converts any format (HEIC/HEIF/PNG) to compressed JPEG
 * 2. Gets a presigned upload URL from POST /media/upload-url
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

  // 2. Get file size (manipulateAsync does not return file size) — read once for size
  const sizeResponse = await fetch(manipulated.uri);
  const blob = await sizeResponse.blob();
  const sizeBytes = blob.size;

  // 3. Get presigned URL
  const filename = `upload-${Date.now()}.jpg`;
  const { r2Key, uploadUrl } = await apiFetch<PresignedUrlResponse>('/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      contentType: 'image/jpeg',
      fileName: filename,
      sizeBytes: sizeBytes,
    }),
  });

  // 4. Upload binary to R2 — use XHR so the file body is actually sent (RN fetch often drops Blob body on PUT)
  await putFileToUrl(manipulated.uri, uploadUrl, 'image/jpeg');

  // 5. Return the media key (R2 key used to resolve the public URL later)
  return { mediaKey: r2Key };
}

/**
 * Resolves a mediaKey to a publicly accessible URL and optional blurhash.
 */
export async function getMediaUrl(
  mediaKey: string,
): Promise<{ url: string; blurhash: string | null }> {
  const { url, blurhash } = await apiFetch<{ url: string; blurhash?: string }>(
    `/media/${mediaKey}`,
  );
  return { url, blurhash: blurhash ?? null };
}
