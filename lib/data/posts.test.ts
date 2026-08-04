import { describe, it, expect } from "vitest";
import { groupCommentsIntoThreads, type Comment } from "./posts";

function makeComment(overrides: Partial<Comment> & { id: string }): Comment {
  return {
    postId: "post-1",
    userId: "user-1",
    authorName: "Someone",
    content: "content",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    reactions: {},
    ...overrides,
  };
}

describe("groupCommentsIntoThreads", () => {
  it("returns one thread per top-level comment when there are no replies", () => {
    const comments = [makeComment({ id: "a" }), makeComment({ id: "b" })];
    const threads = groupCommentsIntoThreads(comments);
    expect(threads).toHaveLength(2);
    expect(threads.map((t) => t.topLevel.id)).toEqual(["a", "b"]);
    expect(threads[0].replies).toEqual([]);
  });

  it("groups a direct reply under its top-level parent", () => {
    const comments = [
      makeComment({ id: "a" }),
      makeComment({ id: "a-reply", parentCommentId: "a", rootCommentId: "a" }),
    ];
    const threads = groupCommentsIntoThreads(comments);
    expect(threads).toHaveLength(1);
    expect(threads[0].topLevel.id).toBe("a");
    expect(threads[0].replies.map((r) => r.id)).toEqual(["a-reply"]);
  });

  it("keeps a reply-to-a-reply in the SAME thread at the same single reply level (no 3rd level)", () => {
    const comments = [
      makeComment({ id: "a" }),
      makeComment({
        id: "a-reply-1",
        parentCommentId: "a",
        rootCommentId: "a",
        createdAt: new Date("2026-01-01T00:01:00Z"),
      }),
      // A reply TO a-reply-1 -- parentCommentId points at a-reply-1, but
      // rootCommentId still points at the original top-level comment "a".
      makeComment({
        id: "a-reply-2",
        parentCommentId: "a-reply-1",
        rootCommentId: "a",
        createdAt: new Date("2026-01-01T00:02:00Z"),
      }),
    ];
    const threads = groupCommentsIntoThreads(comments);
    expect(threads).toHaveLength(1);
    expect(threads[0].topLevel.id).toBe("a");
    // Both replies render at the same single indent level under "a" --
    // this is the 2-level cap: no thread ever produces a nested "replies
    // of replies" structure.
    expect(threads[0].replies.map((r) => r.id)).toEqual(["a-reply-1", "a-reply-2"]);
  });

  it("orders replies oldest-first regardless of input order", () => {
    const comments = [
      makeComment({ id: "a" }),
      makeComment({ id: "later", parentCommentId: "a", rootCommentId: "a", createdAt: new Date("2026-01-02T00:00:00Z") }),
      makeComment({ id: "earlier", parentCommentId: "a", rootCommentId: "a", createdAt: new Date("2026-01-01T00:00:00Z") }),
    ];
    const threads = groupCommentsIntoThreads(comments);
    expect(threads[0].replies.map((r) => r.id)).toEqual(["earlier", "later"]);
  });

  it("keeps separate threads independent of each other", () => {
    const comments = [
      makeComment({ id: "a" }),
      makeComment({ id: "b" }),
      makeComment({ id: "a-reply", parentCommentId: "a", rootCommentId: "a" }),
      makeComment({ id: "b-reply", parentCommentId: "b", rootCommentId: "b" }),
    ];
    const threads = groupCommentsIntoThreads(comments);
    const byId = Object.fromEntries(threads.map((t) => [t.topLevel.id, t.replies.map((r) => r.id)]));
    expect(byId["a"]).toEqual(["a-reply"]);
    expect(byId["b"]).toEqual(["b-reply"]);
  });
});
