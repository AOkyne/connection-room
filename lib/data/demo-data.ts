// Demo/seed data for Phase 1
// These are local demo objects, not database records

import type { Profile } from "./profiles";

function generateAvatarUrl(initials: string): string {
  const colors = [
    "#d4a574",
    "#9d7f5c",
    "#8fa878",
    "#b86a52",
    "#6b5f52",
    "#a0968a",
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];

  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  isJoined: boolean;
  featuredPrompt?: string;
}

export interface Prompt {
  id: string;
  type: "daily" | "weekly" | "space" | "couples" | "pairing" | "quiz-based";
  text: string;
  context?: string;
  spaceId?: string;
  relatedInterests?: string[];
}

export interface Post {
  id: string;
  authorName: string;
  authorPronouns?: string;
  authorPhoto?: string;
  spaceId: string;
  promptId?: string;
  content: string;
  isPromptResponse: boolean;
  createdAt: Date;
  reactions: Record<string, number>;
  commentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: Date;
  reactions: Record<string, number>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt?: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location?: string;
  format: "in-person" | "virtual" | "hybrid";
  facilitator: string;
  interested: boolean;
  attendeeCount: number;
}

export const demoSpaces: Space[] = [
  {
    id: "commons",
    name: "The Commons",
    description: "A welcoming space for introductions, questions, and general connection",
    icon: "commons",
    color: "bg-amber-50",
    memberCount: 247,
    isJoined: true,
    featuredPrompt: "What brought you here, and what kind of connection are you hoping to practice?",
  },
  {
    id: "start-here",
    name: "Start Here",
    description: "Orientation and first reflections for new members",
    icon: "start-here",
    color: "bg-rose-50",
    memberCount: 156,
    isJoined: true,
    featuredPrompt: "What does authentic connection mean to you?",
  },
  {
    id: "intimacy-patterns",
    name: "Intimacy Patterns",
    description: "Exploring attachment, desire, vulnerability, and relational patterns",
    icon: "intimacy-patterns",
    color: "bg-blue-50",
    memberCount: 189,
    isJoined: false,
    featuredPrompt: "What patterns do you notice in how you approach intimacy or closeness?",
  },
  {
    id: "touch-affection",
    name: "Touch & Affection",
    description: "Non-sexual touch, physical presence, and receiving affection",
    icon: "touch-affection",
    color: "bg-orange-50",
    memberCount: 134,
    isJoined: false,
    featuredPrompt: "What kind of non-sexual touch do you miss or crave?",
  },
  {
    id: "spirituality-sexuality",
    name: "Spirituality, Sexuality & Integration",
    description: "Integrating spirit, sexuality, body, and emotion without shame",
    icon: "spirituality-sexuality",
    color: "bg-purple-50",
    memberCount: 198,
    isJoined: false,
    featuredPrompt: "What would change if sexuality was something to listen to, not manage?",
  },
  {
    id: "dating-desire",
    name: "Dating, Desire & Vulnerability",
    description: "Single and exploring desire, dating, vulnerability, and authentic connection",
    icon: "dating-desire",
    color: "bg-pink-50",
    memberCount: 112,
    isJoined: false,
  },
  {
    id: "couples",
    name: "Couples, Closeness & Repair",
    description: "For partnered people: intimacy, communication, repair, and reigniting desire",
    icon: "couples",
    color: "bg-teal-50",
    memberCount: 203,
    isJoined: false,
  },
  {
    id: "embodiment",
    name: "Embodiment Practice",
    description: "Coming back to your body: breath, sensation, presence, aliveness",
    icon: "embodiment",
    color: "bg-green-50",
    memberCount: 167,
    isJoined: false,
  },
  {
    id: "workshops",
    name: "Workshops & Retreats",
    description: "Upcoming events, workshops, and retreat opportunities",
    icon: "workshops",
    color: "bg-yellow-50",
    memberCount: 89,
    isJoined: false,
  },
  {
    id: "masculinity-sex-sexuality",
    name: "Masculinity, Sex, and Sexuality",
    description: "Exploring masculine sexuality, desire, vulnerability, and authentic expression without performance or shame",
    icon: "sexuality",
    color: "bg-indigo-50",
    memberCount: 145,
    isJoined: false,
    featuredPrompt: "What does it mean to you to be sexually authentic as a man?",
  },
  {
    id: "sacred-sexuality",
    name: "Sacred Sexuality Practices",
    description: "Spiritual approaches to sexuality, tantra, embodiment, and the sacred union of body and spirit",
    icon: "spirituality",
    color: "bg-violet-50",
    memberCount: 78,
    isJoined: false,
    featuredPrompt: "How do you experience the sacred in your sexuality?",
  },
];

