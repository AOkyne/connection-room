export interface WeeklyPrompt {
  weekNumber: 1 | 2 | 3 | 4;
  title: string;
  dashboardPrompt: string;
  privateReflection: string;
  communityInvitation: string;
  pairingPrompt: string;
}

export interface MonthlyRitual {
  title: string;
  description: string;
  options?: string[];
}

export interface MonthlyIntegration {
  prompt: string;
  suggestedNextStep: string;
}

export interface Month {
  monthNumber: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  monthlyTheme: string;
  monthlyReflection: string;
  trevorNote: string;
  ritual: MonthlyRitual;
  weeks: WeeklyPrompt[];
  integration: MonthlyIntegration;
}

export interface GuidedRhythmProgress {
  userId: string;
  currentMonth: number;
  currentWeek: number;
  privateReflections: Record<string, string>;
  monthlyIntegrations: Record<number, string>;
  monthlyIntentions: Record<number, string>;
  startedAt: Date;
  updatedAt: Date;
}

export interface PairingPromptBank {
  id: string;
  prompt: string;
  monthRelated?: number;
  weekRelated?: number;
}
