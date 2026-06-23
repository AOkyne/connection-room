// Connections data access layer - demo mode with localStorage

import type { Profile } from "./profiles";

export interface PairingPreferences {
  frequency: "weekly" | "monthly" | "pause";
  contactMode: "text" | "voice-video" | "local";
  optInToExchangeContact: boolean;
}

export interface Pairing {
  id: string;
  userId: string;
  partnerId: string;
  partnerName: string;
  partnerPronouns?: string;
  partnerPhoto: string;
  partnerInterests: string[];
  status: "active" | "completed" | "skipped";
  createdAt: Date;
  completedAt?: Date;
  sharedPrompt: string;
  mutualContactOptIn: boolean;
}

const PREFERENCES_STORAGE_KEY = "connection-room:pairing-preferences";
const PAIRINGS_STORAGE_KEY = "connection-room:pairings";
const CURRENT_PAIRING_KEY = "connection-room:current-pairing";

// Get pairing preferences
export function getPairingPreferences(userId: string): PairingPreferences {
  if (typeof window === "undefined") {
    return { frequency: "weekly", contactMode: "text", optInToExchangeContact: false };
  }

  const stored = localStorage.getItem(`${PREFERENCES_STORAGE_KEY}:${userId}`);
  if (stored) {
    return JSON.parse(stored);
  }

  return { frequency: "weekly", contactMode: "text", optInToExchangeContact: false };
}

// Update pairing preferences
export function updatePairingPreferences(userId: string, preferences: PairingPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFERENCES_STORAGE_KEY}:${userId}`, JSON.stringify(preferences));
}

// Generate demo pairing (simple matching based on interests)
export function generateDemoPairing(userProfile: Profile): Pairing | null {
  // Demo partners with different interest profiles
  const demoPartners = [
    {
      name: "Alex",
      pronouns: "he/him",
      photo: generateDemoAvatar("A"),
      interests: ["Embodiment", "Authentic connection", "Touch and affection"],
    },
    {
      name: "Jordan",
      pronouns: "he/him",
      photo: generateDemoAvatar("J"),
      interests: ["Spirituality", "Sexuality", "Relationships"],
    },
    {
      name: "Marcus",
      pronouns: "he/him",
      photo: generateDemoAvatar("M"),
      interests: ["Communication and repair", "Couples intimacy", "Shame and self-acceptance"],
    },
    {
      name: "Sam",
      pronouns: "he/him",
      photo: generateDemoAvatar("S"),
      interests: ["Authentic connection", "Dating and desire", "Embodiment"],
    },
    {
      name: "David",
      pronouns: "he/him",
      photo: generateDemoAvatar("D"),
      interests: ["Spirituality", "Touch and affection", "Authentic connection"],
    },
  ];

  // Simple deterministic pairing based on day of week
  const dayOfWeek = new Date().getDay();
  const partner = demoPartners[dayOfWeek % demoPartners.length];

  // Find shared interests (or use empty array if user has no interests)
  const sharedInterests = (userProfile.interests || []).length > 0
    ? partner.interests.filter((i) => userProfile.interests?.includes(i))
    : [];

  const prompts = [
    "What brought you here and what kind of connection are you practicing?",
    "What has been challenging about intimacy or connection in your life?",
    "What does it feel like to slow down and be present with someone?",
    "Where do you feel yourself in your body right now?",
    "What would it take to feel more safe in vulnerability?",
  ];

  const pairing: Pairing = {
    id: `pairing-${Date.now()}`,
    userId: userProfile.id,
    partnerId: `demo-${partner.name.toLowerCase()}`,
    partnerName: partner.name,
    partnerPronouns: partner.pronouns,
    partnerPhoto: partner.photo,
    partnerInterests: partner.interests,
    status: "active",
    createdAt: new Date(),
    sharedPrompt: prompts[dayOfWeek % prompts.length],
    mutualContactOptIn: false,
  };

  return pairing;
}

// Helper to generate avatar SVG
function generateDemoAvatar(initial: string): string {
  const colors = ["#d4a574", "#9d7f5c", "#8fa878", "#b86a52", "#6b5f52", "#a0968a"];
  const color = colors[initial.charCodeAt(0) % colors.length];

  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">${initial}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
}

// Get current pairing
export function getCurrentPairing(userId: string): Pairing | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(`${CURRENT_PAIRING_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : null;
}

// Save current pairing
export function setCurrentPairing(userId: string, pairing: Pairing | null): void {
  if (typeof window === "undefined") return;

  if (pairing) {
    localStorage.setItem(`${CURRENT_PAIRING_KEY}:${userId}`, JSON.stringify(pairing));
  } else {
    localStorage.removeItem(`${CURRENT_PAIRING_KEY}:${userId}`);
  }
}

// Mark pairing as complete
export function completePairing(userId: string, pairingId: string): void {
  if (typeof window === "undefined") return;

  const pairing = getCurrentPairing(userId);
  if (pairing && pairing.id === pairingId) {
    pairing.status = "completed";
    pairing.completedAt = new Date();
    setCurrentPairing(userId, pairing);
  }
}

// Skip current pairing
export function skipPairing(userId: string): void {
  if (typeof window === "undefined") return;
  setCurrentPairing(userId, null);
}

// Report concern with pairing
export function reportPairingConcern(userId: string, pairingId: string, concern: string): void {
  if (typeof window === "undefined") return;

  const reports = JSON.parse(localStorage.getItem("connection-room:pairing-reports") || "[]");
  reports.push({
    id: `report-${Date.now()}`,
    userId,
    pairingId,
    concern,
    createdAt: new Date(),
    status: "pending",
  });

  localStorage.setItem("connection-room:pairing-reports", JSON.stringify(reports));
}

// Get pairing history
export function getPairingHistory(userId: string): Pairing[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${PAIRINGS_STORAGE_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : [];
}
