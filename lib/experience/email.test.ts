import { describe, it, expect } from "vitest";
import { INVITATION_SUBJECT, renderInvitationEmail } from "./email";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "./tokens";

const base = {
  firstName: "Marcus",
  source: "seed" as const,
  questionText: "How do you let someone know you would appreciate a hug?",
  threadUrl: "https://community.example/r/experience/abc",
  preferencesUrl: "https://community.example/app/experience/preferences",
  unsubscribeUrl: "https://community.example/experience/unsubscribe?t=tok",
};

describe("invitation email", () => {
  it("uses the fixed subject -- never the question text", () => {
    const email = renderInvitationEmail(base);
    expect(email.subject).toBe(INVITATION_SUBJECT);
    expect(email.subject).not.toContain("hug");
    // Preview text (first visible text in the HTML) doesn't carry the question either.
    const preview = email.html.match(/display:none[^>]*>([^<]*)</)![1];
    expect(preview).not.toContain("hug");
  });

  it("labels seeds as community questions and member questions as from a member", () => {
    expect(renderInvitationEmail(base).text).toContain("Here's a community question you might relate to:");
    const member = renderInvitationEmail({ ...base, source: "member" });
    expect(member.text).toContain("A member has invited others to share their experience:");
    expect(member.text).not.toContain("community question");
  });

  it("HTML-escapes question text and names", () => {
    const email = renderInvitationEmail({
      ...base,
      firstName: '<img src=x onerror="alert(1)">',
      questionText: 'What helps? <script>alert("x")</script> & "quotes"',
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("onerror=");
    expect(email.text).toContain("Hi there,");
  });

  it("has a plain-text version with the app link, in-app reply note, preferences and unsubscribe", () => {
    const { text } = renderInvitationEmail(base);
    expect(text).toContain(base.threadUrl);
    expect(text).toContain("Replies to this email won't appear there.");
    expect(text).toContain(base.preferencesUrl);
    expect(text).toContain(base.unsubscribeUrl);
    expect(text).toContain("Warmly,\nThe Connection Room");
  });
});

describe("unsubscribe tokens", () => {
  const key = "test-secret";
  const userId = "11111111-2222-4333-8444-555555555555";

  it("round-trips a user id", () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken(userId, key), key)).toBe(userId);
  });

  it("rejects forged or tampered tokens", () => {
    const token = createUnsubscribeToken(userId, key);
    const other = Buffer.from("99999999-2222-4333-8444-555555555555").toString("base64url");
    expect(verifyUnsubscribeToken(`${other}.${token.split(".")[1]}`, key)).toBeNull();
    expect(verifyUnsubscribeToken(token, "different-secret")).toBeNull();
    expect(verifyUnsubscribeToken("garbage", key)).toBeNull();
    expect(verifyUnsubscribeToken(null, key)).toBeNull();
  });
});
