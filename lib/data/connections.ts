// Connections data access layer - demo mode with localStorage

import type { Profile } from "./profiles";

export interface ConnectionPreferences {
  frequency: "weekly" | "monthly" | "pause";
  contactMode: "text" | "voice-video" | "local";
  optInToExchangeContact: boolean;
}

export interface Connection {
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

const PREFERENCES_STORAGE_KEY = "connection-room:connection-preferences";
const CONNECTIONS_STORAGE_KEY = "connection-room:connections";
const CURRENT_CONNECTION_KEY = "connection-room:current-connection";

// Get connection preferences
export function getConnectionPreferences(userId: string): ConnectionPreferences {
  if (typeof window === "undefined") {
    return { frequency: "weekly", contactMode: "text", optInToExchangeContact: false };
  }

  const stored = localStorage.getItem(`${PREFERENCES_STORAGE_KEY}:${userId}`);
  if (stored) {
    return JSON.parse(stored);
  }

  return { frequency: "weekly", contactMode: "text", optInToExchangeContact: false };
}

// Update connection preferences
export function updateConnectionPreferences(userId: string, preferences: ConnectionPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFERENCES_STORAGE_KEY}:${userId}`, JSON.stringify(preferences));
}

// Generate demo connection (simple matching based on interests)
export function generateDemoConnection(userProfile: Profile): Connection | null {
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

  // Simple deterministic matching based on day of week
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

  const connection: Connection = {
    id: `connection-${Date.now()}`,
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

  return connection;
}

// Helper to generate avatar SVG
function generateDemoAvatar(initial: string): string {
  const colors = ["#d4a348", "#8b6f47", "#c97a2a", "#a84a2a", "#1a0f0a", "#a0704a"];
  const color = colors[initial.charCodeAt(0) % colors.length];

  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">${initial}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
}

// Get current connection
export function getCurrentConnection(userId: string): Connection | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(`${CURRENT_CONNECTION_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : null;
}

// Save current connection
export function setCurrentConnection(userId: string, connection: Connection | null): void {
  if (typeof window === "undefined") return;

  if (connection) {
    localStorage.setItem(`${CURRENT_CONNECTION_KEY}:${userId}`, JSON.stringify(connection));
  } else {
    localStorage.removeItem(`${CURRENT_CONNECTION_KEY}:${userId}`);
  }
}

// Mark connection as complete
export function completeConnection(userId: string, connectionId: string): void {
  if (typeof window === "undefined") return;

  const connection = getCurrentConnection(userId);
  if (connection && connection.id === connectionId) {
    connection.status = "completed";
    connection.completedAt = new Date();
    setCurrentConnection(userId, connection);
  }
}

// Skip current connection
export function skipConnection(userId: string): void {
  if (typeof window === "undefined") return;
  setCurrentConnection(userId, null);
}

// Report concern with connection
export function reportConnectionConcern(userId: string, connectionId: string, concern: string): void {
  if (typeof window === "undefined") return;

  const reports = JSON.parse(localStorage.getItem("connection-room:connection-reports") || "[]");
  reports.push({
    id: `report-${Date.now()}`,
    userId,
    connectionId,
    concern,
    createdAt: new Date(),
    status: "pending",
  });

  localStorage.setItem("connection-room:connection-reports", JSON.stringify(reports));
}

// Create connection from matched profile
export function createConnectionFromMatch(userProfile: Profile, partnerProfile: Profile, sharedInterests: string[]): Connection {
  const prompts = [
    "What brought you here and what kind of connection are you practicing?",
    "What has been challenging about intimacy or connection in your life?",
    "What does it feel like to slow down and be present with someone?",
    "Where do you feel yourself in your body right now?",
    "What would it take to feel more safe in vulnerability?",
    "How do you experience the interests you both share?",
    "What would a meaningful connection look like for you?",
  ];

  const connection: Connection = {
    id: `connection-${Date.now()}`,
    userId: userProfile.id,
    partnerId: partnerProfile.id,
    partnerName: partnerProfile.displayName,
    partnerPronouns: partnerProfile.pronouns,
    partnerPhoto: partnerProfile.profilePhoto,
    partnerInterests: partnerProfile.interests || [],
    status: "active",
    createdAt: new Date(),
    sharedPrompt: prompts[Math.floor(Math.random() * prompts.length)],
    mutualContactOptIn: false,
  };

  return connection;
}

// Get connection history
export function getConnectionHistory(userId: string): Connection[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${CONNECTIONS_STORAGE_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : [];
}
