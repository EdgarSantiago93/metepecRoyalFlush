import { apiFetch } from '@/services/api/http-auth-client';
import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import { encode as encodeBlurhash } from 'blurhash';
import { File } from 'expo-file-system';
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

const BLURHASH_SIZE = 32;
const BLURHASH_COMPONENTS_X = 4;
const BLURHASH_COMPONENTS_Y = 3;

/**
 * Generate a blurhash string from a local image URI.
 * Resizes to 32×32, reads RGBA pixels via Skia, and encodes.
 * Returns null on any error — blurhash is non-blocking.
 */
async function generateBlurhash(imageUri: string): Promise<string | null> {
  try {
    // 1. Resize to tiny thumbnail for fast pixel reading
    const thumb = await manipulateAsync(
      imageUri,
      [{ resize: { width: BLURHASH_SIZE, height: BLURHASH_SIZE } }],
      { format: SaveFormat.PNG },
    );

    // 2. Read file as base64 and load into Skia
    const file = new File(thumb.uri);
    const base64Data = await file.base64();
    const skData = Skia.Data.fromBase64(base64Data);
    const skImage = Skia.Image.MakeImageFromEncoded(skData);
    if (!skImage) return null;

    // 3. Read RGBA pixels
    const pixels = skImage.readPixels(0, 0, {
      width: BLURHASH_SIZE,
      height: BLURHASH_SIZE,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!pixels) return null;

    // 4. Encode to blurhash
    return encodeBlurhash(
      new Uint8ClampedArray(pixels.buffer),
      BLURHASH_SIZE,
      BLURHASH_SIZE,
      BLURHASH_COMPONENTS_X,
      BLURHASH_COMPONENTS_Y,
    );
  } catch {
    return null;
  }
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

  // 2. Get file size and generate blurhash in parallel
  const [sizeBytes, blurhash] = await Promise.all([
    fetch(manipulated.uri)
      .then((r) => r.blob())
      .then((b) => b.size),
    generateBlurhash(manipulated.uri),
  ]);

  // 3. Get presigned URL
  const filename = `upload-${Date.now()}.jpg`;
  const { r2Key, uploadUrl } = await apiFetch<PresignedUrlResponse>('/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      contentType: 'image/jpeg',
      fileName: filename,
      sizeBytes,
      blurhash,
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
