import { describe, it, expect } from "vitest";
import {
  buildQuestionUrl,
  renderQuestionHtml,
  renderQuestionPlainText,
  renderCombinedHtml,
  renderCombinedPlainText,
  type NewsletterQuestion,
} from "./generate";

const question: NewsletterQuestion = {
  postId: "post-123",
  spaceId: "commons",
  spaceName: "The Commons",
  questionText: "What's bringing you joy this week?",
  buttonLabel: "Join the Conversation",
};

describe("buildQuestionUrl", () => {
  it("includes source, campaign, and question params", () => {
    const url = buildQuestionUrl("post-123", "commons", "2026-08-questions", "https://community.trevorjamesla.com");
    expect(url).toContain("/app/spaces/commons/posts/post-123");
    expect(url).toContain("source=weekly_newsletter");
    expect(url).toContain("campaign=2026-08-questions");
    expect(url).toContain("question=post-123");
  });
});

describe("renderQuestionHtml", () => {
  const url = buildQuestionUrl(question.postId, question.spaceId, "2026-08-questions");

  it("escapes HTML special characters in space name, question text, and button label", () => {
    const dangerous: NewsletterQuestion = {
      ...question,
      spaceName: 'Space <script>alert("x")</script> & Co',
      questionText: "What's <b>up</b>?",
      buttonLabel: '"Click" & <go>',
    };
    const html = renderQuestionHtml(dangerous, url);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;b&gt;up&lt;/b&gt;");
    expect(html).toContain("&quot;Click&quot;");
  });

  it("has no <style> tag or external stylesheet reference, only inline styles", () => {
    const html = renderQuestionHtml(question, url);
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/<link/i);
    expect(html).toContain("style=");
  });

  it("has no <script> tag", () => {
    const html = renderQuestionHtml(question, url);
    expect(html).not.toMatch(/<script/i);
  });

  it("never suggests a response length", () => {
    const html = renderQuestionHtml(question, url);
    expect(html.toLowerCase()).not.toMatch(/sentence|paragraph|word count|character/);
  });

  it("includes a descriptive aria-label beyond the short visible button text", () => {
    const html = renderQuestionHtml(question, url);
    expect(html).toContain(`aria-label="Join the conversation about: What&#39;s bringing you joy this week? in ${question.spaceName}"`);
  });
});

describe("renderQuestionPlainText", () => {
  it("includes space name, question text, button label, and url", () => {
    const url = buildQuestionUrl(question.postId, question.spaceId, "2026-08-questions");
    const text = renderQuestionPlainText(question, url);
    expect(text).toContain(question.spaceName);
    expect(text).toContain(question.questionText);
    expect(text).toContain(question.buttonLabel);
    expect(text).toContain(url);
  });

  it("never suggests a response length", () => {
    const url = buildQuestionUrl(question.postId, question.spaceId, "2026-08-questions");
    const text = renderQuestionPlainText(question, url);
    expect(text.toLowerCase()).not.toMatch(/sentence|paragraph|word count/);
  });
});

describe("renderCombinedHtml / renderCombinedPlainText", () => {
  const q2: NewsletterQuestion = {
    postId: "post-456",
    spaceId: "start-here",
    spaceName: "Start Here",
    questionText: "Introduce yourself.",
    buttonLabel: "Answer This",
  };
  const entries = [
    { question, url: buildQuestionUrl(question.postId, question.spaceId, "camp") },
    { question: q2, url: buildQuestionUrl(q2.postId, q2.spaceId, "camp") },
  ];

  it("preserves the given order in HTML output", () => {
    const html = renderCombinedHtml(entries);
    expect(html.indexOf(question.spaceName)).toBeLessThan(html.indexOf(q2.spaceName));
  });

  it("preserves the given order in plain text output, reversed", () => {
    const reversed = [...entries].reverse();
    const html = renderCombinedHtml(reversed);
    expect(html.indexOf(q2.spaceName)).toBeLessThan(html.indexOf(question.spaceName));
  });

  it("preserves order in plain text and separates entries with a divider", () => {
    const text = renderCombinedPlainText(entries);
    expect(text.indexOf(question.spaceName)).toBeLessThan(text.indexOf(q2.spaceName));
    expect(text).toContain("---");
  });
});
