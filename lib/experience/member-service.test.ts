import { describe, it, expect } from "vitest";
import { toPublic } from "./member-service";

const AUTHOR = "aaaaaaaa-0000-4000-8000-000000000001";
const OTHER = "bbbbbbbb-0000-4000-8000-000000000002";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "q1",
  source: "member",
  author_id: AUTHOR,
  anonymous: true,
  text: "How do you meet friends as an adult?",
  context: "I moved last year.",
  topic: "friendship",
  status: "open",
  email_permission: true,
  email_review: "approved",
  email_text: "How do you meet friends as an adult?",
  first_activated_at: "2027-01-01T00:00:00Z",
  thread_post_id: "post-1",
  previous_thread_post_ids: [],
  created_at: "2027-01-01T00:00:00Z",
  ...overrides,
});

const topics = new Map([["friendship", "Friendship"]]);
const names = new Map([[AUTHOR, "Marcus T."]]);
const stats = new Map([["post-1", { responses: 2, last: "2027-01-03T00:00:00Z" }]]);

describe("member-facing question data", () => {
  it("never exposes who asked an anonymous question to other members", () => {
    const pub = toPublic(row(), OTHER, topics, names, stats);
    const json = JSON.stringify(pub);
    expect(pub.authorName).toBe("A member");
    expect(json).not.toContain(AUTHOR);
    expect(json).not.toContain("Marcus");
    expect(pub.viewerIsAuthor).toBe(false);
    expect(pub.own).toBeUndefined();
  });

  it("tells the author it's theirs (and their own settings) without exposing ids", () => {
    const pub = toPublic(row(), AUTHOR, topics, names, stats);
    expect(pub.viewerIsAuthor).toBe(true);
    expect(pub.own).toEqual({ anonymous: true, emailPermission: true, emailReview: "approved" });
    expect(JSON.stringify(pub)).not.toContain(AUTHOR);
  });

  it("shows the author's name only when they chose to post with it", () => {
    expect(toPublic(row({ anonymous: false }), OTHER, topics, names, stats).authorName).toBe("Marcus T.");
  });

  it("labels seeds as community prompts with no author", () => {
    const pub = toPublic(row({ source: "seed", author_id: null, anonymous: false }), OTHER, topics, names, stats);
    expect(pub.label).toBe("Community prompt");
    expect(pub.authorName).toBeNull();
  });
});
