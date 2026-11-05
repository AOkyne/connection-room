// Names for the Lento Room's prompt slots and subjects. Kept apart from the
// seed prompts themselves (prompt-seed.ts) so the admin page can show labels
// without the prompt bank ending up in code sent to browsers.

export type PromptSlot = "weekly" | "midweek" | "learning";

export const PROMPT_CATEGORIES = [
  "performance-anxiety",
  "overthinking",
  "body-awareness",
  "shame-self-acceptance",
  "partner-communication",
  "pleasure-without-pressure",
  "vulnerability",
  "setbacks-self-compassion",
  "intimacy-connection",
  "humor-everyday",
] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  "performance-anxiety": "Performance anxiety",
  overthinking: "Overthinking",
  "body-awareness": "Body awareness",
  "shame-self-acceptance": "Shame and self-acceptance",
  "partner-communication": "Partner communication",
  "pleasure-without-pressure": "Pleasure without pressure",
  vulnerability: "Emotional vulnerability",
  "setbacks-self-compassion": "Setbacks and self-compassion",
  "intimacy-connection": "Intimacy and connection",
  "humor-everyday": "Humor, curiosity and everyday life",
};

export const SLOT_LABELS: Record<PromptSlot, string> = {
  weekly: "The Weekly Conversation",
  midweek: "Midweek Check-In",
  learning: "Something I’m Learning",
};
