export interface EmptyStatePrompt {
  id: string;
  text: string;
  spaceName?: string;
}

export const genericEmptyStatePrompts: EmptyStatePrompt[] = [
  { id: "generic-1", text: "What drew you to this topic?" },
  { id: "generic-2", text: "What are you hoping to understand better?" },
  { id: "generic-3", text: "What is one question you are carrying?" },
];

export const spaceSpecificPrompts: Record<string, EmptyStatePrompt[]> = {
  "touch-affection": [
    {
      id: "touch-1",
      spaceName: "Touch & Affection",
      text: "What kind of affection feels meaningful to you?",
    },
    {
      id: "touch-2",
      spaceName: "Touch & Affection",
      text: "What makes touch feel safe or complicated?",
    },
    {
      id: "touch-3",
      spaceName: "Touch & Affection",
      text: "What kind of closeness do you miss?",
    },
  ],
  "embodiment": [
    {
      id: "embodiment-1",
      spaceName: "Embodiment Practice",
      text: "Where do you notice tension today?",
    },
    {
      id: "embodiment-2",
      spaceName: "Embodiment Practice",
      text: "What helps you come back to your body?",
    },
    {
      id: "embodiment-3",
      spaceName: "Embodiment Practice",
      text: "What does your body seem to need this week?",
    },
  ],
  "dating-desire": [
    {
      id: "dating-1",
      spaceName: "Dating, Desire & Vulnerability",
      text: "Where do you notice yourself performing in dating or desire?",
    },
    {
      id: "dating-2",
      spaceName: "Dating, Desire & Vulnerability",
      text: "What kind of honesty feels risky but important?",
    },
    {
      id: "dating-3",
      spaceName: "Dating, Desire & Vulnerability",
      text: "What do you wish felt easier to say?",
    },
  ],
  "couples": [
    {
      id: "couples-1",
      spaceName: "Couples, Closeness & Repair",
      text: "What kind of repair feels possible right now?",
    },
    {
      id: "couples-2",
      spaceName: "Couples, Closeness & Repair",
      text: "What does closeness mean in this season of your relationship?",
    },
    {
      id: "couples-3",
      spaceName: "Couples, Closeness & Repair",
      text: "Where do you want less pressure and more honesty?",
    },
  ],
  "spirituality": [
    {
      id: "spirituality-1",
      spaceName: "Spirituality, Sexuality & Integration",
      text: "What part of your life wants more integration?",
    },
    {
      id: "spirituality-2",
      spaceName: "Spirituality, Sexuality & Integration",
      text: "What helps sexuality feel honest instead of hidden or performed?",
    },
    {
      id: "spirituality-3",
      spaceName: "Spirituality, Sexuality & Integration",
      text: "What does spirituality look like in ordinary life?",
    },
  ],
};

export const emptyStateHeader =
  "This room is still forming.\n\nEvery thoughtful community begins with a few people willing to speak first.\n\nYou can help set the tone by answering one of the prompts below.";

export function getEmptyStatePromptsForSpace(spaceId: string): EmptyStatePrompt[] {
  return spaceSpecificPrompts[spaceId] || genericEmptyStatePrompts;
}
