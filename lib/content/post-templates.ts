export interface PostTemplate {
  id: string;
  title: string;
  subtitle: string;
  starterPrompts: string[];
  exampleTone?: string;
}

export const postTemplates: PostTemplate[] = [
  {
    id: "three-line-intro",
    title: "Three-Line Introduction",
    subtitle: "New here and arriving",
    starterPrompts: [
      "I'm here because…",
      "I'm hoping to practice…",
      "One thing I'm curious about is…",
    ],
    exampleTone:
      "Direct, honest, and brief. You don't need to sell yourself.",
  },
  {
    id: "softer-intro",
    title: "Softer Introduction",
    subtitle: "Arriving at my own pace",
    starterPrompts: [
      "One word for how I'm arriving:",
      "Something I'm hoping for:",
      "Something I'm not ready to share yet:",
      "A topic I'm interested in exploring:",
    ],
    exampleTone: "Gentle and open. Permission to arrive gradually.",
  },
  {
    id: "small-honesty",
    title: "Small Honesty",
    subtitle: "A small truth I'm practicing",
    starterPrompts: [
      "One small truth I'm noticing is…",
      "What makes it tender or complicated is…",
      "What I'm practicing now is…",
    ],
    exampleTone:
      "Vulnerable but not overwhelming. Small is enough. A sentence is enough.",
  },
  {
    id: "question-carrying",
    title: "Question I'm Carrying",
    subtitle: "A question I'm sitting with",
    starterPrompts: [
      "A question I've been carrying is…",
      "It matters to me because…",
      "I'm not necessarily looking for advice, but I'd welcome…",
    ],
    exampleTone:
      "Curious, not certain. You don't need to know the answer. You just need to wonder aloud.",
  },
  {
    id: "witness-not-fix",
    title: "Witness, Not Fix",
    subtitle: "Something I'd like witnessed",
    starterPrompts: [
      "Something I want to name is…",
      "I don't need this fixed right now.",
      "What would feel supportive is…",
    ],
    exampleTone:
      "Clear about what you need. Presence, not solutions. Acknowledgment, not advice.",
  },
];
