// Shared types for "Your Experience Wanted". Field names mirror migration
// 104's columns (camelCased).

export type QuestionSource = "seed" | "member";
export type QuestionStatus = "open" | "closed" | "removed";
export type EmailReview = "not_requested" | "pending" | "approved" | "rejected";
export type PostBootstrapMode = "recycle_and_member" | "member_only";
export type Phase = "bootstrap" | "post_bootstrap";

export type InvitationState =
  | "scheduled"
  | "retry"
  | "sending"
  | "sent"
  | "unknown"
  | "dropped"
  | "expired"
  | "canceled";

/** States that never reached the provider: they release the member/question pair. */
export const RELEASED_STATES: InvitationState[] = ["dropped", "expired", "canceled"];
/** States that hold the member's single pending reservation. */
export const PENDING_STATES: InvitationState[] = ["scheduled", "retry", "sending"];
/** States that count toward the monthly cap and 30-day gap. */
export const COUNTING_STATES: InvitationState[] = ["sending", "sent", "unknown"];

export interface ExperienceSettings {
  enabled: boolean;
  paused: boolean;
  launchedAt: Date | null;
  bootstrapEndsAt: Date | null;
  timezone: string;
  postBootstrapMode: PostBootstrapMode;
  waveIntervalDays: number;
  staggerDays: number;
  perQuestionCap: number;
  /** No wave invites more than this % of all members (default 25). */
  maxWaveSharePercent: number;
  /** Everyone in a wave gets the same question (default true). */
  singleQuestionPerWave: boolean;
  sendWindowStartHour: number;
  sendWindowEndHour: number;
  attributionDays: number;
  maxSendsPerRun: number;
}

export interface Topic {
  slug: string;
  label: string;
  sensitive: boolean;
}

export interface Question {
  id: string;
  source: QuestionSource;
  authorId: string | null;
  /** Member questions shown as "A member", with no link to the account. */
  anonymous: boolean;
  text: string;
  topic: string;
  status: QuestionStatus;
  emailPermission: boolean;
  emailReview: EmailReview;
  emailText: string | null;
  firstActivatedAt: Date | null;
  threadPostId: string | null;
  /** All threads of this question (current + continuations), for "already answered". */
  threadPostIds: string[];
}

export interface MemberPreferences {
  optedOut: boolean;
  paused: boolean;
  /** null = every non-sensitive topic. */
  topics: string[] | null;
  timezone: string | null;
}

export interface Member {
  userId: string;
  firstName: string | null;
  email: string | null;
  emailVerified: boolean;
  completedOnboarding: boolean;
  suspended: boolean;
  deactivated: boolean;
  /** Existing app-wide notification setting; 'off' = no notification emails. */
  notificationsOff: boolean;
  prefs: MemberPreferences;
}

export interface Invitation {
  id: string;
  waveId: string | null;
  userId: string;
  questionId: string;
  state: InvitationState;
  dueAt: Date;
  windowEndsAt: Date;
  selectionReason: string | null;
  dropReason: string | null;
  attempts: number;
  claimedAt: Date | null;
  sentAt: Date | null;
  providerMessageId: string | null;
  needsReview: boolean;
}

export interface Wave {
  id: string;
  startsAt: Date;
  windowEndsAt: Date;
  phase: Phase;
  sourceMode: string;
}
