/**
 * Media upload helper (API §16): `POST /media/upload` with progress.
 * Used by S16 (assignment file), S21 (forum image) and S26 (avatar).
 *
 * Mock mode simulates progress and returns a fake URL. Real mode sends
 * multipart form data with XHR, which reports upload progress. P2-05 adds
 * the auth header, HEIC → JPEG conversion and resizing.
 */
import type { UploadedMedia } from '@/api/types';
import { env } from '@/lib/env';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

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

export function uploadMedia(file: PickedFile, opts: UploadOptions): Promise<UploadedMedia> {
  const kind = opts.kind ?? 'image';
  const limit = kind === 'document' ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (file.size !== null && file.size > limit) {
    return Promise.reject(
      codedError('FILE_TOO_LARGE', `Files can be up to ${Math.round(limit / (1024 * 1024))} MB.`),
    );
  }
  if (/heic|heif|svg/i.test(file.mimeType) || /\.(heic|heif|svg)$/i.test(file.name)) {
    return Promise.reject(codedError('UNSUPPORTED_MEDIA_TYPE', 'HEIC and SVG files aren’t supported.'));
  }

  if (env.useMocks) {
    return new Promise((resolve) => {
      let p = 0;
      const timer = setInterval(() => {
        p = Math.min(1, p + 0.2);
        opts.onProgress?.(p);
        if (p >= 1) {
          clearInterval(timer);
          resolve({
            url: `https://example.com/uploads/${opts.folder}/${encodeURIComponent(file.name)}`,
            publicId: `${opts.folder}/${Date.now().toString(36)}`,
            bytes: file.size ?? undefined,
          });
        }
      }, 250);
    });
  }

  return new Promise((resolve, reject) => {
    const form = new FormData();
    // React Native's FormData takes a { uri, name, type } file part.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    form.append('folder', opts.folder);
    if (kind === 'document') form.append('kind', 'document');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiUrl.replace(/\/$/, '')}/api/v1/media/upload`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(codedError('NETWORK', 'Upload failed'));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as
          | { success: true; data: UploadedMedia }
          | { success: false; error: { code: string; message: string } };
        if (body.success) resolve(body.data);
        else reject(codedError(body.error.code, body.error.message));
      } catch {
        reject(codedError(xhr.status === 429 ? 'RATE_LIMITED' : 'UPLOAD_FAILED', 'Upload failed'));
      }
    };
    xhr.send(form);
  });
}
