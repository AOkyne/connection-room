export interface PairingInterest {
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
  pairingInterestsSaved: number;
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
