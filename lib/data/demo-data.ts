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
    commentCount: 0,
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 0,
  },

  // Embodiment
  {
    id: "embodiment-001",
    userId: "user-thomas-wilson",
    authorName: "Thomas Wilson",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("TW"),
    spaceId: "embodiment",
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
    spaceId: "embodiment",
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
    spaceId: "embodiment",
    promptId: undefined,
    content:
      "Paid attention to where I hold my stress this week – it's literally my chest and throat. I never talk about my needs, and my body's showing me that in real time. That's wild. I'm realizing I can't keep ignoring my own voice.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 43200000),
    reactions: { feel_this: 8, shifted_something: 5, cheering_you_on: 2 },
    commentCount: 3,
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
    commentCount: 1,
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
    commentCount: 0,
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 0,
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
    commentCount: 0,
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
    commentCount: 0,
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
      "I just realized my avoidance isn't a flaw I need to beat myself up about – it's a survival skill I learned. My body learned that closeness wasn't safe. And that means I can unlearn it. That's actually hope.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 46800000),
    reactions: { cheering_you_on: 6, feel_this: 7, shifted_something: 5 },
    commentCount: 0,
  },

  // Workshops & Retreats
  {
    id: "workshops-001",
    userId: "user-quinn-lopez",
    authorName: "Quinn Lopez",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("QL"),
    spaceId: "workshops",
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
    spaceId: "workshops",
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
    spaceId: "workshops",
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 1,
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
    commentCount: 0,
  },

  // Sacred Sexuality Practices
  {
    id: "sacred-001",
    userId: "user-amaro-santos",
    authorName: "Amaro Santos",
    authorPronouns: "he/him",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("AS"),
    spaceId: "sacred-sexuality",
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
    spaceId: "sacred-sexuality",
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
    spaceId: "sacred-sexuality",
    promptId: undefined,
    content:
      "When I breathe deeply and stay present with my partner, intention shifts everything. We're not just having sex – we're meeting. Really meeting. That's what sacred means to me now.",
    isPromptResponse: false,
    createdAt: new Date(Date.now() - 50400000),
    reactions: { cheering_you_on: 6, feel_this: 8, sending_warmth: 7 },
    commentCount: 1,
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

  // Comments on spirituality-001 (Andrew - separated sexuality and spirituality)
  {
    id: "comment-spirituality-001-a",
    postId: "spirituality-001",
    userId: "user-samuel-wright",
    authorName: "Samuel Wright",
    // authorPhoto removed - Avatar component will generate initials instead
    // authorPhoto: generateAvatarUrl("SW"),
    content:
      "That question your wife asked you – it's the question that broke me open too. Realizing that separation was never true. Just something we were taught.",
    createdAt: new Date(Date.now() - 62000000),
    reactions: { feel_this: 3, shifted_something: 2 },
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
