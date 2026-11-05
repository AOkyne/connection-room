// The Lento Room's gentle rhythm: which scheduled prompt is due, and which
// prompt to use. Pure; the store (lib/lento/room.ts) applies the result and a
// unique index makes each slot publish once per local date even if the job
// runs twice at once.

import { zonedParts } from "@/lib/experience/time";
import type { PromptSlot } from "./prompt-seed";

export interface SlotSchedule {
  day: number; // 0 = Sunday ... 6 = Saturday
  hour: number; // local, 0-23
  enabled: boolean;
}
export type RoomSchedule = Record<PromptSlot, SlotSchedule>;

export const DEFAULT_SCHEDULE: RoomSchedule = {
  weekly: { day: 1, hour: 9, enabled: true },
  midweek: { day: 3, hour: 9, enabled: true },
  learning: { day: 5, hour: 9, enabled: true },
};

export const SLOTS: PromptSlot[] = ["weekly", "midweek", "learning"];

export function normalizeSchedule(raw: unknown): RoomSchedule {
  const out = { ...DEFAULT_SCHEDULE };
  if (raw && typeof raw === "object") {
    for (const slot of SLOTS) {
      const s = (raw as Record<string, unknown>)[slot] as Partial<SlotSchedule> | undefined;
      if (!s) continue;
      const day = Number(s.day);
      const hour = Number(s.hour);
      out[slot] = {
        day: Number.isInteger(day) && day >= 0 && day <= 6 ? day : DEFAULT_SCHEDULE[slot].day,
        hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_SCHEDULE[slot].hour,
        enabled: s.enabled !== false,
      };
    }
  }
  return out;
}

/** Slots due now: today (local) is their day and their hour has arrived. */
export function dueSlots(now: Date, schedule: RoomSchedule, timeZone: string): Array<{ slot: PromptSlot; scheduledFor: string }> {
  const p = zonedParts(now, timeZone);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return SLOTS.filter((slot) => {
    const s = schedule[slot];
    return s.enabled && s.day === weekday && p.hour >= s.hour;
  }).map((slot) => ({ slot, scheduledFor: date }));
}

export interface PromptCandidate {
  id: string;
  slot: PromptSlot;
  category: string;
  enabled: boolean;
  timesPublished: number;
  lastPublishedAt: string | null;
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Next prompt for a slot: the category used least among this slot's recent
 * publications, then the prompt used least, then the one used longest ago,
 * then a stable tie-break that varies by date.
 */
export function pickPrompt(
  prompts: PromptCandidate[],
  slot: PromptSlot,
  recentCategories: string[],
  seed: string
): PromptCandidate | null {
  const pool = prompts.filter((p) => p.enabled && p.slot === slot);
  if (pool.length === 0) return null;
  const recent = new Map<string, number>();
  for (const c of recentCategories) recent.set(c, (recent.get(c) || 0) + 1);
  const key = (p: PromptCandidate): [number, number, number, number] => [
    recent.get(p.category) || 0,
    p.timesPublished,
    p.lastPublishedAt ? new Date(p.lastPublishedAt).getTime() : 0,
    hash(`${seed}:${p.id}`),
  ];
  return pool.reduce((best, p) => {
    const a = key(p);
    const b = key(best);
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? p : best;
    return best;
  });
}
