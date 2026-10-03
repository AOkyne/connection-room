import { describe, it, expect } from "vitest";
import { computeMetrics } from "./metrics";

const d = (day: number) => new Date(Date.UTC(2027, 0, 1) + day * 86400000);

describe("experience metrics", () => {
  it("credits a response only within the attribution window, for the invited question", () => {
    const invitations = [
      { userId: "a", questionId: "q1", state: "sent", sentAt: d(0), firstVisitAt: d(0), dropReason: null, needsReview: false },
      { userId: "b", questionId: "q1", state: "sent", sentAt: d(0), firstVisitAt: null, dropReason: null, needsReview: false },
      { userId: "c", questionId: "q2", state: "sent", sentAt: d(0), firstVisitAt: d(1), dropReason: null, needsReview: false },
      { userId: "e", questionId: "q2", state: "dropped", sentAt: null, firstVisitAt: null, dropReason: "delivery_failed", needsReview: false },
    ];
    const contributions = [
      { userId: "a", questionId: "q1", isReply: false, parentAuthorId: null, createdAt: d(3) }, // within 14 days
      { userId: "b", questionId: "q1", isReply: false, parentAuthorId: null, createdAt: d(20) }, // too late
      { userId: "c", questionId: "q1", isReply: false, parentAuthorId: null, createdAt: d(2) }, // different question
      { userId: "c", questionId: "q2", isReply: true, parentAuthorId: "a", createdAt: d(2) }, // reply, not a response
      { userId: "a", questionId: "q2", isReply: false, parentAuthorId: null, createdAt: d(4) },
    ];
    const m = computeMetrics(invitations, contributions, { attributionDays: 14, optOuts: 1, complaints: 0 });
    expect(m.acceptedInvitations).toBe(3);
    expect(m.uniqueLinkVisits).toBe(2);
    expect(m.invitationsWithResponseInWindow).toBe(1);
    expect(m.conversionRate).toBeCloseTo(1 / 3);
    expect(m.repliesByOtherMembers).toBe(1);
    expect(m.uniqueContributors).toBe(3);
    expect(m.returningContributors).toBe(2); // a and c contributed to two questions
    expect(m.deliveryFailures).toBe(1);
  });
});
