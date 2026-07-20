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
    try {
      // Phone photos commonly store pixel data in landscape with an EXIF
      // orientation tag telling viewers to rotate it for display. An <img>
      // tag honors that tag automatically, but createImageBitmap's default
      // ("none") does not -- it hands back the raw, unrotated pixels,
      // which then get drawn onto the canvas and re-encoded with the
      // rotation baked in as sideways, permanently (the JPEG output has no
      // EXIF of its own). imageOrientation: "from-image" makes it apply
      // the tag before handing back the bitmap, matching what <img>
      // already does.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (err) {
      // Confirmed live: mobile Safari's createImageBitmap exists (so the
      // branch above is taken) but rejects the imageOrientation option
      // outright, breaking photo upload entirely on Safari with no
      // fallback -- because the fallback below used to be gated purely on
      // "does createImageBitmap exist", not "did it actually succeed".
      // Fall through to the <img>-based path on ANY failure here, not
      // just when the function is missing.
      console.warn("createImageBitmap with imageOrientation failed, falling back:", err);
    }
  }
  // Fallback for browsers without createImageBitmap support, or where it
  // exists but rejects the options above (e.g. mobile Safari). <img>
  // already honors EXIF orientation itself when decoding, so drawing it
  // onto a canvas here produces the same correctly-rotated result.
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
