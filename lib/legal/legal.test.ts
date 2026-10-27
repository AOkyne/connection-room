import { describe, expect, it } from "vitest";
import { sanitizeLegalHtml } from "./sanitize";
import { diffTokens, tokenize, trackChanges } from "./diff";
import { markdownToHtml } from "./markdown";
import { LEGAL_PAGES, seedHtml } from "./seed";

describe("sanitizeLegalHtml", () => {
  it("keeps formatting and drops everything else", () => {
    expect(
      sanitizeLegalHtml('<p style="color:red">Hi <b>there</b> <span class="x">you</span><script>alert(1)</script></p>')
    ).toBe("<p>Hi <strong>there</strong> you</p>");
  });

  it("turns Safari's div paragraphs into p", () => {
    expect(sanitizeLegalHtml("<div>One</div><div>Two<br></div>")).toBe("<p>One</p><p>Two<br></p>");
  });

  it("keeps safe links and strips unsafe ones", () => {
    expect(sanitizeLegalHtml('<a href="https://x.com/a?b=1&c=2" onclick="x()">ok</a>')).toBe(
      '<a href="https://x.com/a?b=1&amp;c=2" rel="noopener noreferrer">ok</a>'
    );
    expect(sanitizeLegalHtml('<a href="javascript:alert(1)">bad</a>')).toBe("bad");
    expect(sanitizeLegalHtml('<a href="/house-rules">rules</a>')).toContain('href="/house-rules"');
  });

  it("escapes stray brackets and closes unclosed tags", () => {
    expect(sanitizeLegalHtml("<p>a < b & c")).toBe("<p>a &lt; b &amp; c</p>");
    expect(sanitizeLegalHtml("<ul><li>x</ul>")).toBe("<ul><li>x</li></ul>");
  });

  it("drops event handler attributes on img-like tags entirely", () => {
    expect(sanitizeLegalHtml('<img src=x onerror="alert(1)"><p>t</p>')).toBe("<p>t</p>");
  });
});

describe("diffTokens", () => {
  it("finds a single replaced word", () => {
    const ops = diffTokens(tokenize("<p>the quick fox</p>"), tokenize("<p>the slow fox</p>"));
    expect(ops.filter((o) => o !== "equal")).toEqual(["delete", "insert"]);
  });

  it("handles many scattered edits", () => {
    const a = Array.from({ length: 400 }, (_, i) => `w${i}`);
    const b = a.map((w, i) => (i % 37 === 0 ? `${w}x` : w));
    const ops = diffTokens(a, b);
    expect(ops.filter((o) => o === "delete")).toHaveLength(11);
    expect(ops.filter((o) => o === "insert")).toHaveLength(11);
    expect(ops.filter((o) => o !== "insert")).toHaveLength(a.length);
  });
});

describe("trackChanges", () => {
  const base = { html: "<p>You must be 18 to join.</p>", author: "First draft", at: "2026-10-26T10:00:00Z" };

  it("shows no changes for a single version", () => {
    const t = trackChanges([base]);
    expect(t.changeCount).toBe(0);
    expect(t.html).toBe(base.html);
  });

  it("attributes additions and removals to their authors", () => {
    const t = trackChanges([
      base,
      { html: "<p>You must be 21 to join.</p>", author: "Jane Lawyer", at: "2026-10-27T10:00:00Z" },
      { html: "<p>You must be 21 to join the Room.</p>", author: "Trevor", at: "2026-10-28T10:00:00Z" },
    ]);
    expect(t.html).toContain('<del class="lc-del lc-author-0" title="Removed by Jane Lawyer');
    expect(t.html).toContain(">18</del>");
    expect(t.html).toContain(">21</ins>");
    expect(t.html).toContain('title="Added by Trevor');
    expect(t.authors.map((a) => a.name)).toEqual(["Trevor", "Jane Lawyer"]);
    expect(t.authors.find((a) => a.name === "Jane Lawyer")).toMatchObject({ additions: 1, removals: 1 });
  });

  it("drops words that were added and removed again", () => {
    const t = trackChanges([
      base,
      { html: "<p>You must be 18 or older to join.</p>", author: "A", at: "2026-10-27T00:00:00Z" },
      { html: "<p>You must be 18 to join.</p>", author: "B", at: "2026-10-28T00:00:00Z" },
    ]);
    expect(t.changeCount).toBe(0);
    expect(t.html).toBe(base.html);
  });

  it("keeps a removed paragraph's words, struck through, without its tags", () => {
    const t = trackChanges([
      { html: "<p>Keep.</p><p>Gone.</p>", author: "First draft", at: "2026-10-26T00:00:00Z" },
      { html: "<p>Keep.</p>", author: "A", at: "2026-10-27T00:00:00Z" },
    ]);
    expect(t.html).toContain("<p>Keep.</p>");
    expect(t.html).toContain(">Gone.</del>");
    expect(t.html.match(/<p>/g)).toHaveLength(1);
  });
});

describe("markdownToHtml and seeds", () => {
  it("renders lists, tables and inline formatting", () => {
    expect(markdownToHtml("## Head\n\n- **a** [x](/y)\n- b\n\n| A | B |\n| --- | --- |\n| 1 | 2 |")).toBe(
      '<h2>Head</h2><ul><li><strong>a</strong> <a href="/y">x</a></li><li>b</li></ul><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
    );
  });

  it("every seed survives sanitizing unchanged in structure", () => {
    for (const page of LEGAL_PAGES) {
      const html = seedHtml(page.slug);
      expect(html.length).toBeGreaterThan(500);
      expect(sanitizeLegalHtml(html).replace(/ rel="noopener noreferrer"/g, "")).toBe(html);
    }
  });
});
