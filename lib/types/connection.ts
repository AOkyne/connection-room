export interface ConnectionInterest {
  id?: string;
  userId: string;
  theme: string;
  spaceId?: string;
  promptId?: string;
  sourceType: "prompt" | "post" | "weekly_theme" | "space";
  createdAt: Date;
}

export interface ConnectionMilestone {
  id: string;
  userId: string;
  milestoneType:
    | "first-share"
    | "first-witness"
    | "thoughtful-witness"
    | "community-builder"
    | "steady-return";
  earnedAt: Date;
}

export interface ConnectionPracticeSummary {
  userId: string;
  reflectionsShared: number;
  commentsOffered: number;
  spacesJoined: number;
  connectionInterestsSaved: number;
  monthlyIntention?: string;
  lastParticipationDate?: Date;
  milestones: ConnectionMilestone[];
}

export interface WeeklyThread {
  id?: string;
  title: string;
  prompt: string;
  weekStart: Date;
  monthTheme?: string;
  weekTheme?: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------
// Async Guided Connections (migration 078+). Shared across
// lib/data/connectionAsync.ts, connection dashboard/detail pages, and the
// round/reveal/live-scheduling components -- co-located here rather than in
// connectionAsync.ts because both the data layer and several components
// import these without needing anything else from that module.
// ---------------------------------------------------------------------

export type AsyncConnectionStatus =
  // legacy (migration 010) -- still valid on old rows, never written by new code
  | "pending_their_acceptance"
  | "confirmed"
  | "active"
  | "completed"
  | "declined"
  // async guided exchange lifecycle
  | "awaiting_acceptance"
  | "accepted_by_one"
  | "waiting_for_participant"
  | "extended"
  | "awaiting_next_round"
  | "exchange_complete"
  | "live_requested"
  | "live_scheduled"
  | "expired"
  | "ended"
  | "reported"
  | "cancelled";

export type ConnectionFormat = "guided_message" | "scheduled_live" | "live_now" | "any";

export interface AsyncConnectionPreferences {
  frequency: "weekly" | "monthly" | "pause";
  contactMode: "text" | "voice-video" | "local";
  optInToExchangeContact: boolean;
  formats: ConnectionFormat[];
}

export interface ConnectionParticipant {
  id: string;
  connectionId: string;
  userId: string;
  invitationStatus: "invited" | "accepted" | "declined";
  acceptedAt?: Date;
  declinedAt?: Date;
  lastViewedAt?: Date;
  completedAt?: Date;
  endedAt?: Date;
  liveRequestedAt?: Date;
}

export interface AsyncConnection {
  id: string;
  status: AsyncConnectionStatus;
  connectionType: "async" | "live";
  currentRoundNumber: number;
  invitationExpiresAt?: Date;
  activatedAt?: Date;
  responseDeadlineAt?: Date;
  extensionUsedAt?: Date;
  liveRequestedAt?: Date;
  createdAt: Date;
  // Denormalized "other member" view, resolved the same way
  // lib/data/connections.ts already resolves partner_* for the legacy table.
  partnerId: string;
  partnerName: string;
  partnerPhoto: string;
  myParticipantId: string;
  myInvitationStatus: "invited" | "accepted" | "declined";
  sharedPrompt?: string;
}

export interface ConnectionRound {
  id: string;
  connectionId: string;
  roundNumber: number;
  status: "open" | "revealed" | "completed";
  promptText: string;
  followUpPrompt?: string;
  responseCharacterLimit: number;
  openedAt: Date;
  responseDeadlineAt: Date;
  revealedAt?: Date;
  completedAt?: Date;
}

export interface RoundResponseView {
  participantId: string;
  isMine: boolean;
  submittedText: string | null;
  submittedAt: Date | null;
  revealedAt: Date | null;
  viewedAt: Date | null;
  advancedAt: Date | null;
}

export const ACKNOWLEDGMENT_TYPES = [
  "relate",
  "thank_you",
  "understand_better",
  "want_more",
  "stayed_with_me",
  "custom",
] as const;

export type AcknowledgmentType = (typeof ACKNOWLEDGMENT_TYPES)[number];

export const ACKNOWLEDGMENT_LABELS: Record<AcknowledgmentType, string> = {
  relate: "I relate to this.",
  thank_you: "Thank you for sharing that.",
  understand_better: "That helped me understand you better.",
  want_more: "I'd like to hear more about that.",
  stayed_with_me: "Something in this stayed with me.",
  custom: "Write your own",
};

export interface ConnectionAcknowledgment {
  id: string;
  connectionRoundId: string;
  fromParticipantId: string;
  acknowledgmentType: AcknowledgmentType;
  acknowledgmentText?: string;
  createdAt: Date;
}

export interface LiveAvailabilityWindow {
  id?: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}

export interface LiveSession {
  id: string;
  connectionId: string;
  status: "requested" | "scheduled" | "active" | "completed" | "cancelled";
  scheduledStartAt?: Date;
  actualStartedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
}
