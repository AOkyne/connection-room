import { describe, it, expect } from "vitest";
import { renderPollHtml, pollVotePlaceholder } from "./generate";

describe("pollVotePlaceholder", () => {
  it("builds a POLL_VOTE: marker carrying the option id", () => {
    expect(pollVotePlaceholder("option-123")).toBe("POLL_VOTE:option-123");
  });
});

describe("renderPollHtml", () => {
  const options = [
    { id: "opt-1", label: "Yes" },
    { id: "opt-2", label: "No" },
  ];

  it("includes the question text and one link per option", () => {
    const html = renderPollHtml("Are you coming?", options);
    expect(html).toContain("Are you coming?");
    expect(html).toContain('href="POLL_VOTE:opt-1"');
    expect(html).toContain('href="POLL_VOTE:opt-2"');
    expect(html).toContain(">Yes<");
    expect(html).toContain(">No<");
  });

  it("escapes HTML special characters in the question and option labels", () => {
    const html = renderPollHtml('Question <script>alert("x")</script> & more', [
      { id: "opt-1", label: '"Click" & <go>' },
    ]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).not.toContain('"Click" & <go>');
  });

  it("adds a choose-all-that-apply hint only for multiple-choice polls", () => {
    expect(renderPollHtml("Q?", options)).not.toContain("Choose all that apply");
    expect(renderPollHtml("Q?", options, { allowMultiple: true })).toContain("Choose all that apply");
  });

  it("has no <style> tag or script -- inline styles only, safe to paste into an email client", () => {
    const html = renderPollHtml("Q?", options);
    expect(html).not.toContain("<style");
    expect(html).not.toContain("<script");
  });
});
