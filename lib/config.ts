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
    text: "#1a0f0a", // deep warm brown
    textSecondary: "#1a0f0a", // medium warm brown
    textMuted: "#a0704a", // muted warm tone
    accent: "#d4a348", // warm gold/amber
    accentDark: "#8b6f47", // deeper warm gold
    rust: "#a84a2a", // warm rust
    success: "#c97a2a", // soft sage green
    warning: "#d4a348", // warm gold
    error: "#a84a2a", // warm rust
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

  // Legacy reactions - kept for backwards compatibility during migration
  // New reactions are now configured in lib/content/reactions.ts
  // Old reaction keys are automatically migrated to new ones
  reactions: [
    { id: "relate", label: "I relate", emoji: "🤝" }, // Migrates to: feel_this
    { id: "thank-you", label: "Thank you for sharing", emoji: "🙏" }, // Migrates to: glad_you_shared
    { id: "feeling", label: "This gave me something to feel", emoji: "💭" }, // Migrates to: shifted_something
    { id: "thoughtful", label: "Thoughtful", emoji: "✨" }, // Migrates to: now_im_thinking
    { id: "witnessing", label: "Witnessing this", emoji: "👁️" }, // Migrates to: feel_this
    { id: "holding", label: "Holding this with care", emoji: "❤️" }, // Migrates to: sending_warmth
    { id: "useful", label: "Useful reflection", emoji: "💡" }, // Migrates to: shifted_something
  ],
};
