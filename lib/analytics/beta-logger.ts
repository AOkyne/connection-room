/**
 * Beta diagnostics logger for The Connection Room
 * Logs action outcomes without capturing sensitive user data
 */

export type EventCategory =
  | "onboarding"
  | "reflection"
  | "commenting"
  | "door"
  | "quiz"
  | "connection"
  | "event"
  | "navigation"
  | "loading";

export type EventOutcome = "started" | "succeeded" | "failed" | "timeout";

export interface BetaEvent {
  category: EventCategory;
  action: string;
  outcome: EventOutcome;
  timestamp: number;
  route: string;
  userMode: "demo" | "supabase" | "unknown";
  errorMessage?: string;
  durationMs?: number;
}

const BETA_LOGS_KEY = "connection-room:beta-logs";
const MAX_LOGS = 100;

/**
 * Log a beta event for diagnostics
 * Does NOT capture: reflection content, form answers, emails, message content
 * Captures: action category, success/failure, timing, route, environment
 */
export function logBetaEvent(event: Omit<BetaEvent, "timestamp">): void {
  if (typeof window === "undefined") return;

  const enrichedEvent: BetaEvent = {
    ...event,
    timestamp: Date.now(),
  };

  try {
    const stored = localStorage.getItem(BETA_LOGS_KEY);
    const logs: BetaEvent[] = stored ? JSON.parse(stored) : [];

    // Keep only recent logs
    logs.push(enrichedEvent);
    const recentLogs = logs.slice(-MAX_LOGS);

    localStorage.setItem(BETA_LOGS_KEY, JSON.stringify(recentLogs));

    // Also log to console for immediate visibility in dev
    console.log(
      `[Beta] ${event.category}/${event.action}: ${event.outcome}`,
      event.errorMessage ? `- ${event.errorMessage}` : ""
    );
  } catch (err) {
    console.error("Failed to log beta event:", err);
  }
}

/**
 * Get user mode (demo vs Supabase)
 */
export function getUserMode(): "demo" | "supabase" | "unknown" {
  if (typeof window === "undefined") return "unknown";

  try {
    // Check if Supabase session exists
    const supabaseSession = localStorage.getItem("sb-session");
    return supabaseSession ? "supabase" : "demo";
  } catch {
    return "unknown";
  }
}

/**
 * Get all collected beta logs
 */
export function getBetaLogs(): BetaEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(BETA_LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear beta logs
 */
export function clearBetaLogs(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(BETA_LOGS_KEY);
    console.log("Beta logs cleared");
  } catch (err) {
    console.error("Failed to clear beta logs:", err);
  }
}

/**
 * Export logs for debugging (safe to share - no sensitive data)
 */
export function exportBetaLogs(): string {
  const logs = getBetaLogs();
  return JSON.stringify(logs, null, 2);
}
