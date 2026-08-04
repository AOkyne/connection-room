/**
 * Validates a `?next=` redirect target so it can only ever point back
 * into this app, never off-site -- an unvalidated redirect target is a
 * classic open-redirect vector (e.g. `/auth?next=https://evil.example`
 * or `/auth?next=//evil.example` sent in a phishing link, relying on the
 * app's own trusted domain to make the bounce look legitimate).
 *
 * Only a same-origin, path-absolute string survives: must start with a
 * single "/", not "//" (protocol-relative -- browsers treat this as a
 * different origin), and must not contain an embedded scheme
 * (`javascript:`, `https:`, etc.) or a backslash (some browsers treat
 * `/\evil.example` the same as `//evil.example`).
 */
export function getSafeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (typeof next !== "string") return null;

  // Must be path-absolute.
  if (!next.startsWith("/")) return null;
  // Protocol-relative ("//evil.example") resolves to a different origin.
  if (next.startsWith("//")) return null;
  // Backslash-prefixed paths are treated as protocol-relative by some
  // browsers ("/\evil.example" -> "//evil.example").
  if (next.startsWith("/\\") || next.includes("\\")) return null;
  // Reject any embedded scheme (covers "/\tjavascript:..." and similar
  // attempts to sneak a scheme in after the leading slash).
  if (/^[a-z][a-z0-9+.-]*:/i.test(next.replace(/^\/+/, ""))) return null;

  return next;
}
