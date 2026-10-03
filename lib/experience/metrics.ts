// Aggregate metrics for the admin page. Counts only -- no names, no
// question text. Conversion uses an explicit attribution window: an
// invitation "converted" only if its recipient posted a response to THAT
// question within `attributionDays` of the email being accepted. Later or
// unrelated activity is not credited to the email. Email opens are not
// used at all (privacy features make them unreliable).

import { DAY_MS } from "./time";

export interface MetricInvitation {
  userId: string;
  questionId: string;
  state: string;
  sentAt: Date | null;
  firstVisitAt: Date | null;
  dropReason: string | null;
  needsReview: boolean;
}

export interface MetricContribution {
  userId: string; // real author (anonymous follow-ups resolved server-side)
  questionId: string;
  isReply: boolean;
  /** For replies: the real author of the response being replied to. */
  parentAuthorId: string | null;
  createdAt: Date;
}

export interface ExperienceMetrics {
  acceptedInvitations: number;
  uniqueLinkVisits: number;
  initialResponses: number;
  repliesByOtherMembers: number;
  uniqueContributors: number;
  returningContributors: number;
  invitationsWithResponseInWindow: number;
  conversionRate: number;
  attributionDays: number;
  deliveryFailures: number;
  awaitingReview: number;
  optOuts: number;
  complaints: number;
}

export function computeMetrics(
  invitations: MetricInvitation[],
  contributions: MetricContribution[],
  opts: { attributionDays: number; optOuts: number; complaints: number }
): ExperienceMetrics {
  const accepted = invitations.filter((i) => i.state === "sent" && i.sentAt);
  const windowMs = opts.attributionDays * DAY_MS;

  const responsesByUserQuestion = new Map<string, Date[]>();
  for (const c of contributions) {
    if (c.isReply) continue;
    const k = `${c.userId}:${c.questionId}`;
    responsesByUserQuestion.set(k, [...(responsesByUserQuestion.get(k) || []), c.createdAt]);
  }
  const converted = accepted.filter((i) =>
    (responsesByUserQuestion.get(`${i.userId}:${i.questionId}`) || []).some(
      (t) => t.getTime() >= i.sentAt!.getTime() && t.getTime() <= i.sentAt!.getTime() + windowMs
    )
  ).length;

  const contributorDays = new Map<string, Set<string>>();
  for (const c of contributions) {
    if (!contributorDays.has(c.userId)) contributorDays.set(c.userId, new Set());
    contributorDays.get(c.userId)!.add(`${c.questionId}`);
  }

  return {
    acceptedInvitations: accepted.length,
    uniqueLinkVisits: accepted.filter((i) => i.firstVisitAt).length,
    initialResponses: contributions.filter((c) => !c.isReply).length,
    repliesByOtherMembers: contributions.filter((c) => c.isReply && c.parentAuthorId && c.parentAuthorId !== c.userId).length,
    uniqueContributors: contributorDays.size,
    returningContributors: [...contributorDays.values()].filter((qs) => qs.size >= 2).length,
    invitationsWithResponseInWindow: converted,
    conversionRate: accepted.length ? converted / accepted.length : 0,
    attributionDays: opts.attributionDays,
    deliveryFailures: invitations.filter((i) => i.dropReason === "delivery_failed").length,
    awaitingReview: invitations.filter((i) => i.state === "unknown" && i.needsReview).length,
    optOuts: opts.optOuts,
    complaints: opts.complaints,
  };
}
