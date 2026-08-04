import { getSafeNextPath } from "./safe-redirect";

/**
 * Preserves a validated `?next=` deep-link target across the signup ->
 * onboarding hop, which today always lands on /onboarding regardless of
 * where the user was trying to go. Mirrors storeInviteCodeInSession's
 * exact shape (lib/utils/invite-code.ts) -- sessionStorage, not
 * localStorage, since this only needs to survive the current browser tab
 * through one auth flow, not persist indefinitely.
 */
const PENDING_REDIRECT_KEY = "connection-room:pending-redirect";

export function storePendingRedirect(next: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = getSafeNextPath(next);
  if (!safe) return;
  sessionStorage.setItem(PENDING_REDIRECT_KEY, safe);
}

export function getAndClearPendingRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(PENDING_REDIRECT_KEY);
  sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  return getSafeNextPath(stored);
}
