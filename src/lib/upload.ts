/**
 * Media upload helper (API §16): `POST /media/upload` with progress.
 * Used by S16 (assignment file), S21 (forum image) and S26 (avatar).
 *
 * Mock mode simulates progress and returns a fake URL. Real mode sends
 * multipart form data with XHR, which reports upload progress (the XHR doesn't
 * go through `request()`, so it adds the bearer token and the single 401
 * refresh itself, INTEGRATION.md #2). Photos are converted from HEIC to JPEG
 * and large ones resized first; the API rejects HEIC and SVG.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  apiBaseUrl,
  ApiError,
  getAuthToken,
  refreshAuthToken,
  reportSessionExpired,
} from '@/api/client';
import type { UploadedMedia } from '@/api/types';
import { env } from '@/lib/env';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** Longest edge after resizing; plenty for avatars, forum images and scans. */
const MAX_IMAGE_EDGE = 2048;

export type UploadFolder = 'avatars' | 'forum' | 'assignments';

export interface PickedFile {
  uri: string;
  name: string;
  size: number | null;
  mimeType: string;
}

export interface UploadOptions {
  folder: UploadFolder;
  /** `document` allows PDF, TXT, MD, CSV, DOC and DOCX (≤ 10 MB) as well as images. */
  kind?: 'image' | 'document';
  onProgress?: (fraction: number) => void;
}

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

const isHeic = (file: PickedFile) => /heic|heif/i.test(file.mimeType) || /\.(heic|heif)$/i.test(file.name);
const isSvg = (file: PickedFile) => /svg/i.test(file.mimeType) || /\.svg$/i.test(file.name);
const isPhoto = (file: PickedFile) => /^image\/(jpe?g|png|webp)$/i.test(file.mimeType) || isHeic(file);

/**
 * HEIC → JPEG, and anything over `MAX_IMAGE_EDGE` scaled down to JPEG. Other
 * images (and GIFs, which would lose their animation) are sent as they are.
 */
export async function prepareImage(file: PickedFile): Promise<PickedFile> {
  if (!isPhoto(file)) return file;
  const original = await ImageManipulator.manipulate(file.uri).renderAsync();
  const tooBig = Math.max(original.width, original.height) > MAX_IMAGE_EDGE;
  if (!tooBig && !isHeic(file)) return file;
  const image = tooBig
    ? await ImageManipulator.manipulate(file.uri)
        .resize(original.width >= original.height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE })
        .renderAsync()
    : original;
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return {
    uri: saved.uri,
    name: `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`,
    size: null,
    mimeType: 'image/jpeg',
  };
}

type UploadEnvelope =
  | { success: true; data: UploadedMedia }
  | { success: false; error: { code: string; message: string } };

function send(file: PickedFile, opts: UploadOptions, token: string | null) {
  return new Promise<{ status: number; body: UploadEnvelope | null }>((resolve, reject) => {
    const form = new FormData();
    // React Native's FormData takes a { uri, name, type } file part.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    form.append('folder', opts.folder);
    if (opts.kind === 'document') form.append('kind', 'document');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl}/api/v1/media/upload`);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError('NETWORK', 'Upload failed', 0));
    xhr.onload = () => {
      let body: UploadEnvelope | null = null;
      try {
        body = JSON.parse(xhr.responseText) as UploadEnvelope;
      } catch {
        // Not JSON (a proxy page, a plain-text 429).
      }
      resolve({ status: xhr.status, body });
    };
    xhr.send(form);
  });
}

export async function uploadMedia(picked: PickedFile, opts: UploadOptions): Promise<UploadedMedia> {
  const kind = opts.kind ?? 'image';
  const limit = kind === 'document' ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  const tooLarge = () =>
    codedError('FILE_TOO_LARGE', `Files can be up to ${Math.round(limit / (1024 * 1024))} MB.`);
  if (isSvg(picked)) throw codedError('UNSUPPORTED_MEDIA_TYPE', 'SVG files aren’t supported.');

  if (env.useMocks) {
    if (picked.size !== null && picked.size > limit) throw tooLarge();
    return new Promise((resolve) => {
      let p = 0;
      const timer = setInterval(() => {
        p = Math.min(1, p + 0.2);
        opts.onProgress?.(p);
        if (p >= 1) {
          clearInterval(timer);
          resolve({
            url: `https://example.com/uploads/${opts.folder}/${encodeURIComponent(picked.name)}`,
            publicId: `${opts.folder}/${Date.now().toString(36)}`,
            bytes: picked.size ?? undefined,
          });
        }
      }, 250);
    });
  }

  let file: PickedFile;
  try {
    file = await prepareImage(picked);
  } catch {
    if (isHeic(picked)) throw codedError('UNSUPPORTED_MEDIA_TYPE', 'This photo couldn’t be converted.');
    file = picked;
  }
  if (file.size !== null && file.size > limit) throw tooLarge();

  const sendOpts = { ...opts, kind };
  const token = getAuthToken();
  let res = await send(file, sendOpts, token);
  if (res.status === 401 && token) {
    // Same rule as request(): one refresh, sign out only if it's rejected.
    const fresh = await refreshAuthToken().catch(() => undefined);
    if (fresh === null) reportSessionExpired();
    else if (fresh) res = await send(file, sendOpts, fresh);
  }
  if (res.body?.success) return res.body.data;
  if (res.body && !res.body.success) {
    throw new ApiError(res.body.error.code, res.body.error.message, res.status);
  }
  throw new ApiError(res.status === 429 ? 'RATE_LIMITED' : 'UPLOAD_FAILED', 'Upload failed', res.status);
}
