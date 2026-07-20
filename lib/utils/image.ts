/**
 * Browser-only image resize/compression, used before any profile photo
 * upload (lib/utils/storage.ts's uploadProfilePhoto()). Canvas-based --
 * no dependency needed client-side. Profile photos render at a max of
 * ~160px (Avatar's "xl" size) even on retina displays, so there's no
 * reason to ever store an original multi-MB phone-camera photo; this is
 * what actually keeps new uploads small instead of just moving the same
 * multi-MB base64 bytes from Postgres into Storage.
 */

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

/**
 * Resizes an image file to fit within MAX_DIMENSION x MAX_DIMENSION
 * (preserving aspect ratio, never upscaling) and re-encodes it as JPEG.
 * Flattens transparency onto a white background and drops GIF animation
 * (canvas can only ever draw a single frame) -- an acceptable tradeoff
 * for a profile photo, matching what most social apps do.
 */
export async function resizeAndCompressImage(file: File): Promise<Blob> {
  const bitmap = await loadImageBitmap(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image (canvas unavailable)");
  }

  // Flatten any transparency onto white before drawing -- a JPEG has no
  // alpha channel, and an unfilled canvas defaults to transparent black,
  // which would otherwise turn transparent PNG backgrounds solid black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);

  if ("close" in bitmap) bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process image"));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // Safari-era fallback for browsers without createImageBitmap support.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
    return createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
