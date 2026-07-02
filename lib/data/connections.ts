// Connections data access layer - demo mode with localStorage

import type { Profile } from "./profiles";

export interface ConnectionPreferences {
  frequency: "weekly" | "monthly" | "pause";
  contactMode: "text" | "voice-video" | "local";
  optInToExchangeContact: boolean;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserPhoto: string;
  fromUserInterests: string[];
  status: "pending" | "accepted" | "declined";
  sharedPrompt: string;
  createdAt: Date;
  respondedAt?: Date;
}

export interface Connection {
  id: string;
  userId: string;
  partnerId: string;
  partnerName: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  partnerPronouns?: string;
  partnerPhoto: string;
  partnerInterests: string[];
  partnerContactMode?: "text" | "voice-video" | "local";
  status: "pending_their_acceptance" | "confirmed" | "active" | "completed" | "declined";
  createdAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  sharedPrompt: string;
  mutualContactOptIn: boolean;
}

const PREFERENCES_STORAGE_KEY = "connection-room:connection-preferences";
const CONNECTIONS_STORAGE_KEY = "connection-room:connections";
const CURRENT_CONNECTION_KEY = "connection-room:current-connection";
const HISTORY_STORAGE_KEY = "connection-room:connection-history";

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
export function generateDemoConnection(userProfile: Profile, randomize = true): Connection | null {
  // Demo partners with different interest profiles
  const demoPartners = [
    {
      firstName: "Alex",
      lastName: "Chen",
      pronouns: "he/him",
      photo: "/demo-members/seed-man-04.png",
      interests: ["Embodiment", "Authentic connection", "Touch and affection"],
    },
    {
      firstName: "Jordan",
      lastName: "Williams",
      pronouns: "they/them",
      photo: "/demo-members/seed-man-08.png",
      interests: ["Spirituality", "Sexuality", "Relationships"],
    },
    {
      firstName: "Marcus",
      lastName: "Johnson",
      pronouns: "he/him",
      photo: "/demo-members/seed-man-12.png",
      interests: ["Communication and repair", "Couples intimacy", "Shame and self-acceptance"],
    },
    {
      firstName: "Sam",
      lastName: "Martinez",
      pronouns: "he/him",
      photo: "/demo-members/seed-man-16.png",
      interests: ["Authentic connection", "Dating and desire", "Embodiment"],
    },
    {
      firstName: "David",
      lastName: "Lee",
      pronouns: "he/him",
      photo: "/demo-members/seed-man-20.png",
      interests: ["Spirituality", "Touch and affection", "Authentic connection"],
    },
  ];

  const prompts = [
    "What brought you here and what kind of connection are you practicing?",
    "What has been challenging about intimacy or connection in your life?",
    "What would it take to feel more safe in vulnerability?",
    "What does a good conversation feel like to you?",
    "What's something you've been curious about lately?",
    "Tell me about a time you felt truly heard by someone.",
    "What usually stops you from opening up to people?",
    "What's one thing you'd like someone to know about you?",
    "What's something small that made you smile this week?",
    "How do you usually know when you need connection with someone?",
    "What's a quality you admire in people you feel close to?",
    "What would it take for you to feel more relaxed right now?",
    "Tell me about someone who really gets you.",
    "What's something you've changed your mind about recently?",
    "When do you feel most like yourself?",
    "What's a conversation that stuck with you?",
    "How do you usually celebrate or acknowledge good things in your life?",
    "What's something you're learning about yourself right now?",
    "What would a perfect 20 minutes with someone look like for you?",
    "What makes you feel most alive or energized?",
    "What helps you feel grounded when things are chaotic?",
    "What's something you've had to learn the hard way?",
    "Who inspires you and why?",
    "What does rest mean to you?",
  ];

  // Select partner: random if button clicked, or week-based if initial load
  let partner;
  let promptIndex;

  if (randomize) {
    // True random selection for each button click
    const randomIndex = Math.floor(Math.random() * demoPartners.length);
    partner = demoPartners[randomIndex];
    promptIndex = Math.floor(Math.random() * prompts.length);
  } else {
    // Deterministic week-based selection for initial load
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const userIdNum = userProfile.id.charCodeAt(0) || 0;
    const partnerIndex = (weekNumber + userIdNum) % demoPartners.length;
    partner = demoPartners[partnerIndex];
    promptIndex = weekNumber % prompts.length;
  }

  const connection: Connection = {
    id: `connection-${Date.now()}`,
    userId: userProfile.id,
    partnerId: `demo-${partner.firstName.toLowerCase()}`,
    partnerName: `${partner.firstName} ${partner.lastName}`,
    partnerFirstName: partner.firstName,
    partnerLastName: partner.lastName,
    partnerPronouns: partner.pronouns,
    partnerPhoto: partner.photo,
    partnerInterests: partner.interests,
    status: "confirmed",
    createdAt: new Date(),
    confirmedAt: new Date(),
    sharedPrompt: prompts[promptIndex],
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
    partnerFirstName: partnerProfile.firstName,
    partnerLastName: partnerProfile.lastName,
    partnerPronouns: partnerProfile.pronouns,
    partnerPhoto: partnerProfile.profilePhoto,
    partnerInterests: partnerProfile.interests || [],
    status: "confirmed",
    createdAt: new Date(),
    confirmedAt: new Date(),
    sharedPrompt: prompts[Math.floor(Math.random() * prompts.length)],
    mutualContactOptIn: false,
  };

  return connection;
}

