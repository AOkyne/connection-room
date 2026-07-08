// Demo/seed data for Phase 1
// These are local demo objects, not database records

import type { Profile } from "./profiles";

function generateAvatarUrl(initials: string): string {
  const colors = [
    "#d4a348",
    "#8b6f47",
    "#c97a2a",
    "#a84a2a",
    "#1a0f0a",
    "#a0704a",
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];

  const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="${color}"/><text x="100" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">${initials}</text></svg>`;

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
  hidden?: boolean;
  image?: string;
}

export interface Prompt {
  id: string;
  type: "daily" | "weekly" | "space" | "couples" | "connection" | "quiz-based";
  text: string;
  context?: string;
  spaceId?: string;
  relatedInterests?: string[];
}

export interface Post {
  id: string;
  userId: string;
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
  userId: string;
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
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=600&fit=crop",
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
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop",
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
    image: "https://images.unsplash.com/photo-1516387938699-a93023642d9f?w=1200&h=600&fit=crop",
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
    image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&h=600&fit=crop",
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
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop",
  },
  {
    id: "dating-desire",
    name: "Dating, Desire & Vulnerability",
    description: "Single and exploring desire, dating, vulnerability, and authentic connection",
    icon: "dating-desire",
    color: "bg-pink-50",
    memberCount: 112,
    isJoined: false,
    image: "https://images.unsplash.com/photo-1516321318423-f06a6b1ef650?w=1200&h=600&fit=crop",
  },
  {
    id: "couples",
    name: "Couples, Closeness & Repair",
    description: "For partnered people: intimacy, communication, repair, and reigniting desire",
    icon: "couples",
    color: "bg-teal-50",
    memberCount: 203,
    isJoined: false,
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200&h=600&fit=crop",
  },
  {
    id: "embodiment",
    name: "Embodiment Practice",
    description: "Coming back to your body: breath, sensation, presence, aliveness",
    icon: "embodiment",
    color: "bg-green-50",
    memberCount: 167,
    isJoined: false,
    hidden: true,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop",
  },
  {
    id: "workshops",
    name: "Workshops & Retreats",
    description: "Upcoming events, workshops, and retreat opportunities",
    icon: "workshops",
    color: "bg-yellow-50",
    memberCount: 89,
    isJoined: false,
    hidden: true,
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop",
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
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=600&fit=crop",
  },
  {
    id: "sacred-sexuality",
    name: "Sacred Sexuality Practices",
    description: "Spiritual approaches to sexuality, tantra, embodiment, and the sacred union of body and spirit",
    icon: "spirituality",
    color: "bg-violet-50",
    memberCount: 78,
    isJoined: false,
    hidden: true,
    featuredPrompt: "How do you experience the sacred in your sexuality?",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop",
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
  // The Commons
  {
    id: "commons-001",
    userId: "user-marcus-johnson",
    authorName: "Marcus Johnson",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("MJ"),
    spaceId: "commons",
    promptId: undefined,
    content:
      "I've been married 8 years and we barely touch anymore. We're civil, we're organized, we share a life... but there's no spark. No presence. I'm terrified admitting that out loud, but I'm here because I don't want to just give up.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 86400000),
    reactions: { feel_this: 3, glad_you_shared: 2 },
    commentCount: 2,
  },
  {
    id: "commons-002",
    userId: "user-alex-rivera",
    authorName: "Alex Rivera",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("AR"),
    spaceId: "commons",
    promptId: undefined,
    content:
      "My ex told me I was emotionally unavailable. I didn't get it then – thought I was just independent. But now I realize I've been running away from feelings for years. It's lonely in my head.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 64800000),
    reactions: { feel_this: 5, sending_warmth: 4, shifted_something: 3 },
    commentCount: 2,
  },
  {
    id: "commons-003",
    userId: "user-jordan-lee",
    authorName: "Jordan Lee",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("JL"),
    spaceId: "commons",
    promptId: undefined,
    content:
      "I walked in here expecting to be told what I'm doing wrong. Instead I'm learning to ask myself: what do I actually want? Not what looks good, not what impresses people. Just... me. That's weirdly hard.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 54000000),
    reactions: { now_im_thinking: 6, feel_this: 4 },
    commentCount: 3,
  },
  {
    id: "commons-004",
    userId: "user-daniel-kim",
    authorName: "Daniel Kim",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("DK"),
    spaceId: "commons",
    promptId: undefined,
    content:
      "My kids touched my arm this morning and I didn't immediately tense up. It's a small thing but my therapist kept saying I need to be more present with my family. This breathing stuff actually works.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 43200000),
    reactions: { feel_this: 8, cheering_you_on: 5, shifted_something: 2 },
    commentCount: 3,
  },
  {
    id: "commons-005",
    userId: "user-chris-martinez",
    authorName: "Chris Martinez",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("CM"),
    spaceId: "commons",
    promptId: undefined,
    content:
      "Listening to everyone share – it hit me that I've been so isolated in feeling ashamed. Thought I was the only one struggling with this stuff. Feels like I can breathe a little.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 21600000),
    reactions: { feel_this: 9, glad_you_shared: 6, sending_warmth: 4 },
    commentCount: 2,
  },

  // Start Here
  {
    id: "start-001",
    userId: "user-david-chen",
    authorName: "David Chen",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("DC"),
    spaceId: "start-here",
    promptId: undefined,
    content:
      "I took the quiz and got 'Disconnected Overthinker' – and I laughed but also felt exposed. Because it's true. I analyze everything instead of just... feeling it. I analyze intimacy, I analyze sex, I analyze connection. Nothing's spontaneous anymore.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 72000000),
    reactions: { feel_this: 6, now_im_thinking: 4, shifted_something: 2 },
    commentCount: 4,
  },
  {
    id: "start-002",
    userId: "user-michael-brown",
    authorName: "Michael Brown",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("MB"),
    spaceId: "start-here",
    promptId: undefined,
    content:
      "I've been putting off getting help for 3 years. My therapist finally said 'you need more than once a week' and suggested this. I'm nervous but my anxiety is worse than my fear of looking vulnerable.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 57600000),
    reactions: { cheering_you_on: 4, feel_this: 3 },
    commentCount: 2,
  },
  {
    id: "start-003",
    userId: "user-kevin-patel",
    authorName: "Kevin Patel",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("KP"),
    spaceId: "start-here",
    promptId: undefined,
    content:
      "The part that got to me was 'no fixing or diagnosing.' I've spent my whole life trying to fix myself, fix relationships, fix everything. It's exhausting. The idea of just... being here without that seems impossible but really appealing.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 43200000),
    reactions: { glad_you_shared: 5, feel_this: 2 },
    commentCount: 2,
  },

  // Embodiment
  {
    id: "embodiment-001",
    userId: "user-thomas-wilson",
    authorName: "Thomas Wilson",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("TW"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "I didn't realize I clench my shoulders until I actually slowed down. Been holding tension there for so long I can't remember when it started. My chiropractor keeps saying 'relax' but I didn't know how until now.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 86400000),
    reactions: { feel_this: 7, shifted_something: 4 },
    commentCount: 1,
  },
  {
    id: "embodiment-002",
    userId: "user-ryan-anderson",
    authorName: "Ryan Anderson",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("RA"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "This grounding practice caught me off guard. Tried it for two minutes and immediately felt my anxiety drop. My brain kept wanting to solve problems, and I realized I literally use thinking as a way to avoid feeling scared.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 57600000),
    reactions: { shifted_something: 6, now_im_thinking: 3 },
    commentCount: 2,
  },
  {
    id: "embodiment-003",
    userId: "user-james-taylor",
    authorName: "James Taylor",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("JT"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "Paid attention to where I hold my stress this week – it's literally my chest and throat. I never talk about my needs, and my body's showing me that in real time. That's wild. I'm realizing I can't keep ignoring my own voice.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 43200000),
    reactions: { feel_this: 8, shifted_something: 5, cheering_you_on: 2 },
    commentCount: 4,
  },

  // Couples (example)
  {
    id: "couples-001",
    userId: "user-james-marcus",
    authorName: "James & Marcus",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("JM"),
    spaceId: "couples",
    promptId: "space-002",
    content:
      "We've been trying to sit close without it immediately turning into obligation. Last night we just... sat next to each other for 10 minutes. No TV, no phones. His hand found mine and we didn't pull away. Small but huge.",
    isPromptResponse: true,
    createdAt: new Date(Date.now() - 64800000),
    reactions: { feel_this: 8, glad_you_shared: 5, sending_warmth: 6 },
    commentCount: 3,
  },
  {
    id: "couples-002",
    userId: "user-robert-thomas",
    authorName: "Robert & Thomas",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("RT"),
    spaceId: "couples",
    promptId: undefined,
    content:
      "After 15 years we've become roommates who manage logistics. I love him but I haven't really *seen* him in years. We're both just going through the motions. I'm terrified we've lost something we can't get back.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 48000000),
    reactions: { sending_warmth: 7, feel_this: 5, cheering_you_on: 4 },
    commentCount: 2,
  },
  {
    id: "couples-003",
    userId: "user-mark-david",
    authorName: "Mark & David",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("MD"),
    spaceId: "couples",
    promptId: undefined,
    content:
      "David and I used to fight about sex constantly. Realized we were talking *at* each other instead of talking *about* what we're actually feeling. Yesterday we said 'I'm scared' instead of 'you don't care.' Everything changed.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 32400000),
    reactions: { now_im_thinking: 5, feel_this: 6, glad_you_shared: 4 },
    commentCount: 2,
  },

  // Touch & Affection
  {
    id: "touch-001",
    userId: "user-ethan-martin",
    authorName: "Ethan Martin",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("EM"),
    spaceId: "touch-affection",
    promptId: undefined,
    content:
      "My best friend hugged me the other day and I had to stop myself from pulling away. I realized I'm terrified of being held. Always worried I'll owe something in return or lose my independence. That's a lonely way to live.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 72000000),
    reactions: { feel_this: 7, sending_warmth: 5, shifted_something: 3 },
    commentCount: 3,
  },
  {
    id: "touch-002",
    userId: "user-liam-parker",
    authorName: "Liam Parker",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("LP"),
    spaceId: "touch-affection",
    promptId: undefined,
    content:
      "I haven't had someone hold me in two years. Not sex – just held. I'm starting to think that's actually affecting my mental health more than anything else. Knowing there are other people who understand this isn't weird or weak is everything.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 57600000),
    reactions: { feel_this: 9, now_im_thinking: 4, glad_you_shared: 5 },
    commentCount: 2,
  },
  {
    id: "touch-003",
    userId: "user-noah-brooks",
    authorName: "Noah Brooks",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("NB"),
    spaceId: "touch-affection",
    promptId: undefined,
    content:
      "My mom asked why I flinch when she touches my back. I never realized I do that. Think I'm afraid of being comforted because if I let myself feel that... I'd have to feel everything else I've been avoiding.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 43200000),
    reactions: { shifted_something: 6, feel_this: 5, cheering_you_on: 4 },
    commentCount: 2,
  },

  // Spirituality, Sexuality & Integration
  {
    id: "spirituality-001",
    userId: "user-andrew-hayes",
    authorName: "Andrew Hayes",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("AH"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "I was raised to believe sexuality was sinful and spirituality was pure – never the twain shall meet. My husband asked me why I can't be sexual and spiritual at the same time. I literally had no answer. That question broke something open.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 68400000),
    reactions: { shifted_something: 8, feel_this: 6, now_im_thinking: 5 },
    commentCount: 2,
  },
  {
    id: "spirituality-002",
    userId: "user-samuel-wright",
    authorName: "Samuel Wright",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("SW"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "I meditate regularly and feel connected to something larger. But the moment sex comes into it, I panic. Like the sacred gets dirty. Except my body doesn't believe that separation anymore. The dissonance is painful.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 54000000),
    reactions: { feel_this: 7, now_im_thinking: 6, shifted_something: 4 },
    commentCount: 3,
  },
  {
    id: "spirituality-003",
    userId: "user-benjamin-king",
    authorName: "Benjamin King",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("BK"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "What if my sexuality isn't something unholy that I need to rise above? What if it's part of my spiritual journey? That thought terrifies me but it also feels like coming home. I'm just starting to explore that.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 39600000),
    reactions: { sending_warmth: 5, feel_this: 6, glad_you_shared: 5 },
    commentCount: 2,
  },

  // Intimacy Patterns
  {
    id: "intimacy-001",
    userId: "user-luke-morris",
    authorName: "Luke Morris",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("LM"),
    spaceId: "intimacy-patterns",
    promptId: undefined,
    content:
      "I push away when things get real. We'll be having a great night and then someone will say something vulnerable and I'm suddenly 'tired' or I pick a fight. I'm sabotaging myself and I finally see it.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 75600000),
    reactions: { feel_this: 8, now_im_thinking: 6, shifted_something: 4 },
    commentCount: 2,
  },
  {
    id: "intimacy-002",
    userId: "user-oliver-schmidt",
    authorName: "Oliver Schmidt",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("OS"),
    spaceId: "intimacy-patterns",
    promptId: undefined,
    content:
      "I'm afraid if anyone really sees me – all the insecurity, the doubt, the shame – they'll leave. So I keep everyone at arm's length and then wonder why I'm always lonely. It's starting to make sense why all my relationships end.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 61200000),
    reactions: { feel_this: 9, sending_warmth: 5, shifted_something: 5 },
    commentCount: 2,
  },
  {
    id: "intimacy-003",
    userId: "user-peter-graham",
    authorName: "Peter Graham",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("PG"),
    spaceId: "intimacy-patterns",
    promptId: undefined,
    content:
      "I'm noticing how I push people away when things start getting real. We'll be having a good moment and suddenly I find an excuse to leave or start a fight. I don't fully understand why I do it, but I'm starting to see it's definitely a pattern. Is that something other people experience? I'm still trying to figure this out.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 46800000),
    reactions: { feel_this: 7, now_im_thinking: 5 },
    commentCount: 3,
  },

  // Workshops & Retreats
  {
    id: "workshops-001",
    userId: "user-quinn-lopez",
    authorName: "Quinn Lopez",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("QL"),
    spaceId: "couples-closeness",
    promptId: undefined,
    content:
      "Three days away from my phone, my job, my responsibilities. Just breathing and feeling my body. I came back home different. My husband noticed. More present, more here. I didn't know I was this gone until I came back.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 79200000),
    reactions: { cheering_you_on: 7, feel_this: 6, shifted_something: 6 },
    commentCount: 0,
  },
  {
    id: "workshops-002",
    userId: "user-richard-newman",
    authorName: "Richard Newman",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("RN"),
    spaceId: "couples-closeness",
    promptId: undefined,
    content:
      "I've always been bad at asking for what I need. The workshop taught me I can actually say 'I'm scared' instead of just resenting everyone. My partner cried when I finally told him what's been bothering me.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 57600000),
    reactions: { feel_this: 5, now_im_thinking: 4, shifted_something: 3 },
    commentCount: 0,
  },
  {
    id: "workshops-003",
    userId: "user-simon-owen",
    authorName: "Simon Owen",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("SO"),
    spaceId: "couples-closeness",
    promptId: undefined,
    content:
      "Being with 50 other people who are struggling with the same stuff – not judging, just witnessing each other. That alone healed something. I don't feel so crazy anymore.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 43200000),
    reactions: { sending_warmth: 8, feel_this: 6, glad_you_shared: 5 },
    commentCount: 0,
  },

  // Dating, Desire & Vulnerability
  {
    id: "dating-001",
    userId: "user-tyler-ross",
    authorName: "Tyler Ross",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("TR"),
    spaceId: "dating-desire",
    promptId: undefined,
    content:
      "I went on a date and I was honest about what I'm feeling. Thought I'd never see him again. He said it was the first real conversation he'd had with someone in years. Turns out authenticity isn't the turn-off I thought it was.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 82800000),
    reactions: { feel_this: 8, shifted_something: 5, now_im_thinking: 6 },
    commentCount: 2,
  },
  {
    id: "dating-002",
    userId: "user-victor-austin",
    authorName: "Victor Austin",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("VA"),
    spaceId: "dating-desire",
    promptId: undefined,
    content:
      "I got ghosted last month and my instinct was to disconnect, do the whole 'I don't need anyone' thing. But I'm trying something different – admitting it hurt and staying open. It's terrifying but lonelier to close off.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 64800000),
    reactions: { feel_this: 7, sending_warmth: 5, cheering_you_on: 4 },
    commentCount: 3,
  },
  {
    id: "dating-003",
    userId: "user-william-foster",
    authorName: "William Foster",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("WF"),
    spaceId: "dating-desire",
    promptId: undefined,
    content:
      "I've been single for three years because I was too scared to ask for what I want. I'd rather be alone than risk rejection. But being alone is also rejection – from myself. I'm starting to think that's the core issue.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 50400000),
    reactions: { shifted_something: 6, feel_this: 8, now_im_thinking: 5 },
    commentCount: 3,
  },

  // Masculinity, Sex & Sexuality
  {
    id: "masculinity-001",
    userId: "user-xavier-murray",
    authorName: "Xavier Murray",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("XM"),
    spaceId: "masculinity-sex-sexuality",
    promptId: undefined,
    content:
      "My whole life I was taught that a real man doesn't cry, doesn't admit fear, performs confidence even when he's breaking. I believed that until it cost me my marriage. Now I'm learning that showing up scared is actually the braver choice.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 86400000),
    reactions: { shifted_something: 7, feel_this: 8, now_im_thinking: 6 },
    commentCount: 3,
  },
  {
    id: "masculinity-002",
    userId: "user-yannick-gray",
    authorName: "Yannick Gray",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("YG"),
    spaceId: "masculinity-sex-sexuality",
    promptId: undefined,
    content:
      "I've been driven by the idea that good sex means conquest. But the most connected experience I ever had was with someone I loved who knew me. Not performance – just presence. That changed everything about what I want from sex now.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 72000000),
    reactions: { feel_this: 9, shifted_something: 6, cheering_you_on: 5 },
    commentCount: 3,
  },
  {
    id: "masculinity-003",
    userId: "user-zachary-kelley",
    authorName: "Zachary Kelley",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("ZK"),
    spaceId: "masculinity-sex-sexuality",
    promptId: undefined,
    content:
      "I hid my sensuality like it was shameful. Thought vulnerability and tenderness made me less of a man. But I'm realizing – I can be strong AND sensitive. The two aren't opposites. I'm just starting to believe that.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 57600000),
    reactions: { sending_warmth: 6, feel_this: 7, shifted_something: 5 },
    commentCount: 2,
  },

  // Sacred Sexuality Practices
  {
    id: "sacred-001",
    userId: "user-amaro-santos",
    authorName: "Amaro Santos",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("AS"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "I've been chasing performance my whole life. With this practice – slowing down, breathing, actually feeling my partner – something shifted. Sex became less about doing and more about being. I feel more myself than ever.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 79200000),
    reactions: { feel_this: 8, shifted_something: 7, sending_warmth: 5 },
    commentCount: 1,
  },
  {
    id: "sacred-002",
    userId: "user-blake-rivera",
    authorName: "Blake Rivera",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("BR"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "I never thought of sex as spiritual. But when I'm present with my body instead of in my head – that's transcendence. That's sacred. It's the deepest meditation I've ever experienced.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 64800000),
    reactions: { shifted_something: 8, feel_this: 7, now_im_thinking: 6 },
    commentCount: 1,
  },
  {
    id: "sacred-003",
    userId: "user-connor-ellis",
    authorName: "Connor Ellis",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("CE"),
    spaceId: "spirituality-sexuality",
    promptId: undefined,
    content:
      "When I breathe deeply and stay present with my partner, intention shifts everything. We're not just having sex – we're meeting. Really meeting. That's what sacred means to me now.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 50400000),
    reactions: { cheering_you_on: 6, feel_this: 8, sending_warmth: 7 },
    commentCount: 1,
  },

  // Start Here (adding 4th post)
  {
    id: "start-004",
    userId: "user-aaron-vance",
    authorName: "Aaron Vance",
    authorPronouns: "he/him",
    spaceId: "start-here",
    promptId: undefined,
    content:
      "I'm 52 and realized I've been numb for decades. I thought that was maturity – just pushing through, not feeling too much. But my body knows I'm missing something real. I don't know how to wake up, but I'm here trying.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 28800000),
    reactions: { feel_this: 7, sending_warmth: 4, shifted_something: 3 },
    commentCount: 2,
  },

  // Intimacy Patterns (adding 4th post)
  {
    id: "intimacy-004",
    userId: "user-jason-cooper",
    authorName: "Jason Cooper",
    authorPronouns: "he/him",
    spaceId: "intimacy-patterns",
    promptId: undefined,
    content:
      "I notice I only feel worthy when I'm useful to someone else. So intimacy feels dangerous because it means receiving, not giving. I'm slowly learning that being vulnerable isn't weak – it's the strongest thing I can do.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 36000000),
    reactions: { feel_this: 8, shifted_something: 5, cheering_you_on: 4 },
    commentCount: 2,
  },

  // Touch & Affection (adding 4th post)
  {
    id: "touch-004",
    userId: "user-garrett-torres",
    authorName: "Garrett Torres",
    authorPronouns: "he/him",
    spaceId: "touch-affection",
    promptId: undefined,
    content:
      "After my divorce, I went three years without another person touching me on purpose. Then my son hugged me and I held him longer than usual. That one hug cracked something open. I realized I'm starving for this.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 32400000),
    reactions: { feel_this: 10, sending_warmth: 6, cheering_you_on: 5 },
    commentCount: 2,
  },

  // Dating, Desire & Vulnerability (adding 4th post)
  {
    id: "dating-004",
    userId: "user-henry-wright",
    authorName: "Henry Wright",
    authorPronouns: "he/him",
    spaceId: "dating-desire",
    promptId: undefined,
    content:
      "I used to think being desirable meant being impressive. Perfect body, perfect job, perfect game. But dating someone who actually wants to know me – not impress me – changed everything. I can't go back to performing.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 25200000),
    reactions: { feel_this: 7, shifted_something: 6, now_im_thinking: 5 },
    commentCount: 2,
  },

  // Masculinity, Sex & Sexuality (adding 4th post)
  {
    id: "masculinity-004",
    userId: "user-ivan-moreno",
    authorName: "Ivan Moreno",
    authorPronouns: "he/him",
    spaceId: "masculinity-sex-sexuality",
    promptId: undefined,
    content:
      "I'm learning that being a man doesn't mean having all the answers. It means asking for help, admitting fear, saying 'I don't know how to do this.' That's actually the bravest thing I've ever done.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 19200000),
    reactions: { feel_this: 8, cheering_you_on: 6, sending_warmth: 4 },
    commentCount: 2,
  },
];

export const demoComments: Comment[] = [
  // Comments on commons-001 (Marcus - marriage has no spark)
  {
    id: "comment-commons-001-a",
    postId: "commons-001",
    userId: "user-james-taylor",
    authorName: "James Taylor",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("JT"),
    content:
      "I'm in a similar place. What you're describing – that civility without connection – it's a special kind of lonely because nobody knows how much you're struggling. Glad you're here.",
    createdAt: new Date(Date.now() - 82000000),
    reactions: { feel_this: 2, sending_warmth: 1 },
  },
  {
    id: "comment-commons-001-b",
    postId: "commons-001",
    userId: "user-ryan-anderson",
    authorName: "Ryan Anderson",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("RA"),
    content:
      "Thank you for naming this. So many of us are just... existing in our relationships. I thought I was the only one. The fact that you're here and willing to work on it – that's already something.",
    createdAt: new Date(Date.now() - 75000000),
    reactions: { feel_this: 3, glad_you_shared: 2 },
  },

  // Comments on commons-002 (Alex - emotionally unavailable)
  {
    id: "comment-commons-002-a",
    postId: "commons-002",
    userId: "user-david-chen",
    authorName: "David Chen",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("DC"),
    content:
      "The loneliness of being in your own head... I feel that deeply. But noticing it like this is the first step. You're already being brave by admitting it.",
    createdAt: new Date(Date.now() - 60000000),
    reactions: { feel_this: 4, sending_warmth: 2 },
  },
  {
    id: "comment-commons-002-b",
    postId: "commons-002",
    userId: "user-ethan-martin",
    authorName: "Ethan Martin",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("EM"),
    content:
      "Independence is good but not at the cost of connection. I'm learning that 'needing' someone doesn't make you weak. It makes you human.",
    createdAt: new Date(Date.now() - 53000000),
    reactions: { feel_this: 3 },
  },

  // Comments on commons-004 (Daniel - breathing, presence with kids)
  {
    id: "comment-commons-004-a",
    postId: "commons-004",
    userId: "user-noah-brooks",
    authorName: "Noah Brooks",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("NB"),
    content:
      "This is huge. Your kids probably feel that shift too. They'll remember that you showed up different. That matters more than you know.",
    createdAt: new Date(Date.now() - 40000000),
    reactions: { cheering_you_on: 3, feel_this: 2 },
  },
  {
    id: "comment-commons-004-b",
    postId: "commons-004",
    userId: "user-michael-brown",
    authorName: "Michael Brown",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("MB"),
    content:
      "These small shifts are everything. One moment of real presence with someone you love – that's the whole thing right there.",
    createdAt: new Date(Date.now() - 35000000),
    reactions: { feel_this: 2, sending_warmth: 2 },
  },
  {
    id: "comment-commons-004-c",
    postId: "commons-004",
    userId: "user-chris-martinez",
    authorName: "Chris Martinez",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("CM"),
    content:
      "I'm learning the same thing. My body isn't my enemy – it's telling me when I'm actually there and when I'm just going through the motions. Your breath is doing that for you.",
    createdAt: new Date(Date.now() - 30000000),
    reactions: { feel_this: 3 },
  },

  // Comments on commons-005 (Chris - not alone in shame)
  {
    id: "comment-commons-005-a",
    postId: "commons-005",
    userId: "user-liam-parker",
    authorName: "Liam Parker",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("LP"),
    content:
      "That isolation – I know it. And you're right, we're all in this together. Hearing that helps me feel less broken.",
    createdAt: new Date(Date.now() - 15000000),
    reactions: { feel_this: 4, glad_you_shared: 2 },
  },

  // Comments on start-001 (David - disconnected overthinker)
  {
    id: "comment-start-001-a",
    postId: "start-001",
    userId: "user-jordan-lee",
    authorName: "Jordan Lee",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("JL"),
    content:
      "The analyzing thing – YES. I analyze my way out of every vulnerable moment. Like if I understand it intellectually I don't have to actually feel it. This resonates so much.",
    createdAt: new Date(Date.now() - 68000000),
    reactions: { feel_this: 5, now_im_thinking: 2 },
  },
  {
    id: "comment-start-001-b",
    postId: "start-001",
    userId: "user-ryan-anderson",
    authorName: "Ryan Anderson",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("RA"),
    content:
      "Nothing's spontaneous anymore – that line hit me. I do the same thing. Everything has to be thought through and controlled or I panic. Learning that there's another way.",
    createdAt: new Date(Date.now() - 64000000),
    reactions: { feel_this: 3, shifted_something: 1 },
  },
  {
    id: "comment-start-001-c",
    postId: "start-001",
    userId: "user-kevin-patel",
    authorName: "Kevin Patel",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("KP"),
    content:
      "I'm the same way. Laughing because it's accurate feels like the only safe way to admit it. You're not alone in this pattern.",
    createdAt: new Date(Date.now() - 60000000),
    reactions: { feel_this: 4 },
  },
  {
    id: "comment-start-001-d",
    postId: "start-001",
    userId: "user-alex-rivera",
    authorName: "Alex Rivera",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("AR"),
    content:
      "Practicing something different – I love that framing. It's not about being broken, just about learning new patterns. You're already doing the work.",
    createdAt: new Date(Date.now() - 57000000),
    reactions: { feel_this: 2, cheering_you_on: 2 },
  },

  // Comments on start-002 (Michael - finally getting help)
  {
    id: "comment-start-002-a",
    postId: "start-002",
    userId: "user-tyler-ross",
    authorName: "Tyler Ross",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("TR"),
    content:
      "That's brave. Three years is a long time to carry that alone. The fact that you're here now is what matters.",
    createdAt: new Date(Date.now() - 50000000),
    reactions: { cheering_you_on: 2, glad_you_shared: 1 },
  },

  // Comments on embodiment-001 (Thomas - shoulder tension)
  {
    id: "comment-embodiment-001-a",
    postId: "embodiment-001",
    userId: "user-marcus-johnson",
    authorName: "Marcus Johnson",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("MJ"),
    content:
      "I do this too. When I finally noticed where I hold tension, it was shocking. Our bodies remember everything we're not expressing.",
    createdAt: new Date(Date.now() - 80000000),
    reactions: { feel_this: 3, shifted_something: 1 },
  },

  // Comments on embodiment-002 (Ryan - grounding)
  {
    id: "comment-embodiment-002-a",
    postId: "embodiment-002",
    userId: "user-daniel-kim",
    authorName: "Daniel Kim",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("DK"),
    content:
      "That moment when you realize thinking is a way to avoid feeling – that's everything. I'm learning that too. The anxiety is less when I actually let myself feel instead of analyze.",
    createdAt: new Date(Date.now() - 52000000),
    reactions: { feel_this: 4, shifted_something: 2 },
  },
  {
    id: "comment-embodiment-002-b",
    postId: "embodiment-002",
    userId: "user-thomas-wilson",
    authorName: "Thomas Wilson",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("TW"),
    content:
      "Two minutes and you can feel the difference. Imagine what happens when you keep going. You're onto something real here.",
    createdAt: new Date(Date.now() - 48000000),
    reactions: { feel_this: 2, cheering_you_on: 2 },
  },

  // Comments on embodiment-003 (James - body communicating)
  {
    id: "comment-embodiment-003-a",
    postId: "embodiment-003",
    userId: "user-benjamin-king",
    authorName: "Benjamin King",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("BK"),
    content:
      "Your body holding your unexpressed voice – that's so powerful. And the fact that you're hearing it now means you can start to use it differently. That's healing.",
    createdAt: new Date(Date.now() - 40000000),
    reactions: { feel_this: 3, shifted_something: 2 },
  },
  {
    id: "comment-embodiment-003-b",
    postId: "embodiment-003",
    userId: "user-liam-parker",
    authorName: "Liam Parker",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("LP"),
    content:
      "The body never lies. Mine talks to me through anxiety and tension too. Learning to listen instead of suppress – this is the real work.",
    createdAt: new Date(Date.now() - 37000000),
    reactions: { feel_this: 4 },
  },
  {
    id: "comment-embodiment-003-c",
    postId: "embodiment-003",
    userId: "user-oliver-schmidt",
    authorName: "Oliver Schmidt",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("OS"),
    content:
      "When you start hearing your body, you can't unknow it. It's uncomfortable but also liberating. You're on the right path.",
    createdAt: new Date(Date.now() - 33000000),
    reactions: { feel_this: 2, cheering_you_on: 1 },
  },

  // Comments on couples-001 (James & Sarah - sitting close)
  {
    id: "comment-couples-001-a",
    postId: "couples-001",
    userId: "user-mark-david",
    authorName: "Mark & David",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("MD"),
    content:
      "Ten minutes of presence with someone you love – that's everything. We're learning the same thing. Small moments are where connection happens.",
    createdAt: new Date(Date.now() - 60000000),
    reactions: { feel_this: 3, sending_warmth: 3, cheering_you_on: 2 },
  },
  {
    id: "comment-couples-001-b",
    postId: "couples-001",
    userId: "user-robert-thomas",
    authorName: "Robert & Thomas",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("RT"),
    content:
      "This gives me so much hope. We've been trying but keep falling into old patterns. Seeing that you're making progress helps me believe we can too.",
    createdAt: new Date(Date.now() - 55000000),
    reactions: { feel_this: 2, glad_you_shared: 2 },
  },
  {
    id: "comment-couples-001-c",
    postId: "couples-001",
    userId: "user-xavier-murray",
    authorName: "Xavier Murray",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("XM"),
    content:
      "The fact that you can sit together without it turning into obligation or pressure – you've already shifted something. That's the foundation everything else is built on.",
    createdAt: new Date(Date.now() - 50000000),
    reactions: { feel_this: 4, cheering_you_on: 2 },
  },

  // Comments on couples-002 (Robert & Lisa - 15 years, no spark)
  {
    id: "comment-couples-002-a",
    postId: "couples-002",
    userId: "user-james-sarah",
    authorName: "James & Sarah",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("JS"),
    content:
      "That fear of 'have we lost it forever' – that's where we were. But we're finding it again. It's different, slower, more intentional. There's hope here.",
    createdAt: new Date(Date.now() - 42000000),
    reactions: { feel_this: 3, sending_warmth: 3 },
  },
  {
    id: "comment-couples-002-b",
    postId: "couples-002",
    userId: "user-mark-david",
    authorName: "Mark & David",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("MD"),
    content:
      "You haven't lost it. It's just dormant. And the beautiful thing about that is – you get to choose to wake it up. You're doing that by being here.",
    createdAt: new Date(Date.now() - 36000000),
    reactions: { feel_this: 4, cheering_you_on: 3 },
  },

  // Comments on touch-002 (Liam - touch deprivation)
  {
    id: "comment-touch-002-a",
    postId: "touch-002",
    userId: "user-ethan-martin",
    authorName: "Ethan Martin",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("EM"),
    content:
      "Two years without being held – that breaks my heart. And also, I relate. The fact that you're here saying it out loud is huge. You matter.",
    createdAt: new Date(Date.now() - 50000000),
    reactions: { feel_this: 5, sending_warmth: 3 },
  },

  // Comments on touch-003 (Noah - flinch at affection)
  {
    id: "comment-touch-003-a",
    postId: "touch-003",
    userId: "user-liam-parker",
    authorName: "Liam Parker",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("LP"),
    content:
      "If I let myself be comforted, I'd have to feel all the loneliness I've been hiding from. I'm in that place too. We don't have to stay there.",
    createdAt: new Date(Date.now() - 38000000),
    reactions: { feel_this: 4, sending_warmth: 2 },
  },

  // Comments on spirituality-002 (Samuel - meditation but panic with sex)
  {
    id: "comment-spirituality-002-a",
    postId: "spirituality-002",
    userId: "user-andrew-hayes",
    authorName: "Andrew Hayes",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("AH"),
    content:
      "That dissonance between what your body feels and what you were taught – I'm sitting with that pain too. It's real but it can shift.",
    createdAt: new Date(Date.now() - 48000000),
    reactions: { feel_this: 4, sending_warmth: 2 },
  },

  // Comments on dating-001 (Tyler - honest on a date)
  {
    id: "comment-dating-001-a",
    postId: "dating-001",
    userId: "user-william-foster",
    authorName: "William Foster",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("WF"),
    content:
      "This is exactly what I needed to hear. Authenticity being attractive instead of a turn-off? That changes the game. Thank you.",
    createdAt: new Date(Date.now() - 75000000),
    reactions: { feel_this: 3, cheering_you_on: 2 },
  },

  // Comments on dating-002 (Victor - ghosted, trying openness)
  {
    id: "comment-dating-002-a",
    postId: "dating-002",
    userId: "user-tyler-ross",
    authorName: "Tyler Ross",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("TR"),
    content:
      "Staying open instead of closing off – that's the harder path but it's the only one that leads to real connection. You're doing the brave thing.",
    createdAt: new Date(Date.now() - 58000000),
    reactions: { feel_this: 3, cheering_you_on: 2 },
  },

  // Comments on dating-003 (William - solo for 3 years, afraid to ask)
  {
    id: "comment-dating-003-a",
    postId: "dating-003",
    userId: "user-victor-austin",
    authorName: "Victor Austin",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("VA"),
    content:
      "That moment when you realize rejecting yourself first is the safest way to avoid being rejected – that's profound. I'm unlearning that too.",
    createdAt: new Date(Date.now() - 45000000),
    reactions: { feel_this: 4, shifted_something: 2 },
  },

  // Comments on masculinity-001 (Xavier - taught not to cry)
  {
    id: "comment-masculinity-001-a",
    postId: "masculinity-001",
    userId: "user-yannick-gray",
    authorName: "Yannick Gray",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("YG"),
    content:
      "That cost it on your marriage – I feel that. And now seeing the alternative, that vulnerability is actual strength. It changes everything.",
    createdAt: new Date(Date.now() - 78000000),
    reactions: { feel_this: 4, shifted_something: 2 },
  },

  // Comments on masculinity-002 (Yannick - connection over conquest)
  {
    id: "comment-masculinity-002-a",
    postId: "masculinity-002",
    userId: "user-zachary-kelley",
    authorName: "Zachary Kelley",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("ZK"),
    content:
      "Most connected experience with someone you loved – that's the blueprint for everything else. Presence matters more than performance. Always.",
    createdAt: new Date(Date.now() - 65000000),
    reactions: { feel_this: 5, shifted_something: 3 },
  },

  // Comments on sacred-001 (Amaro - presence, not performance)
  {
    id: "comment-sacred-001-a",
    postId: "sacred-001",
    userId: "user-connor-ellis",
    authorName: "Connor Ellis",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("CE"),
    content:
      "Being instead of doing – that's the whole shift. It sounds simple but it transforms everything. Presence is the sacred thing.",
    createdAt: new Date(Date.now() - 72000000),
    reactions: { feel_this: 3, shifted_something: 2 },
  },

  // Comments on sacred-002 (Blake - meditation in sexuality)
  {
    id: "comment-sacred-002-a",
    postId: "sacred-002",
    userId: "user-amaro-santos",
    authorName: "Amaro Santos",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("AS"),
    content:
      "Sex as meditation – I'm experiencing that too. It's transcendent. And it's the most intimate thing I've ever done because it's real.",
    createdAt: new Date(Date.now() - 58000000),
    reactions: { feel_this: 4, sending_warmth: 2 },
  },

  // Comments on sacred-003 (Connor - breathing, intention, meeting)
  {
    id: "comment-sacred-003-a",
    postId: "sacred-003",
    userId: "user-blake-rivera",
    authorName: "Blake Rivera",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("BR"),
    content:
      "Really meeting someone – that's what I'm learning it means. Not just bodies touching but beings connecting. That's sacred for sure.",
    createdAt: new Date(Date.now() - 45000000),
    reactions: { feel_this: 3, glad_you_shared: 2 },
  },

  // Comments on start-004 (Aaron - 52, numb, wanting to wake up)
  {
    id: "comment-start-004-a",
    postId: "start-004",
    userId: "user-oliver-schmidt",
    authorName: "Oliver Schmidt",
    content:
      "Thank you for saying this. Numbness has felt safer than feeling. But I'm realizing safety without connection is just loneliness wearing a disguise. Your willingness to wake up is inspiring.",
    createdAt: new Date(Date.now() - 26000000),
    reactions: { feel_this: 5, cheering_you_on: 4, glad_you_shared: 2 },
  },
  {
    id: "comment-start-004-b",
    postId: "start-004",
    userId: "user-michael-brown",
    authorName: "Michael Brown",
    content:
      "I get that maturity story. Turns out, feeling isn't weakness – not feeling is the real cost. Sounds like you're on the right path.",
    createdAt: new Date(Date.now() - 23000000),
    reactions: { feel_this: 4, sending_warmth: 3 },
  },

  // Comments on intimacy-004 (Jason - only worthy when useful)
  {
    id: "comment-intimacy-004-a",
    postId: "intimacy-004",
    userId: "user-liam-parker",
    authorName: "Liam Parker",
    content:
      "The worthiness piece – that's what I'm working through too. Learning that I don't have to earn the right to be held. That was a hard belief to question.",
    createdAt: new Date(Date.now() - 34000000),
    reactions: { feel_this: 6, shifted_something: 2 },
  },
  {
    id: "comment-intimacy-004-b",
    postId: "intimacy-004",
    userId: "user-daniel-kim",
    authorName: "Daniel Kim",
    content:
      "Receiving is way harder than giving, isn't it? You're showing real courage by even naming this pattern. That's the first step to changing it.",
    createdAt: new Date(Date.now() - 30000000),
    reactions: { feel_this: 5, cheering_you_on: 3 },
  },

  // Comments on touch-004 (Garrett - three years without touch, son's hug)
  {
    id: "comment-touch-004-a",
    postId: "touch-004",
    userId: "user-ethan-martin",
    authorName: "Ethan Martin",
    content:
      "Three years is such a long time to be without that. And a child's hug – that's pure and honest. It makes sense that it cracked something open. You deserve to have that in your life.",
    createdAt: new Date(Date.now() - 30000000),
    reactions: { feel_this: 8, sending_warmth: 5, cheering_you_on: 4 },
  },
  {
    id: "comment-touch-004-b",
    postId: "touch-004",
    userId: "user-noah-brooks",
    authorName: "Noah Brooks",
    content:
      "That starvation – I relate to that word. I didn't realize it until I started paying attention. You naming it helps me see it too.",
    createdAt: new Date(Date.now() - 27000000),
    reactions: { feel_this: 7, glad_you_shared: 2 },
  },

  // Comments on dating-004 (Henry - performing vs being known)
  {
    id: "comment-dating-004-a",
    postId: "dating-004",
    userId: "user-tyler-ross",
    authorName: "Tyler Ross",
    content:
      "This is what I'm learning too. Authenticity is way more attractive than perfection. When someone actually wants to know you, the relief is unreal.",
    createdAt: new Date(Date.now() - 23000000),
    reactions: { feel_this: 7, shifted_something: 4 },
  },
  {
    id: "comment-dating-004-b",
    postId: "dating-004",
    userId: "user-victor-austin",
    authorName: "Victor Austin",
    content:
      "Can't go back to performing – exactly. Once you taste real connection, the performance feels like a prison. You're onto something real.",
    createdAt: new Date(Date.now() - 20000000),
    reactions: { feel_this: 6, now_im_thinking: 3 },
  },

  // Comments on masculinity-004 (Ivan - asking for help, admitting fear)
  {
    id: "comment-masculinity-004-a",
    postId: "masculinity-004",
    userId: "user-xavier-murray",
    authorName: "Xavier Murray",
    content:
      "That's exactly what cost me my marriage – thinking I had to have all the answers. Your shift is the real deal. That's what being a man actually means.",
    createdAt: new Date(Date.now() - 17000000),
    reactions: { feel_this: 7, cheering_you_on: 5, shifted_something: 2 },
  },
  {
    id: "comment-masculinity-004-b",
    postId: "masculinity-004",
    userId: "user-yannick-gray",
    authorName: "Yannick Gray",
    content:
      "Asking for help was one of the scariest things I've done. But the freedom that came with it – that's what I wish every man could experience.",
    createdAt: new Date(Date.now() - 14000000),
    reactions: { feel_this: 6, cheering_you_on: 4, sending_warmth: 3 },
  },

  // Additional comment on intimacy-003 (Peter - avoidance as survival skill)
  {
    id: "comment-intimacy-003-a",
    postId: "intimacy-003",
    userId: "user-jason-cooper",
    authorName: "Jason Cooper",
    content:
      "Survival skill – that reframe is everything. I spent so long hating myself for pushing people away. Realizing my body was protecting me... it changes the whole conversation.",
    createdAt: new Date(Date.now() - 40000000),
    reactions: { feel_this: 7, shifted_something: 5 },
  },

  // Additional comment on touch-002 (Liam - two years without being held)
  {
    id: "comment-touch-002-a2",
    postId: "touch-002",
    userId: "user-garrett-torres",
    authorName: "Garrett Torres",
    content:
      "Two years feels like an ocean. And I believe you that it's affecting your mental health. Touch starvation is real. You deserve to have that in your life again.",
    createdAt: new Date(Date.now() - 55000000),
    reactions: { feel_this: 8, sending_warmth: 6 },
  },

  // Additional comment on dating-001 (Tyler - honesty on a date)
  {
    id: "comment-dating-001-a2",
    postId: "dating-001",
    userId: "user-henry-wright",
    authorName: "Henry Wright",
    content:
      "This gives me hope. I'm terrified that being real will scare people away. Hearing that it actually drew someone closer – that changes how I want to show up.",
    createdAt: new Date(Date.now() - 78000000),
    reactions: { feel_this: 6, glad_you_shared: 3, shifted_something: 2 },
  },

  // Additional comment on couples-003 (Mark & David - talking instead of fighting)
  {
    id: "comment-couples-003-a",
    postId: "couples-003",
    userId: "user-james-marcus",
    authorName: "James & Marcus",
    content:
      "This is the shift we're trying to make. Talking about fear instead of blame. It's harder but it feels like we're actually connecting for the first time in years.",
    createdAt: new Date(Date.now() - 42000000),
    reactions: { feel_this: 6, shifted_something: 4, glad_you_shared: 3 },
  },

  // Additional comment on embodiment-003 (James - holding stress in chest/throat)
  {
    id: "comment-embodiment-003-a2",
    postId: "embodiment-003",
    userId: "user-chris-martinez",
    authorName: "Chris Martinez",
    content:
      "I hold mine in my chest and shoulders. And you're right – my body's been screaming that I'm not speaking my truth. This is making so much sense now.",
    createdAt: new Date(Date.now() - 39000000),
    reactions: { feel_this: 7, shifted_something: 3 },
  },

  // Comments on commons-003 (Jordan - asking myself what I want)
  {
    id: "comment-commons-003-a",
    postId: "commons-003",
    userId: "user-alex-rivera",
    authorName: "Alex Rivera",
    content:
      "This resonates. I'm so used to doing what looks good that I don't even know what I actually want anymore. How do you even start figuring that out?",
    createdAt: new Date(Date.now() - 50000000),
    reactions: { feel_this: 4, now_im_thinking: 3 },
  },
  {
    id: "comment-commons-003-b",
    postId: "commons-003",
    userId: "user-kevin-patel",
    authorName: "Kevin Patel",
    content:
      "That's a brave question to ask yourself. I think asking it is already part of the answer.",
    createdAt: new Date(Date.now() - 48000000),
    reactions: { feel_this: 3, glad_you_shared: 2 },
  },
  {
    id: "comment-commons-003-c",
    postId: "commons-003",
    userId: "user-michael-brown",
    authorName: "Michael Brown",
    content:
      "Yeah, we're taught to fit in, not to know ourselves. Takes guts to unlearn that.",
    createdAt: new Date(Date.now() - 45000000),
    reactions: { feel_this: 2 },
  },

  // Additional comment on commons-005 (Chris - not alone in shame)
  {
    id: "comment-commons-005-b",
    postId: "commons-005",
    userId: "user-ethan-martin",
    authorName: "Ethan Martin",
    content:
      "You're definitely not alone. Reading this right now helped me feel less broken too.",
    createdAt: new Date(Date.now() - 12000000),
    reactions: { feel_this: 3, sending_warmth: 2 },
  },

  // Additional comments on start-002 (Michael - putting off help)
  {
    id: "comment-start-002-a2",
    postId: "start-002",
    userId: "user-david-chen",
    authorName: "David Chen",
    content:
      "It takes courage to ask for help. The fact that you're here says a lot.",
    createdAt: new Date(Date.now() - 55000000),
    reactions: { cheering_you_on: 3, feel_this: 2 },
  },

  // Comments on start-003 (Kevin - no fixing or diagnosing)
  {
    id: "comment-start-003-a",
    postId: "start-003",
    userId: "user-marcus-johnson",
    authorName: "Marcus Johnson",
    content:
      "That's what got me too. I've spent so much energy trying to fix everything. The idea of just... being is actually appealing.",
    createdAt: new Date(Date.now() - 40000000),
    reactions: { feel_this: 5, now_im_thinking: 2 },
  },
  {
    id: "comment-start-003-b",
    postId: "start-003",
    userId: "user-ryan-anderson",
    authorName: "Ryan Anderson",
    content:
      "Impossible but really appealing – that's exactly how I feel about it too.",
    createdAt: new Date(Date.now() - 38000000),
    reactions: { feel_this: 3, glad_you_shared: 1 },
  },

  // Comments on intimacy-003 (Peter - pushing away pattern)
  {
    id: "comment-intimacy-003-b",
    postId: "intimacy-003",
    userId: "user-oliver-schmidt",
    authorName: "Oliver Schmidt",
    content:
      "I do the exact same thing. I'll sabotage a good moment without really knowing why. Wondering if it's fear?",
    createdAt: new Date(Date.now() - 44000000),
    reactions: { feel_this: 6, now_im_thinking: 2 },
  },
  {
    id: "comment-intimacy-003-c",
    postId: "intimacy-003",
    userId: "user-luke-morris",
    authorName: "Luke Morris",
    content:
      "Yeah, I experience this too. Sometimes I think I'm just not built for closeness, but then I read something like this and wonder if I'm just scared.",
    createdAt: new Date(Date.now() - 41000000),
    reactions: { feel_this: 5, shifted_something: 1 },
  },

  // Comments on touch-001 (Ethan - terrified of being held)
  {
    id: "comment-touch-001-a",
    postId: "touch-001",
    userId: "user-noah-brooks",
    authorName: "Noah Brooks",
    content:
      "I relate to this so much. There's something scary about letting someone just... hold you. Without it meaning anything else.",
    createdAt: new Date(Date.now() - 70000000),
    reactions: { feel_this: 6, sending_warmth: 3 },
  },
  {
    id: "comment-touch-001-b",
    postId: "touch-001",
    userId: "user-ryan-anderson",
    authorName: "Ryan Anderson",
    content:
      "Why is it so hard to just receive? I never thought about it that way before.",
    createdAt: new Date(Date.now() - 68000000),
    reactions: { feel_this: 4, now_im_thinking: 2 },
  },
  {
    id: "comment-touch-001-c",
    postId: "touch-001",
    userId: "user-james-taylor",
    authorName: "James Taylor",
    content:
      "The independence thing is real. But you're right – it's lonely. Learning to let people in is hard work.",
    createdAt: new Date(Date.now() - 65000000),
    reactions: { feel_this: 3, shifted_something: 1 },
  },

  // Additional comment on touch-003 (Noah - flinching at touch)
  {
    id: "comment-touch-003-a2",
    postId: "touch-003",
    userId: "user-chris-martinez",
    authorName: "Chris Martinez",
    content:
      "That's a big realization. Being afraid of comfort because of what feeling it might open up... yeah, I get that.",
    createdAt: new Date(Date.now() - 41000000),
    reactions: { feel_this: 4, shifted_something: 2 },
  },

  // Additional comments on spirituality-001 (Andrew - sexuality and spirituality)
  {
    id: "comment-spirituality-001-a2",
    postId: "spirituality-001",
    userId: "user-samuel-wright",
    authorName: "Samuel Wright",
    content:
      "That's the split I'm living in right now. Never thought they could be the same thing. Your husband's question is making me think.",
    createdAt: new Date(Date.now() - 66000000),
    reactions: { feel_this: 5, now_im_thinking: 3 },
  },
  {
    id: "comment-spirituality-001-b",
    postId: "spirituality-001",
    userId: "user-benjamin-king",
    authorName: "Benjamin King",
    content:
      "This is the question I'm wrestling with too. How do we integrate these parts of ourselves that we've been taught to keep separate?",
    createdAt: new Date(Date.now() - 64000000),
    reactions: { feel_this: 4, shifted_something: 2 },
  },

  // Additional comments on spirituality-002 (Samuel - meditation and sexuality disconnect)
  {
    id: "comment-spirituality-002-a2",
    postId: "spirituality-002",
    userId: "user-andrew-hayes",
    authorName: "Andrew Hayes",
    content:
      "The panic is so real. Like one part of me has to shut down so the other can be present. I'm tired of that split.",
    createdAt: new Date(Date.now() - 52000000),
    reactions: { feel_this: 5, shifted_something: 1 },
  },
  {
    id: "comment-spirituality-002-b",
    postId: "spirituality-002",
    userId: "user-benjamin-king",
    authorName: "Benjamin King",
    content:
      "I didn't know others felt this dissonance. Thought it was just me. Maybe there's a way to bring these together.",
    createdAt: new Date(Date.now() - 50000000),
    reactions: { feel_this: 4, now_im_thinking: 2 },
  },

  // Comments on spirituality-003 (Benjamin - what if sexuality is spiritual?)
  {
    id: "comment-spirituality-003-a",
    postId: "spirituality-003",
    userId: "user-samuel-wright",
    authorName: "Samuel Wright",
    content:
      "That feeling of coming home is important. Maybe that's the signal you should listen to instead of the fear.",
    createdAt: new Date(Date.now() - 38000000),
    reactions: { feel_this: 4, shifted_something: 3 },
  },
  {
    id: "comment-spirituality-003-b",
    postId: "spirituality-003",
    userId: "user-andrew-hayes",
    authorName: "Andrew Hayes",
    content:
      "Coming home to yourself – that's a beautiful way to describe it. I want to find that.",
    createdAt: new Date(Date.now() - 36000000),
    reactions: { feel_this: 3, sending_warmth: 2 },
  },

  // Comments on intimacy-001 (Luke - pushing away when things get real)
  {
    id: "comment-intimacy-001-a",
    postId: "intimacy-001",
    userId: "user-peter-graham",
    authorName: "Peter Graham",
    content:
      "I do this too. The moment someone gets vulnerable, I suddenly need to leave. Why do we do that?",
    createdAt: new Date(Date.now() - 73000000),
    reactions: { feel_this: 6, now_im_thinking: 3 },
  },
  {
    id: "comment-intimacy-001-b",
    postId: "intimacy-001",
    userId: "user-oliver-schmidt",
    authorName: "Oliver Schmidt",
    content:
      "Seeing it happen is the first step, right? At least you're noticing the pattern.",
    createdAt: new Date(Date.now() - 71000000),
    reactions: { feel_this: 4, cheering_you_on: 2 },
  },

  // Comments on intimacy-002 (Oliver - keeping everyone at arm's length)
  {
    id: "comment-intimacy-002-a",
    postId: "intimacy-002",
    userId: "user-luke-morris",
    authorName: "Luke Morris",
    content:
      "This is the thing – protection that becomes isolation. I'm realizing the same pattern in my own relationships.",
    createdAt: new Date(Date.now() - 59000000),
    reactions: { feel_this: 7, now_im_thinking: 2 },
  },
  {
    id: "comment-intimacy-002-b",
    postId: "intimacy-002",
    userId: "user-peter-graham",
    authorName: "Peter Graham",
    content:
      "The loneliness of keeping people away – yeah. But at least you see it now. That's something.",
    createdAt: new Date(Date.now() - 57000000),
    reactions: { feel_this: 5, sending_warmth: 3 },
  },

  // Additional comment on couples-003 (Mark & David - talking about fear)
  {
    id: "comment-couples-003-b",
    postId: "couples-003",
    userId: "user-robert-thomas",
    authorName: "Robert & Thomas",
    content:
      "Naming fear instead of blame – we're trying to do that too. It's harder than I expected but it feels more honest.",
    createdAt: new Date(Date.now() - 40000000),
    reactions: { feel_this: 5, shifted_something: 2 },
  },

  // Additional comments on dating-002 (Victor - stayed open after ghosting)
  {
    id: "comment-dating-002-a2",
    postId: "dating-002",
    userId: "user-william-foster",
    authorName: "William Foster",
    content:
      "That takes real courage. I usually shut down completely after something like that. How are you doing with it?",
    createdAt: new Date(Date.now() - 62000000),
    reactions: { feel_this: 5, cheering_you_on: 2 },
  },
  {
    id: "comment-dating-002-b",
    postId: "dating-002",
    userId: "user-tyler-ross",
    authorName: "Tyler Ross",
    content:
      "Staying open is lonelier than closing off, but you're right – closing off is lonelier in the end. Hard choice.",
    createdAt: new Date(Date.now() - 60000000),
    reactions: { feel_this: 4, shifted_something: 1 },
  },

  // Additional comments on dating-003 (William - alone for three years)
  {
    id: "comment-dating-003-a2",
    postId: "dating-003",
    userId: "user-victor-austin",
    authorName: "Victor Austin",
    content:
      "Self-rejection as protection – I never thought of it that way but that's exactly what I'm doing.",
    createdAt: new Date(Date.now() - 48000000),
    reactions: { feel_this: 6, now_im_thinking: 3 },
  },
  {
    id: "comment-dating-003-b",
    postId: "dating-003",
    userId: "user-tyler-ross",
    authorName: "Tyler Ross",
    content:
      "The core issue – yeah. Once you see it, you can't unsee it. But at least you can start doing something about it.",
    createdAt: new Date(Date.now() - 46000000),
    reactions: { feel_this: 4, cheering_you_on: 2 },
  },

  // Additional comments on masculinity-001 (Xavier - showing up scared)
  {
    id: "comment-masculinity-001-a2",
    postId: "masculinity-001",
    userId: "user-yannick-gray",
    authorName: "Yannick Gray",
    content:
      "The pressure to perform confidence even when you're breaking – I lived that. Still learning to let people see me scared.",
    createdAt: new Date(Date.now() - 84000000),
    reactions: { feel_this: 7, shifted_something: 2 },
  },
  {
    id: "comment-masculinity-001-b",
    postId: "masculinity-001",
    userId: "user-zachary-kelley",
    authorName: "Zachary Kelley",
    content:
      "This cost you your marriage – that's heavy. But recognizing it is the first step to something different.",
    createdAt: new Date(Date.now() - 82000000),
    reactions: { feel_this: 5, cheering_you_on: 3 },
  },

  // Additional comments on masculinity-002 (Yannick - conquest vs presence)
  {
    id: "comment-masculinity-002-a2",
    postId: "masculinity-002",
    userId: "user-xavier-murray",
    authorName: "Xavier Murray",
    content:
      "Presence over performance – that's what I'm learning too. The connected moment beats any conquest.",
    createdAt: new Date(Date.now() - 70000000),
    reactions: { feel_this: 6, shifted_something: 2 },
  },
  {
    id: "comment-masculinity-002-b",
    postId: "masculinity-002",
    userId: "user-zachary-kelley",
    authorName: "Zachary Kelley",
    content:
      "Most connected experience – that's what sex should be. I'm just now learning that's possible.",
    createdAt: new Date(Date.now() - 68000000),
    reactions: { feel_this: 5, now_im_thinking: 2 },
  },

  // Comments on masculinity-003 (Zachary - strong and sensitive)
  {
    id: "comment-masculinity-003-a",
    postId: "masculinity-003",
    userId: "user-yannick-gray",
    authorName: "Yannick Gray",
    content:
      "They're not opposites at all. The most powerful thing I've done is let myself be tender. Still learning to believe that though.",
    createdAt: new Date(Date.now() - 55000000),
    reactions: { feel_this: 7, shifted_something: 3 },
  },
  {
    id: "comment-masculinity-003-b",
    postId: "masculinity-003",
    userId: "user-xavier-murray",
    authorName: "Xavier Murray",
    content:
      "Sensitivity as strength – yeah. That's the flip I'm trying to make. It's not easy but it feels true.",
    createdAt: new Date(Date.now() - 53000000),
    reactions: { feel_this: 6, shifted_something: 2 },
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
    description: "Participated in a connection",
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
  {
    id: "community-ambassador",
    name: "Community Ambassador",
    description: "You invited someone who joined The Connection Room",
    icon: "🌱",
    color: "text-green-600",
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
    id: "offer-consult",
    title: "Intimacy Reset Consultation",
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
