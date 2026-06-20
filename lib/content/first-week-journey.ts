// The Seven Doors of Connection
// A guided first-week journey for new members

export interface DoorAction {
  id: string;
  label: string;
  type: "profile" | "quiz" | "post" | "comment" | "pairing" | "reflection" | "link";
  href?: string;
  description?: string;
}

export interface Door {
  doorNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  theme: string;
  description: string;
  invitation: string;
  reflection: string;
  actions: DoorAction[];
  completionCriteria: string[];
  postTemplate?: {
    title: string;
    bodyStarter: string;
  };
  emptyStateMessage?: string;
}

export const firstWeekJourney: Door[] = [
  {
    doorNumber: 1,
    title: "Arrival",
    theme: "Why are you here?",
    description:
      "Every man who enters The Connection Room arrives carrying something. For some, it is loneliness. For some, it is curiosity. For others, it is a desire for deeper friendships, intimacy, self-understanding, or community. Before anything else, take a moment to notice what brought you here.",
    invitation:
      "Complete your profile. Then create an introduction post answering: What drew you to The Connection Room? What are you hoping for more of in your life right now? What is one thing people might be surprised to learn about you?",
    reflection: "What would make this community feel genuinely valuable to you six months from now?",
    actions: [
      {
        id: "door1-profile",
        label: "Complete Profile",
        type: "profile",
        href: "/app/profile",
      },
      {
        id: "door1-post",
        label: "Share Your Arrival",
        type: "post",
        description: "Create an introduction post in The Commons",
      },
      {
        id: "door1-reflection",
        label: "Reflect Privately",
        type: "reflection",
      },
    ],
    completionCriteria: [
      "Profile is at least 70% complete",
      "User has created at least one post",
      "User manually marks door complete",
    ],
    postTemplate: {
      title: "New here and arriving",
      bodyStarter:
        "I'm here because…\n\nRight now, I'm hoping for more…\n\nOne thing people might be surprised to learn about me is…",
    },
  },
  {
    doorNumber: 2,
    title: "Awareness",
    theme: "Where are you today?",
    description:
      "We often know where we want to go before we have taken stock of where we are. Today is about gentle self-awareness.",
    invitation:
      "Take one of the quizzes: What's Your Intimacy Pattern? or The Erotic Relationship Evaluator. Then create a post sharing: One insight that stood out, something that surprised you, or a question you are sitting with.",
    reflection: "What part of yourself would you like to understand more deeply?",
    actions: [
      {
        id: "door2-quiz1",
        label: "Take Intimacy Pattern Quiz",
        type: "quiz",
        href: "/app/quizzes/intimacy-pattern",
      },
      {
        id: "door2-quiz2",
        label: "Take Relationship Evaluator",
        type: "quiz",
        href: "/app/quizzes/erotic-relationship",
      },
      {
        id: "door2-post",
        label: "Share An Insight",
        type: "post",
        description: "Create a post in The Commons about what you learned",
      },
      {
        id: "door2-reflection",
        label: "Reflect Privately",
        type: "reflection",
      },
    ],
    completionCriteria: [
      "User has taken at least one quiz",
      "User has created a post",
      "User manually marks door complete",
    ],
    postTemplate: {
      title: "What I learned about myself",
      bodyStarter:
        "One insight that stood out…\n\nSomething that surprised me…\n\nA question I'm sitting with…",
    },
    emptyStateMessage:
      "If the room is still quiet during beta, you can still complete this door by taking a quiz and reflecting privately. Early rooms are built by the first people willing to share.",
  },
  {
    doorNumber: 3,
    title: "Being Seen",
    theme: "Connection begins with visibility.",
    description:
      "Many of us spend years being competent, capable, helpful, and agreeable. Being known is different.",
    invitation:
      "Share a story about a time when you felt deeply connected. It might be with a friend, romantic partner, family member, teacher, stranger, or group. What made that moment meaningful?",
    reflection: "What helps you feel truly seen?",
    actions: [
      {
        id: "door3-post",
        label: "Share A Connection Story",
        type: "post",
        description: "Post your story in The Commons",
      },
      {
        id: "door3-reflection",
        label: "Reflect Privately",
        type: "reflection",
      },
    ],
    completionCriteria: [
      "User has created a post in The Commons",
      "User manually marks door complete",
    ],
    postTemplate: {
      title: "A moment when I felt truly seen",
      bodyStarter:
        "I felt deeply connected when…\n\nIt was with…\n\nWhat made it meaningful…",
    },
  },
  {
    doorNumber: 4,
    title: "Curiosity",
    theme: "Connection is a two-way street.",
    description:
      "Today shifts attention away from your story and toward the people around you.",
    invitation:
      "Read at least three posts from other members. Leave thoughtful comments. Not advice. Not fixing. Just curiosity. Consider: What resonated with you? What would you like to understand better? What touched you? What did you appreciate?",
    reflection: "What do you notice when you listen without trying to help?",
    actions: [
      {
        id: "door4-explore",
        label: "Explore The Commons",
        type: "link",
        href: "/app/spaces/commons",
        description: "Visit The Commons and read posts from others",
      },
      {
        id: "door4-comment",
        label: "Leave Thoughtful Comments",
        type: "comment",
        description: "Comment on at least three posts",
      },
      {
        id: "door4-reflection",
        label: "Reflect Privately",
        type: "reflection",
      },
    ],
    completionCriteria: [
      "User has left at least three comments",
      "User manually marks door complete",
    ],
    emptyStateMessage:
      "If the room is still quiet, you can read seed posts and reflect on what curious listening means to you. Early members build the culture together.",
  },
  {
    doorNumber: 5,
    title: "Embodiment",
    theme: "Your body is part of the conversation.",
    description:
      "Many of us have learned to live primarily from the neck up. Today's invitation is simple. Slow down. Notice. Listen.",
    invitation:
      "Spend five minutes checking in with yourself. Notice: breath, tension, comfort, energy, emotions. Then respond to today's embodiment prompt: What is your body trying to tell you today?",
    reflection: "When do you feel most at home in your body?",
    actions: [
      {
        id: "door5-prompt",
        label: "Respond to Embodiment Prompt",
        type: "reflection",
        description: "Answer today's embodiment reflection",
      },
      {
        id: "door5-space",
        label: "Visit Embodiment Practice Space",
        type: "link",
        href: "/app/spaces/embodiment",
        description: "Explore the Embodiment Practice space",
      },
      {
        id: "door5-reflection",
        label: "Reflect Privately",
        type: "reflection",
      },
    ],
    completionCriteria: [
      "User has responded to an embodiment prompt",
      "User has visited Embodiment Practice space",
      "User manually marks door complete",
    ],
  },
  {
    doorNumber: 6,
    title: "Courage",
    theme: "Connection requires risk.",
    description:
      "Not dramatic risk. Human risk. The risk of reaching out. The risk of asking. The risk of being honest.",
    invitation:
      "Choose one: Join a pairing conversation, Participate in a discussion that feels meaningful, Ask a question you have been carrying, Leave a thoughtful comment on someone's post. Remember: Connection happens in structured, opt-in spaces. The app supports member-to-member connection through pairings, not open direct messages.",
    reflection: "What kind of connection feels slightly scary, but worth moving toward?",
    actions: [
      {
        id: "door6-pairing",
        label: "Explore Pairings",
        type: "pairing",
        href: "/app/pairings",
        description: "Learn about pairing connections with other members",
      },
      {
        id: "door6-discuss",
        label: "Join A Discussion",
        type: "post",
        description: "Participate in a meaningful conversation",
      },
      {
        id: "door6-ask",
        label: "Ask A Question",
        type: "post",
        description: "Post a question you've been carrying",
      },
      {
        id: "door6-reflection",
        label: "Reflect Privately",
        type: "reflection",
      },
    ],
    completionCriteria: [
      "User has opted into pairings",
      "User has created or engaged in a meaningful post",
      "User manually marks door complete",
    ],
  },
  {
    doorNumber: 7,
    title: "Intention",
    theme: "What do you want to cultivate?",
    description:
      "You have spent the week arriving, reflecting, sharing, listening, and engaging. Now it is time to look ahead.",
    invitation:
      "Create a final post reflecting on: What surprised you this week? What felt nourishing? What felt challenging? What would you like more of? Then choose one intention for your first month in The Connection Room.",
    reflection: "If connection grew easier this year, what might become possible?",
    actions: [
      {
        id: "door7-post",
        label: "Share Your Reflection",
        type: "post",
        description: "Create a final reflection post in The Commons",
      },
      {
        id: "door7-intention",
        label: "Choose Your First Month Intention",
        type: "reflection",
        description: "Select or write an intention for your first month",
      },
      {
        id: "door7-reflection",
        label: "Reflect Privately",
        type: "reflection",
      },
    ],
    completionCriteria: [
      "User has chosen an intention",
      "User has created a final reflection post",
      "User manually marks door complete",
    ],
    postTemplate: {
      title: "My first week reflection and intention",
      bodyStarter:
        "What surprised me this week…\n\nWhat felt nourishing…\n\nWhat felt challenging…\n\nWhat I'd like more of…\n\nMy intention for my first month: ",
    },
  },
];

export const firstMonthIntentions = [
  "Practice honesty",
  "Build friendships",
  "Participate more often",
  "Explore vulnerability",
  "Listen more deeply",
  "Feel more at home in my body",
  "Ask for what I need more directly",
  "Explore touch and affection",
  "Bring more curiosity into my relationship",
  "Connect with less performance",
];

export const journeyCompletionMessage = {
  title: "You've completed The Seven Doors of Connection",
  message:
    "This is not the end of the journey. It is the beginning of your rhythm here.",
  nextSteps: [
    {
      title: "Choose Your Spaces",
      description: "Select one or two spaces to keep returning to",
      href: "/app/spaces",
    },
    {
      title: "Connection Pairing",
      description: "Join a pairing conversation with another member",
      href: "/app/pairings",
    },
    {
      title: "Upcoming Events",
      description: "Attend a workshop or gathering",
      href: "/app/events",
    },
    {
      title: "Daily Practice",
      description: "Save a reflection prompt for daily practice",
      href: "/app",
    },
  ],
};