// Get completed connection history
export function getConnectionHistory(userId: string): Connection[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${HISTORY_STORAGE_KEY}:${userId}`);
  return stored ? JSON.parse(stored) : [];
}

// Add connection to history when completed
export function addToConnectionHistory(userId: string, connection: Connection): void {
  if (typeof window === "undefined") return;

  const history = getConnectionHistory(userId);
  history.push({
    ...connection,
    status: "completed" as const,
  });

  localStorage.setItem(`${HISTORY_STORAGE_KEY}:${userId}`, JSON.stringify(history));
}

// Get all declined user IDs to avoid re-matching
export function getDeclinedUsers(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  const stored = localStorage.getItem(`connection-room:declined-users:${userId}`);
  const declined = stored ? JSON.parse(stored) : [];
  return new Set(declined);
}

// Add user to declined list
export function addToDeclinedUsers(userId: string, declinedUserId: string): void {
  if (typeof window === "undefined") return;

  const declined = Array.from(getDeclinedUsers(userId));
  if (!declined.includes(declinedUserId)) {
    declined.push(declinedUserId);
    localStorage.setItem(`connection-room:declined-users:${userId}`, JSON.stringify(declined));
  }
}

// Connection Request Management (localStorage)
const REQUEST_STORAGE_KEY = "connection-room:connection-requests";
const OUTGOING_REQUEST_KEY = "connection-room:outgoing-requests";

export function createConnectionRequest(
  fromUserId: string,
  fromUserName: string,
  fromUserPhoto: string,
  fromUserInterests: string[],
  toUserId: string,
  sharedPrompt: string
): ConnectionRequest {
  const request: ConnectionRequest = {
    id: `request-${Date.now()}`,
    fromUserId,
    toUserId,
    fromUserName,
    fromUserPhoto,
    fromUserInterests,
    status: "pending",
    sharedPrompt,
    createdAt: new Date(),
  };

  if (typeof window === "undefined") return request;

  // Save to recipient's incoming requests
  const incomingKey = `${REQUEST_STORAGE_KEY}:${toUserId}`;
  const incoming = JSON.parse(localStorage.getItem(incomingKey) || "[]");
  incoming.push(request);
  localStorage.setItem(incomingKey, JSON.stringify(incoming));

  // Save to sender's outgoing requests
  const outgoingKey = `${OUTGOING_REQUEST_KEY}:${fromUserId}`;
  const outgoing = JSON.parse(localStorage.getItem(outgoingKey) || "[]");
  outgoing.push(request);
  localStorage.setItem(outgoingKey, JSON.stringify(outgoing));

  return request;
}

export function getIncomingRequests(userId: string): ConnectionRequest[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${REQUEST_STORAGE_KEY}:${userId}`);
  const requests = stored ? JSON.parse(stored) : [];
  return requests.filter((r: ConnectionRequest) => r.status === "pending");
}

export function getOutgoingRequests(userId: string): ConnectionRequest[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`${OUTGOING_REQUEST_KEY}:${userId}`);
  const requests = stored ? JSON.parse(stored) : [];
  return requests.filter((r: ConnectionRequest) => r.status === "pending");
}

export function acceptConnectionRequest(
  requestId: string,
  userId: string,
  partnerProfile: Profile,
  sharedPrompt: string
): Connection | null {
  if (typeof window === "undefined") return null;

  const incomingKey = `${REQUEST_STORAGE_KEY}:${userId}`;
  const requests = JSON.parse(localStorage.getItem(incomingKey) || "[]");
  const request = requests.find((r: ConnectionRequest) => r.id === requestId);

  if (!request) return null;

  // Mark request as accepted
  request.status = "accepted";
  request.respondedAt = new Date();
  localStorage.setItem(incomingKey, JSON.stringify(requests));

  // Create connection
  const connection: Connection = {
    id: `connection-${Date.now()}`,
    userId,
    partnerId: request.fromUserId,
    partnerName: request.fromUserName,
    partnerFirstName: request.fromUserName.split(" ")[0],
    partnerLastName: request.fromUserName.split(" ")[1] || "",
    partnerPhoto: request.fromUserPhoto,
    partnerInterests: request.fromUserInterests,
    status: "confirmed",
    createdAt: new Date(),
    confirmedAt: new Date(),
    sharedPrompt,
    mutualContactOptIn: false,
  };

  setCurrentConnection(userId, connection);
  return connection;
}

export function declineConnectionRequest(requestId: string, userId: string): boolean {
  if (typeof window === "undefined") return false;

  const incomingKey = `${REQUEST_STORAGE_KEY}:${userId}`;
  const requests = JSON.parse(localStorage.getItem(incomingKey) || "[]");
  const request = requests.find((r: ConnectionRequest) => r.id === requestId);

  if (!request) return false;

  // Just remove the request (silent decline)
  const updated = requests.filter((r: ConnectionRequest) => r.id !== requestId);
  localStorage.setItem(incomingKey, JSON.stringify(updated));

  return true;
}
