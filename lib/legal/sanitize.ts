// Allowlist HTML sanitizer for the legal pages. Drafts can be saved by an
// outside reviewer through a private link (no account), and the published
// copy is rendered on public pages, so every save is reduced to a small set
// of formatting tags with no attributes except a checked link href.
//
// Also normalizes what browsers' contenteditable produces (Safari's <div>
// paragraphs, <b>/<i>, inline styles), so versions saved from different
// browsers diff cleanly.

const ALLOWED = new Set([
  "p", "h2", "h3", "h4", "strong", "em", "u", "s", "ul", "ol", "li", "a", "br",
  "blockquote", "table", "thead", "tbody", "tr", "th", "td",
]);

const RENAME: Record<string, string> = {
  b: "strong",
  i: "em",
  strike: "s",
  del: "s",
  div: "p",
  h1: "h2",
  h5: "h4",
  h6: "h4",
};

// Dropped together with everything inside them.
const DROP_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template", "head", "title", "svg", "math", "textarea", "select",
]);

const VOID = new Set(["br"]);

export const MAX_LEGAL_HTML_LENGTH = 400_000;

const TOKEN_RE = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const HREF_RE = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;
const SAFE_HREF_RE = /^(https?:\/\/|mailto:|\/(?!\/)|#)[^\s"'<>]*$/i;

function escapeText(text: string): string {
  return text
    .replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeHref(attrs: string): string | null {
  const m = HREF_RE.exec(attrs);
  if (!m) return null;
  const href = (m[1] ?? m[2] ?? m[3] ?? "").trim().replace(/&amp;/g, "&");
  if (!SAFE_HREF_RE.test(href) || /&#|javascript:/i.test(href)) return null;
  return href.replace(/&/g, "&amp;");
}

export function sanitizeLegalHtml(input: string): string {
  const html = input.slice(0, MAX_LEGAL_HTML_LENGTH);
  const out: string[] = [];
  const stack: string[] = [];
  let dropping: string | null = null;
  let last = 0;

  for (const match of html.matchAll(TOKEN_RE)) {
    const text = html.slice(last, match.index);
    last = match.index + match[0].length;
    if (!dropping && text) out.push(escapeText(text));

    const raw = match[1];
    if (!raw) continue; // comment
    const isClose = match[0].startsWith("</");
    const lower = raw.toLowerCase();

    if (dropping) {
      if (isClose && lower === dropping) dropping = null;
      continue;
    }
    if (DROP_CONTENT.has(lower)) {
      if (!isClose && !match[0].endsWith("/>")) dropping = lower;
      continue;
    }

    const tag = RENAME[lower] || lower;
    if (!ALLOWED.has(tag)) continue; // span, font, etc.: keep the text, drop the tag

    if (VOID.has(tag)) {
      if (!isClose) out.push(`<${tag}>`);
      continue;
    }

    if (isClose) {
      const at = stack.lastIndexOf(tag);
      if (at === -1) continue;
      while (stack.length > at) out.push(`</${stack.pop()}>`);
      continue;
    }

    if (tag === "a") {
      const href = safeHref(match[2] || "");
      out.push(href ? `<a href="${href}" rel="noopener noreferrer">` : "<a>");
    } else {
      out.push(`<${tag}>`);
    }
    stack.push(tag);
  }

  if (!dropping) out.push(escapeText(html.slice(last)));
  while (stack.length) out.push(`</${stack.pop()}>`);

  return out
    .join("")
    // A link with no safe href is just text.
    .replace(/<a>([\s\S]*?)<\/a>/g, "$1")
    .trim();
}
