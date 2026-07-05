/**
 * Invite code utilities
 * Generates and formats invite codes for member invitations
 */

/**
 * Generate a random alphanumeric suffix
 */
function generateRandomSuffix(length: number = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a URL-safe slug from display name
 */
function createSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .trim()
    .split(/\s+/)[0] // Get first word
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
    .substring(0, 15); // Limit length
}

/**
 * Generate invite code in format: slug-random6
 * Example: marcus-h-8k2r9q
 */
export function generateInviteCode(displayName: string): string {
  const slug = createSlug(displayName) || "member";
  const suffix = generateRandomSuffix(6);
  return `${slug}-${suffix}`;
}

/**
 * Build invite link
 */
export function buildInviteLink(inviteCode: string, baseUrl: string = "https://community.trevorjamesla.com"): string {
  return `${baseUrl}/join?ref=${inviteCode}`;
}

/**
 * Extract invite code from URL
 */
export function extractInviteCodeFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url, "https://community.trevorjamesla.com");
    return urlObj.searchParams.get("ref");
  } catch {
    return null;
  }
}

/**
 * Store invite code in session storage for preserving through signup
 */
export function storeInviteCodeInSession(inviteCode: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("connection-room:invite-code", inviteCode);
  }
}

/**
 * Retrieve invite code from session storage
 */
export function getInviteCodeFromSession(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("connection-room:invite-code");
}

/**
 * Clear invite code from session storage
 */
export function clearInviteCodeFromSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("connection-room:invite-code");
  }
}
