// Warm, varied reaction system for The Connection Room
// Each reaction celebrates different ways of witnessing and connecting

export const REACTIONS = {
  feel_this: "I feel this",
  shifted_something: "That shifted something",
  cheering_you_on: "Cheering you on!",
  oof_too_real: "Oof, too real",
  made_me_smile: "Made me smile",
  same_here: "Same here",
  glad_you_shared: "Glad you shared",
  sending_warmth: "Sending warmth",
  now_im_thinking: "Now I'm thinking",
  called_out_lovingly: "Called out, lovingly",
  tiny_standing_ovation: "Tiny standing ovation",
  laughing_because_true: "Laughing because it's true",
} as const;

export const PRIMARY_REACTION_KEYS = [
  "feel_this",
  "shifted_something",
  "cheering_you_on",
  "oof_too_real",
  "made_me_smile",
] as const;

export const MORE_REACTION_KEYS = [
  "same_here",
  "glad_you_shared",
  "sending_warmth",
  "now_im_thinking",
  "called_out_lovingly",
  "tiny_standing_ovation",
  "laughing_because_true",
] as const;

// Mapping old reaction keys to new ones for migration
export const REACTION_MIGRATION_MAP: Record<string, keyof typeof REACTIONS> = {
  // Old → New
  relate: "feel_this",
  "thank-you": "glad_you_shared",
  feeling: "shifted_something",
  thoughtful: "now_im_thinking",
  witnessing: "feel_this",
  holding: "sending_warmth",
  useful: "shifted_something",
};

// Reverse map for checking if an old reaction exists
export function migrateOldReactionKey(oldKey: string): string {
  const newKey = REACTION_MIGRATION_MAP[oldKey];
  if (newKey && newKey in REACTIONS) {
    return newKey;
  }
  // If not in migration map, return as-is (might be a new key)
  return oldKey;
}

// Get primary reactions as an array
export function getPrimaryReactions() {
  return PRIMARY_REACTION_KEYS.map((key) => ({
    id: key,
    label: REACTIONS[key],
  }));
}

// Get more reactions as an array
export function getMoreReactions() {
  return MORE_REACTION_KEYS.map((key) => ({
    id: key,
    label: REACTIONS[key],
  }));
}

// Get all reactions
export function getAllReactions() {
  return [
    ...PRIMARY_REACTION_KEYS,
    ...MORE_REACTION_KEYS,
  ].map((key) => ({
    id: key,
    label: REACTIONS[key],
  }));
}

// Check if a reaction key is valid
export function isValidReactionKey(key: string): key is keyof typeof REACTIONS {
  return key in REACTIONS;
}
