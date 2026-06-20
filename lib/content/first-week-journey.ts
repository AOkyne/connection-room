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
      "This door invites you to arrive fully. First, complete your profile so others can get to know you. Then, share your arrival story with the community.",
    reflection: "What would make this community feel genuinely valuable to you six months from now?",
    actions: [
      {
        id: "door1-profile",
        label: "Complete Your Profile",
        type: "profile",
        href: "/app/profile",
        description: "Fill out your profile (opens in new page)",
      },
      {
        id: "door1-post",
        label: "Share Your Arrival Story",
        type: "post",
        description: "Answer: What drew you here? What are you hoping for?",
      },
      {
        id: "door1-reflection",
        label: "Write Private Reflection",
        type: "reflection",
        description: "Only you see this",
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
      "Take one of our quizzes to explore your patterns around intimacy and connection. Then share what you learned with the community.",
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
        label: "Take Relationship Evaluator Quiz",
        type: "quiz",
        href: "/app/quizzes/erotic-relationship",
      },
      {
        id: "door2-post",
        label: "Share What You Learned",
        type: "post",
        description: "Post one insight, surprise, or question in The Commons",
      },
      {
        id: "door2-reflection",
        label: "Write Private Reflection",
        type: "reflection",
        description: "Only you see this",
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
      "Share a moment when you felt truly connected to someone. What made that moment meaningful?",
    reflection: "What helps you feel truly seen?",
    actions: [
      {
        id: "door3-post",
        label: "Share A Connection Story",
        type: "post",
        description: "Post about a time you felt deeply connected",
      },
      {
        id: "door3-reflection",
        label: "Write Private Reflection",
        type: "reflection",
        description: "Only you see this",
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
      "Today shifts attention away from your story and toward the people around you. Can you listen to others without trying to fix, advise, or perform?",
    invitation:
      "Read posts from other members. Leave thoughtful comments that show you understood and appreciated what they shared.",
    reflection: "What do you notice when you listen without trying to help?",
    actions: [
      {
        id: "door4-explore",
        label: "Read Posts in The Commons",
        type: "link",
        href: "/app/spaces/commons",
        description: "Visit The Commons to see what others are sharing",
      },
      {
        id: "door4-comment",
        label: "Leave Thoughtful Comments",
        type: "comment",
        description: "Comment on at least three posts you resonate with",
      },
      {
        id: "door4-reflection",
        label: "Write Private Reflection",
        type: "reflection",
        description: "Only you see this",
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
      "Spend a few minutes checking in with your body. Then explore the Embodiment Practice space or write a private reflection about what you notice.",
    reflection: "When do you feel most at home in your body?",
    actions: [
      {
        id: "door5-space",
        label: "Visit Embodiment Practice Space",
        type: "link",
        href: "/app/spaces/embodiment",
        description: "Read and participate in embodiment conversations",
      },
      {
        id: "door5-reflection",
        label: "Write Private Reflection",
        type: "reflection",
        description: "What does your body need today? Only you see this",
      },
    ],
    completionCriteria: [
      "User has visited Embodiment Practice space or written reflection",
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
      "Choose one way to take a small risk. Join a pairing conversation. Ask a question you've been carrying. Or join a discussion that feels meaningful to you.",
    reflection: "What kind of connection feels slightly scary, but worth moving toward?",
    actions: [
      {
        id: "door6-pairing",
        label: "Explore Pairings",
        type: "pairing",
        href: "/app/pairings",
        description: "Connect one-on-one with another member",
      },
      {
        id: "door6-ask",
        label: "Ask A Question",
        type: "post",
        description: "Post something you've been wondering about",
      },
      {
        id: "door6-discuss",
        label: "Join A Discussion",
        type: "post",
        description: "Reply meaningfully to someone else's post",
      },
      {
        id: "door6-reflection",
        label: "Write Private Reflection",
        type: "reflection",
        description: "Only you see this",
      },
    ],
    completionCriteria: [
      "User has opted into pairings or created/engaged in a post",
      "User manually marks door complete",
    ],
  },
  {
    doorNumber: 7,
    title: "Intention",
    theme: "What do you want to cultivate?",
    description:
      "You have spent the week arriving, reflecting, sharing, listening, and engaging. Now it is time to look ahead and set your intention for what comes next.",
    invitation:
      "Reflect on your first week. Then choose or write an intention for your first month in The Connection Room.",
    reflection: "If connection grew easier this year, what might become possible?",
    actions: [
      {
        id: "door7-post",
        label: "Share Your First Week Reflection",
        type: "post",
        description: "Post about what surprised you, what felt nourishing, what's next",
      },
      {
        id: "door7-intention",
        label: "Choose Your First Month Intention",
        type: "reflection",
        description: "Select from our suggestions or write your own",
      },
      {
        id: "door7-reflection",
        label: "Write Private Reflection",
        type: "reflection",
        description: "Only you see this",
      },
    ],
    completionCriteria: [
      "User has chosen an intention",
      "User has created or engaged in a final reflection",
      "User manually marks door complete",
    ],
    postTemplate: {
      title: "My first week reflection and intention",
      bodyStarter:
        "What surprised me this week…\n\nWhat felt nourishing…\n\nWhat felt challenging…\n\nWhat I'd like more of…",
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
