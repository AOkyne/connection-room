// Central app configuration
// Update these values to change app name, URLs, colors, and branding

export const appConfig = {
  // App Identity
  name: "The Connection Room by Trevor James",
  tagline:
    "A private community for men and couples practicing honest connection, embodied intimacy, spirituality, sexuality, and integration without shame, pressure, or performance.",
  shortDescription:
    "A guided space for men and couples exploring authentic connection, embodied intimacy, spirituality, sexuality, and integration.",

  // URLs
  urls: {
    app: "https://community.trevorjamesla.com",
    mainWebsite: "https://www.trevorjamesla.com",
    quiz: "https://ayite-b2wlbsk2.scoreapp.com",
    freeConsult: "https://trevorjamesla.as.me/free-consult",
    couplesDiscoveryCall: "https://trevorjamesla.as.me/Couples-Discovery-Call",
  },

  // Brand Colors - Warm, Rich Palette
  colors: {
    background: "#faf7f2", // warm cream
    surface: "#f3ede5", // warm sand
    card: "#fffbf7", // off-white with warmth
    border: "#e8ddd2", // warm neutral border
    text: "#2a2318", // deep warm brown
    textSecondary: "#6b5f52", // medium warm brown
    textMuted: "#a0968a", // muted warm tone
    accent: "#d4a574", // warm gold/amber
    accentDark: "#9d7f5c", // deeper warm gold
    rust: "#b86a52", // warm rust
    success: "#8fa878", // soft sage green
    warning: "#d4a574", // warm gold
    error: "#b86a52", // warm rust
  },

  // EROS Method Framework (for conceptual foundation)
  eros: {
    E: "Embody",
    R: "Regulate",
    O: "Own",
    S: "Share",
  },

  // Community Agreements
  communityAgreements: [
    "Consent first",
    "No unsolicited sexual messages",
    "No cruising the community",
    "Speak from lived experience",
    "No fixing, diagnosing, or unsolicited advice",
    "Confidentiality",
    "Vulnerability is invited, not demanded",
    "This is not therapy or crisis support",
    "Respect different bodies, orientations, relationships, and comfort levels",
    "Couples are welcome, but no partner should be pressured to participate, disclose, or share before they are ready",
  ],

  // Member Type Options
  memberTypeOptions: [
    {
      id: "individual",
      label: "I'm here for myself",
      description: "Exploring personal connection, embodiment, and growth",
    },
    {
      id: "partnered-individual",
      label: "I'm partnered and exploring intimacy or relationship support",
      description: "In a relationship, interested in deeper connection",
    },
    {
      id: "couple",
      label: "We're joining as a couple",
      description: "Both partners participating in the community",
    },
    {
      id: "past-client",
      label: "I'm a past or current Trevor James client",
      description: "Already working with Trevor",
    },
    {
      id: "workshop",
      label: "I'm here after a workshop, retreat, or quiz",
      description: "Connected through an event or assessment",
    },
  ],

  // Interest Tags
  interests: [
    "Authentic connection",
    "Touch and affection",
    "Embodiment",
    "Spirituality",
    "Sexuality",
    "Dating and desire",
    "Shame and self-acceptance",
    "Relationships",
    "Couples intimacy",
    "Communication and repair",
    "Rekindling desire",
    "Workshops and retreats",
    "Coaching support",
  ],

  // Quiz Result Options
  quizResults: [
    "Armored Achiever",
    "Pleasing Performer",
    "Disconnected Overthinker",
    "Guarded Protector",
    "Emerging Embodied Man",
    "I have not taken the quiz yet",
  ],

  // Relationship Structure Options
  relationshipStructures: [
    "Monogamous",
    "Open relationship",
    "Polyamorous",
    "Exploring / prefer not to say",
  ],

  // Couple Goals
  coupleGoals: [
    "Reignite emotional connection",
    "Rebuild touch and affection",
    "Talk about sex with less pressure",
    "Repair after distance or disconnection",
    "Navigate desire differences",
    "Practice vulnerability",
    "Improve communication",
    "Explore spirituality and sexuality together",
  ],

  // Gentle Reactions
  reactions: [
    { id: "relate", label: "I relate", emoji: "🤝" },
    { id: "thank-you", label: "Thank you for sharing", emoji: "🙏" },
    { id: "feeling", label: "This gave me something to feel", emoji: "💭" },
    { id: "thoughtful", label: "Thoughtful", emoji: "✨" },
    { id: "witnessing", label: "Witnessing this", emoji: "👁️" },
    { id: "holding", label: "Holding this with care", emoji: "❤️" },
    { id: "useful", label: "Useful reflection", emoji: "💡" },
  ],
};
