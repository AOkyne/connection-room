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
 * Resizes an image file to fit within maxDimension x maxDimension
 * (preserving aspect ratio, never upscaling) and re-encodes it as JPEG.
 * Flattens transparency onto a white background and drops GIF animation
 * (canvas can only ever draw a single frame) -- an acceptable tradeoff
 * for a profile photo, matching what most social apps do.
 */
export async function resizeAndCompressImage(file: File, maxDimension: number = MAX_DIMENSION): Promise<Blob> {
  const bitmap = await loadImageBitmap(file, maxDimension);

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
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

async function loadImageBitmap(file: File, maxDimension: number): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    // Ask the browser to downsample *during* decode via resizeWidth --
    // modern iPhones (12 Pro+) shoot up to 48MP (~8064x6048), which decodes
    // to well over 100MB of raw RGBA before any resizing ever happens if
    // decoded at full resolution first. On a memory-constrained mobile
    // Safari tab that can silently kill/reload the page with no JS
    // exception at all -- no error to catch, upload just appears to do
    // "nothing". Specifying only resizeWidth (not resizeHeight) lets the
    // browser preserve aspect ratio on its own rather than us needing to
    // know the source dimensions up front. resizeQuality defaults to
    // "low" (nearest-neighbor) if omitted, which looks noticeably worse
    // than the final canvas draw needs to for a profile-photo thumbnail.
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
        resizeWidth: maxDimension,
        resizeQuality: "medium",
      });
    } catch (err) {
      // Confirmed live: mobile Safari's createImageBitmap exists (so the
      // branch above is taken) but rejects the imageOrientation option
      // outright, breaking photo upload entirely on Safari with no
      // fallback -- because the fallback below used to be gated purely on
      // "does createImageBitmap exist", not "did it actually succeed".
      // Retry without the resize options in case it's specifically those
      // (rather than imageOrientation) a given browser doesn't support,
      // before falling all the way through to the <img>-based path.
      console.warn("createImageBitmap with resize options failed, retrying without them:", err);
    }
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (err) {
      console.warn("createImageBitmap with imageOrientation failed, falling back:", err);
    }
  }
  // Fallback for browsers without createImageBitmap support, or where it
  // exists but rejects every option combination above. <img> already
  // honors EXIF orientation itself when decoding. Feeding the loaded <img>
  // straight into createImageBitmap's own resize (rather than manually
  // drawing it onto a full-resolution canvas first, which is what this
  // used to do) keeps the same memory benefit in this path too, and avoids
  // a separate unguarded canvas 2D context that could otherwise silently
  // produce a blank image if getContext("2d") ever returned null here.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = url;
    });
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(img, { resizeWidth: maxDimension, resizeQuality: "medium" });
      } catch (err) {
        console.warn("createImageBitmap(img) with resize failed, falling back to canvas:", err);
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process image (canvas unavailable)");
    }
    ctx.drawImage(img, 0, 0);
    return createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
