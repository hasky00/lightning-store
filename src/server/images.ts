import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Product image storage.
 *
 * The admin form resizes images in the browser and sends a data URL. Decoding
 * it to a real file here keeps the catalogue small: a base64 image embedded in
 * products.json would be re-read and re-sent on every single request.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads/";

/** Generous for an 800px JPEG, small enough that no request can fill the disk. */
const MAX_BYTES = 3 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Only these shapes are ever written, so a stored path is always ours. */
const STORED_PATH = /^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** True only for paths this module itself produced. */
export function isStoredImagePath(value: string): boolean {
  return STORED_PATH.test(value);
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/**
 * Accepts a `data:` URL and returns the public path the image was written to.
 * The filename is generated here rather than taken from the client, so no
 * request can choose where its bytes land.
 */
export async function saveImageDataUrl(dataUrl: string): Promise<string> {
  const match = /^data:([a-z/+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new ImageValidationError("Expected a base64 data URL.");
  }

  const [, mimeType, base64] = match;
  const extension = EXTENSION_BY_TYPE[mimeType.toLowerCase()];
  if (!extension) {
    throw new ImageValidationError("Image must be a JPEG, PNG or WebP.");
  }

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) {
    throw new ImageValidationError("Image data is empty.");
  }
  if (bytes.length > MAX_BYTES) {
    throw new ImageValidationError("Image must be under 3 MB once decoded.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(path.join(UPLOAD_DIR, fileName), bytes);

  return `${PUBLIC_PREFIX}${fileName}`;
}

/**
 * Remove an uploaded image when its product goes away. The path is matched
 * against the exact shape this module writes, so a crafted value like
 * "/uploads/../../.env" cannot reach anything outside the upload directory.
 */
export async function deleteImage(publicPath: string): Promise<void> {
  if (!STORED_PATH.test(publicPath)) return;

  const fileName = publicPath.slice(PUBLIC_PREFIX.length);
  try {
    await unlink(path.join(UPLOAD_DIR, fileName));
  } catch {
    // The file may already be gone; deleting the product still succeeded.
  }
}