export const demoPrompts: Prompt[] = [
  {
    id: "daily-001",
    type: "daily",
    text: "What kind of connection are you craving this week, and what part of you feels hesitant to ask for it?",
    context: "general",
  },
  {
    id: "daily-002",
    type: "daily",
    text: "Pause for ten seconds. Where do you feel yourself most clearly in your body right now?",
    context: "embodiment",
    relatedInterests: ["Embodiment"],
  },
  {
    id: "daily-003",
    type: "daily",
    text: "What kind of non-sexual touch do you miss most, and what makes it hard to ask for?",
    context: "touch",
    relatedInterests: ["Touch and affection"],
  },
  {
    id: "space-001",
    type: "space",
    spaceId: "spirituality-sexuality",
    text: "What would change if your sexuality was not something to manage, hide, or perform, but something to listen to?",
  },
  {
    id: "space-002",
    type: "space",
    spaceId: "couples",
    text: "What is one small way you and your partner have been trying to reach each other, even if it has come out awkwardly?",
  },
  {
    id: "space-003",
    type: "space",
    spaceId: "couples",
    text: "What kind of touch helps you feel close without immediately turning into pressure, expectation, or performance?",
  },
  {
    id: "couples-001",
    type: "couples",
    text: "Where has desire become something to manage instead of something you can talk about honestly?",
  },
  {
    id: "partnered-001",
    type: "quiz-based",
    text: "What do you notice in your body when your partner wants closeness and you are not sure what you feel yet?",
  },
  {
    id: "quiz-pleaser",
    type: "quiz-based",
    text: "Where did you say yes recently when your body may have been saying maybe?",
  },
  {
    id: "quiz-protector",
    type: "quiz-based",
    text: "What kind of closeness feels appealing in theory, but uncomfortable when it becomes real?",
  },
];

export const demoPosts: Post[] = [
  {
    id: "post-001",
    authorName: "Marcus",
    authorPronouns: "he/him",
    authorPhoto: generateAvatarUrl("M"),
    spaceId: "commons",
    promptId: undefined,
    content:
      "I'm new here and honestly a bit nervous. I've spent a lot of years in my head, and I'm trying to come back to my body and practice being more present. Thanks for creating this space.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 3600000),
    reactions: { relate: 4, "thank-you": 2, witnessing: 3 },
    commentCount: 2,
  },
  {
    id: "post-002",
    authorName: "James & Sarah",
    authorPhoto: generateAvatarUrl("JS"),
    spaceId: "couples",
    promptId: "space-002",
    content:
      "We've been trying small things like sitting closer during dinner, making eye contact. It feels awkward sometimes, but we're noticing something's shifting. Small steps.",
    isPromptResponse: true,
    createdAt: new Date(Date.now() - 7200000),
    reactions: { relate: 8, "thank-you": 5, holding: 6 },
    commentCount: 3,
  },
  {
    id: "post-003",
    authorName: "David",
    authorPronouns: "he/him",
    authorPhoto: generateAvatarUrl("D"),
    spaceId: "start-here",
    content:
      "I took the quiz and got 'Disconnected Overthinker' – which made me laugh because it's so accurate. I think I analyze connection instead of letting myself feel it. Looking forward to practicing something different here.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 10800000),
    reactions: { relate: 6, thoughtful: 4, feeling: 2 },
    commentCount: 4,
  },
  {
    id: "post-004",
    authorName: "Elena",
    authorPronouns: "she/her",
    authorPhoto: generateAvatarUrl("E"),
    spaceId: "embodiment",
    promptId: undefined,
    content:
      "Just finished a short breathing practice and I'm noticing how much tension I hold in my shoulders. It's wild how much you can ignore about your own body.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 14400000),
    reactions: { relate: 7, useful: 3, feeling: 4 },
    commentCount: 1,
  },
];

