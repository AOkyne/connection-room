export interface WayToConnect {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
}

export const waysToConnect: WayToConnect[] = [
  {
    id: "introduce",
    title: "Introduce yourself in The Commons",
    description: "A few sentences about who you are and why you're here.",
    actionLabel: "Visit The Commons",
    actionHref: "/app/spaces/commons",
  },
  {
    id: "witness",
    title: "Comment thoughtfully on one member's post",
    description: "Presence before advice. A few words of witness.",
    actionLabel: "Find a post to witness",
    actionHref: "/app/spaces/commons",
  },
  {
    id: "prompt",
    title: "Answer this week's community prompt",
    description: "A chance to practice honesty alongside others.",
    actionLabel: "See this week's prompt",
    actionHref: "/app",
  },
  {
    id: "share",
    title: "Share something you are learning about yourself",
    description: "Small reflection. Big impact on the room.",
    actionLabel: "Share a reflection",
    actionHref: "/app/spaces/commons",
  },
  {
    id: "react",
    title: "Witness someone else with a reaction",
    description: "A small reaction can be powerful.",
    actionLabel: "Browse recent posts",
    actionHref: "/app/spaces/commons",
  },
];

export const waysToConnectHeader =
  "Connection does not have to start with a big reveal. Choose one small way to participate.";

export const connectionInterestPrompt =
  "This does not contact anyone. It simply helps us understand what kinds of connection conversations you may want in the future.";

export const connectionThemes = [
  "Touch and affection",
  "Embodiment",
  "Desire",
  "Shame and self-acceptance",
  "Dating and vulnerability",
  "Spirituality and sexuality",
  "Relationship repair",
  "Friendship and belonging",
  "Asking and receiving",
  "Emotional honesty",
];

export const connectionMilestones = [
  {
    id: "first-share",
    title: "First Share",
    description: "You shared something in the community.",
    message:
      "You shared something in the community. Thank you for helping shape the space.",
  },
  {
    id: "first-witness",
    title: "First Witness",
    description: "You left your first thoughtful comment.",
    message:
      "You left your first thoughtful comment. That is part of how this room becomes a room.",
  },
  {
    id: "thoughtful-witness",
    title: "Thoughtful Witness",
    description: "You have responded to others with care.",
    message:
      "You have responded to others with care. This kind of presence matters here.",
  },
  {
    id: "community-builder",
    title: "Community Builder",
    description: "You are helping create the culture of this room.",
    message:
      "You are helping create the culture of this room through honest sharing and thoughtful response.",
  },
  {
    id: "steady-return",
    title: "Steady Return",
    description: "You are building a rhythm of return.",
    message:
      "You are building a rhythm of return. Small participation counts.",
  },
];

export const connectionPracticeCopy = `You are not just consuming. You are practicing connection.`;
