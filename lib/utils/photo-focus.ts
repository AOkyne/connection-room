import type { CSSProperties } from "react";

// A member's chosen framing for their profile photo (set on the Profile
// page's "Adjust framing" editor) travels as a URL fragment on the photo
// itself: `…/photo.jpg#pos=50,32`. The fragment is stored on
// profiles.profile_photo_path, and every read path already builds the
// photo URL from that path by plain string concatenation
// (buildProfilePhotoUrl), so the framing reaches every avatar in the app --
// including the partner_photo / author_photo snapshots copied into
// connections and posts -- without a new column or any query changes.
// Browsers never send a fragment to the server, so the image itself loads
// exactly as before.
//
// The two numbers are CSS object-position percentages (0-100), already
// computed for a square/circular frame (see focusPointToObjectPosition),
// so every renderer just applies them as-is.
const FOCUS_FRAGMENT_RE = /#pos=(\d{1,3}),(\d{1,3})$/;

export interface PhotoFocus {
  x: number;
  y: number;
}

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function parsePhotoFocus(ref: string | null | undefined): PhotoFocus | null {
  if (!ref) return null;
  const match = ref.match(FOCUS_FRAGMENT_RE);
  if (!match) return null;
  return { x: clampPercent(Number(match[1])), y: clampPercent(Number(match[2])) };
}

export function stripPhotoFocus(ref: string): string {
  return ref.replace(FOCUS_FRAGMENT_RE, "");
}

export function withPhotoFocus(ref: string, focus: PhotoFocus | null): string {
  const base = stripPhotoFocus(ref);
  if (!focus) return base;
  return `${base}#pos=${clampPercent(focus.x)},${clampPercent(focus.y)}`;
}

/**
 * Inline style for an <img className="object-cover"> showing a profile
 * photo. Returns undefined when the member hasn't set a framing, so the
 * element's own object-position class (e.g. Avatar's object-top) still
 * applies.
 */
export function photoFocusStyle(ref: string | null | undefined): CSSProperties | undefined {
  const focus = parsePhotoFocus(ref);
  return focus ? { objectPosition: `${focus.x}% ${focus.y}%` } : undefined;
}

/**
 * Converts the point a member tapped (fractions 0-1 of the full image) into
 * the object-position that puts that point in the middle of a square
 * object-cover frame -- or as close as possible without showing past the
 * image's edge.
 *
 * object-position p% places the image's p% point at the frame's p% point,
 * so passing the tapped point straight through would only center it when
 * it's already in the middle. For a square frame of side 1, a cover-scaled
 * image's long side has length L = long/short (> 1); centering point f
 * needs an offset of f*L - 0.5, and the percentage is that offset over the
 * overflow (L - 1).
 */
export function focusPointToObjectPosition(
  point: { x: number; y: number },
  natural: { width: number; height: number }
): PhotoFocus {
  const shortSide = Math.min(natural.width, natural.height);
  const toPercent = (fraction: number, length: number) => {
    const scaled = length / shortSide;
    const overflow = scaled - 1;
    if (overflow <= 0.001) return 50; // this axis isn't cropped at all
    return clampPercent(((fraction * scaled - 0.5) / overflow) * 100);
  };
  return { x: toPercent(point.x, natural.width), y: toPercent(point.y, natural.height) };
}