export const demoBadges: Badge[] = [
  {
    id: "first-step",
    name: "First Step",
    description: "Completed onboarding",
    icon: "👣",
    color: "text-amber-600",
    earnedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "first-share",
    name: "First Share",
    description: "Made first post or prompt response",
    icon: "💬",
    color: "text-rose-600",
    earnedAt: new Date(Date.now() - 43200000),
  },
  {
    id: "consent-champion",
    name: "Consent Champion",
    description: "Acknowledged community agreements",
    icon: "🤝",
    color: "text-green-600",
    earnedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "explorer",
    name: "Explorer",
    description: "Joined 3 or more spaces",
    icon: "🗺️",
    color: "text-blue-600",
  },
  {
    id: "connection-seeker",
    name: "Connection Seeker",
    description: "Participated in a pairing",
    icon: "🔗",
    color: "text-pink-600",
  },
  {
    id: "embodied",
    name: "Embodied",
    description: "Active in Embodiment Practice space",
    icon: "🧘",
    color: "text-emerald-600",
  },
  {
    id: "truth-teller",
    name: "Truth Teller",
    description: "Shared authentically in 5+ posts",
    icon: "✨",
    color: "text-purple-600",
  },
  {
    id: "self-aware",
    name: "Self-Aware",
    description: "Completed the Connection Assessment",
    icon: "🧭",
    color: "text-indigo-600",
  },
  {
    id: "vulnerability-warrior",
    name: "Vulnerability Warrior",
    description: "Responded to 10+ prompts",
    icon: "💪",
    color: "text-red-600",
  },
  {
    id: "bridge-builder",
    name: "Bridge Builder",
    description: "Engaged with couples and single spaces",
    icon: "🌉",
    color: "text-orange-600",
  },
];

export const demoEvents: Event[] = [
  {
    id: "event-001",
    title: "Monthly Connection Circle",
    description: "A gentle guided circle for authentic sharing and connection",
    date: new Date(Date.now() + 604800000), // 1 week away
    time: "7:00 PM PT",
    format: "virtual",
    facilitator: "Trevor James",
    interested: false,
    attendeeCount: 24,
  },
  {
    id: "event-002",
    title: "Embodiment Practice Lab",
    description: "Breath work, body awareness, and coming home to presence",
    date: new Date(Date.now() + 1209600000), // 2 weeks away
    time: "6:00 PM PT",
    format: "virtual",
    facilitator: "Dr. Somatic",
    interested: false,
    attendeeCount: 18,
  },
  {
    id: "event-003",
    title: "Touch, Affection & Receiving Workshop",
    description: "Exploring non-sexual touch, giving, and receiving in safe ways",
    date: new Date(Date.now() + 2419200000), // 4 weeks away
    time: "2:00 PM PT",
    format: "in-person",
    location: "Los Angeles, CA",
    facilitator: "Trevor James",
    interested: false,
    attendeeCount: 12,
  },
];

interface Offer {
  id: string;
  title: string;
  description: string;
  cta: string;
  url: string;
  icon: string;
  condition: (profile: Profile) => boolean;
}

export const demoOffers: Offer[] = [
  {
    id: "offer-quiz",
    title: "Take the Quiz",
    description: "Discover your profile and get personalized recommendations",
    cta: "Take the Quiz",
    url: "https://ayite-b2wlbsk2.scoreapp.com",
    icon: "🧭",
    condition: (profile) => !profile.quizResult || profile.quizResult === "I have not taken the quiz yet",
  },
  {
    id: "offer-consult",
    title: "Intimate Reset Consultation",
    description: "A free session with Trevor James to explore your unique path",
    cta: "Book Free Consult",
    url: "https://trevorjamesla.as.me/free-consult",
    icon: "🤝",
    condition: (profile) =>
      profile.interests?.includes("Coaching support") ||
      profile.memberType === "partnered-individual" ||
      profile.memberType === "couple",
  },
  {
    id: "offer-couples",
    title: "Couples Spark Reset",
    description: "Reignite emotional and physical connection with your partner",
    cta: "Couples Discovery Call",
    url: "https://trevorjamesla.as.me/Couples-Discovery-Call",
    icon: "🕊️",
    condition: (profile) =>
      profile.memberType === "partnered-individual" || profile.memberType === "couple",
  },
  {
    id: "offer-feel-more",
    title: "Feel More, Perform Less",
    description: "Coaching to reconnect with sensation, desire, and authenticity",
    cta: "Learn More",
    url: "https://www.trevorjamesla.com",
    icon: "✨",
    condition: (profile) =>
      profile.interests?.includes("Embodiment") || profile.interests?.includes("Sexuality"),
  },
];
