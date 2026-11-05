// Seed prompts for the Lento Room's gentle rhythm (written 2026-11-04).
// Imported once into lento_room_prompts by seed_id; after that admins edit
// them in /app/admin/lento-room and this file is not read again for them.
//
// Writing rules: no clinical language; no assumptions about orientation,
// relationship status or experience; never treat erections, orgasm,
// frequency or a partner's satisfaction as a measure of success; nothing
// that needs a particular Lento lesson or season.

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

export interface SeedPrompt {
  seedId: string;
  slot: PromptSlot;
  category: PromptCategory;
  body: string;
}

const W = (n: number, category: PromptCategory, body: string): SeedPrompt => ({
  seedId: `weekly-${String(n).padStart(2, "0")}`,
  slot: "weekly",
  category,
  body,
});
const M = (n: number, category: PromptCategory, body: string): SeedPrompt => ({
  seedId: `midweek-${String(n).padStart(2, "0")}`,
  slot: "midweek",
  category,
  body,
});
const L = (n: number, category: PromptCategory, body: string): SeedPrompt => ({
  seedId: `learning-${String(n).padStart(2, "0")}`,
  slot: "learning",
  category,
  body,
});

export const SEED_PROMPTS: SeedPrompt[] = [
  // Monday: The Weekly Conversation
  W(1, "performance-anxiety", "What happens in your mind when you start feeling pressure during intimacy?"),
  W(2, "performance-anxiety", "Where do you think your ideas about “performing” in bed first came from?"),
  W(3, "performance-anxiety", "If the pressure to perform disappeared tomorrow, what would you want intimacy to feel like?"),
  W(4, "performance-anxiety", "What’s one thing you used to believe a “real man” had to do in bed that you’re starting to question?"),
  W(5, "overthinking", "What helps you come back to the moment when you notice yourself overthinking?"),
  W(6, "overthinking", "What does your inner commentator tend to say when things get close? Has its voice changed over time?"),
  W(7, "overthinking", "Is there a place in your life where you’re fully absorbed and not watching yourself? What’s different there?"),
  W(8, "overthinking", "When your thoughts start racing, what’s the very first sign you notice?"),
  W(9, "body-awareness", "What are you learning about your relationship with your body?"),
  W(10, "body-awareness", "Where in your body do you feel nervousness first?"),
  W(11, "body-awareness", "What does feeling relaxed actually feel like for you, physically?"),
  W(12, "body-awareness", "Is there a kind of touch, on any part of you, that helps you feel safe and settled?"),
  W(13, "shame-self-acceptance", "What’s something about sex or intimacy you were never told was normal, and wish you had been?"),
  W(14, "shame-self-acceptance", "What would you say to a younger version of yourself about the worries you carry around sex?"),
  W(15, "shame-self-acceptance", "Is there a part of yourself you’re slowly learning to be kinder to?"),
  W(16, "shame-self-acceptance", "What made it hard to talk about any of this before you found Lento?"),
  W(17, "partner-communication", "What is something you wish a partner understood about performance anxiety?"),
  W(18, "partner-communication", "Have you ever said out loud what you were worried about in an intimate moment? What happened?"),
  W(19, "partner-communication", "What words or phrases make it easier for you to ask for what you want, or to slow things down?"),
  W(20, "partner-communication", "If you’re not with anyone right now, what would you want a future partner to know about you early on?"),
  W(21, "pleasure-without-pressure", "Have you noticed a difference between trying to perform and simply allowing yourself to experience pleasure?"),
  W(22, "pleasure-without-pressure", "What does pleasure mean to you when there’s no goal or finish line?"),
  W(23, "pleasure-without-pressure", "What’s a small, everyday pleasure you’ve learned to slow down for?"),
  W(24, "pleasure-without-pressure", "When have you enjoyed closeness most, and what made it feel easy?"),
  W(25, "vulnerability", "What does it take for you to let someone see you when you’re not feeling confident?"),
  W(26, "vulnerability", "Who, if anyone, have you been able to talk to about this? What made that possible?"),
  W(27, "vulnerability", "What helps you feel a little less alone with all of this?"),
  W(28, "vulnerability", "What makes a space feel safe enough for you to be honest?"),
  W(29, "setbacks-self-compassion", "How do you treat yourself after an intimate moment that didn’t go how you hoped?"),
  W(30, "setbacks-self-compassion", "What helps you recover after a rough day with your anxiety?"),
  W(31, "setbacks-self-compassion", "Has a setback ever taught you something you’re now glad to know?"),
  W(32, "setbacks-self-compassion", "What would treating yourself like a good friend look like the next time things feel hard?"),
  W(33, "intimacy-connection", "What does intimacy mean to you beyond sex?"),
  W(34, "intimacy-connection", "When do you feel most connected to another person?"),
  W(35, "intimacy-connection", "What small moments of closeness matter most to you?"),
  W(36, "intimacy-connection", "Has your idea of a good intimate experience changed? How?"),
  W(37, "humor-everyday", "What is something about intimacy you can laugh about now?"),
  W(38, "humor-everyday", "What’s the most unhelpful piece of sex advice you’ve ever been given?"),
  W(39, "humor-everyday", "What’s something unrelated to sex that’s helped you relax lately? A walk, a song, a recipe, anything."),
  W(40, "humor-everyday", "If your anxiety had a name and a personality, what would it be like?"),
  W(41, "performance-anxiety", "What would you like to stop measuring yourself by?"),
  W(42, "intimacy-connection", "What helps you feel close to someone when words are hard to find?"),

  // Wednesday: Midweek Check-In
  M(1, "vulnerability", "Midweek check-in: how are you arriving today, in your body and in your head?"),
  M(2, "body-awareness", "How has your body been feeling this week? Tense, tired, easy, something else?"),
  M(3, "overthinking", "What’s been taking up the most room in your mind this week?"),
  M(4, "setbacks-self-compassion", "What’s one kind thing you could do for yourself before the week is out?"),
  M(5, "vulnerability", "Is there anything you’ve been carrying this week that you’d like to set down here?"),
  M(6, "humor-everyday", "What’s something small that made you feel good about yourself this week?"),
  M(7, "body-awareness", "When did you last feel genuinely calm this week? What were you doing?"),
  M(8, "shame-self-acceptance", "Has anything this week surprised you about how you’re handling things?"),
  M(9, "intimacy-connection", "Who or what has helped you feel connected this week?"),
  M(10, "overthinking", "How has your sleep and your headspace been lately?"),

  // Friday: Something I'm Learning
  L(1, "pleasure-without-pressure", "Something I’m learning: share a discovery, a frustration, a realization or a small moment of progress from this week."),
  L(2, "body-awareness", "What did you notice about your body this week that you hadn’t noticed before?"),
  L(3, "overthinking", "What’s one thought pattern you caught yourself in this week, and what did you do with it?"),
  L(4, "setbacks-self-compassion", "What felt hard this week, and what did it teach you?"),
  L(5, "partner-communication", "Did you say something this week, to anyone, that you’re proud of saying?"),
  L(6, "shame-self-acceptance", "What’s one belief about yourself you’re starting to loosen your grip on?"),
  L(7, "pleasure-without-pressure", "What’s one moment this week where you let yourself slow down?"),
  L(8, "humor-everyday", "What made you laugh at yourself, kindly, this week?"),
  L(9, "performance-anxiety", "What’s one thing that felt a little easier this week than it used to?"),
  L(10, "intimacy-connection", "What are you learning about what you actually want from closeness?"),
];
