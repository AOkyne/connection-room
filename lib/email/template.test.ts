import { describe, it, expect } from "vitest";
import { styleBroadcastBodyHtml } from "./template";

describe("styleBroadcastBodyHtml", () => {
  it("adds spacing to unstyled <div> paragraphs from the editor's Enter/insertParagraph output", () => {
    const html = "<div>First line</div><div>Second line</div>";
    const styled = styleBroadcastBodyHtml(html);
    expect(styled).toContain('<div style="margin:0 0 12px 0;">First line</div>');
    expect(styled).toContain('<div style="margin:0 0 12px 0;">Second line</div>');
  });

  it("adds spacing to unstyled <p> paragraphs", () => {
    const html = "<p>Hello</p>";
    expect(styleBroadcastBodyHtml(html)).toBe('<p style="margin:0 0 12px 0;">Hello</p>');
  });

  it("does not double-style a div/p that already has an inline style (e.g. from justifyCenter)", () => {
    const html = '<div style="text-align:center;">Centered</div>';
    expect(styleBroadcastBodyHtml(html)).toBe('<div style="text-align:center;">Centered</div>');
  });

  it("still styles headings, blockquotes, lists, images, and links as before", () => {
    const html = "<h2>Title</h2><blockquote>Quote</blockquote><ul><li>Item</li></ul><img src=\"x.jpg\"><a href=\"https://x.com\">link</a>";
    const styled = styleBroadcastBodyHtml(html);
    expect(styled).toContain("<h2 style=");
    expect(styled).toContain("<blockquote style=");
    expect(styled).toContain("<ul style=");
    expect(styled).toContain("<li style=");
    expect(styled).toContain('<img style="max-width:100%;height:auto;border-radius:8px;" src="x.jpg">');
    expect(styled).toContain('<a style="color:#B8892F;" href="https://x.com">link</a>');
  });

  it("leaves an already-styled newsletter-generator table block untouched", () => {
    const html = '<table role="presentation" style="margin:0;"><tr><td style="padding:20px;">Question</td></tr></table>';
    expect(styleBroadcastBodyHtml(html)).toBe(html);
  });
});
