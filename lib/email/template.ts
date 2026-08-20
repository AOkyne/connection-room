// Shared branded email wrapper: logo at top, a "visit the community" link,
// and Trevor's photo next to the sign-off. Every automated email (welcome,
// drip sequence) supplies its own body paragraphs, sign-off line, and the
// app URL, and renders through these two functions so a single style
// change applies everywhere at once.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Turns "text (url)" into a clickable link and preserves line breaks
// (used for bullet lists within a single paragraph), escaping everything else.
function renderParagraphHtml(paragraph: string): string {
  const linked = escapeHtml(paragraph).replace(
    /(https?:\/\/[^\s)]+)/g,
    (url) => `<a href="${url}" style="color:#B8892F;">${url}</a>`
  );
  return linked.replace(/\n/g, "<br>");
}

export function buildBrandedEmailText(
  paragraphs: string[],
  appUrl: string,
  signOff: string = "Warm hugs,"
): string {
  return `${paragraphs.join("\n\n")}

Visit The Connection Room: ${appUrl}

${signOff}

Trevor James
Founder, The Connection Room`;
}

// The broadcast composer's contentEditable editor produces plain,
// class-less tags (document.execCommand("formatBlock") etc. don't attach
// styles), but email clients largely ignore <style> blocks and strip
// external stylesheets -- every element needs its own inline style to
// render consistently. This patches the handful of block-level tags the
// composer's toolbar can produce; inline tags (b/i/a) already come out
// looking fine with default styles, and <a> from createLink additionally
// gets the brand accent color.
export function styleBroadcastBodyHtml(html: string): string {
  return html
    // The editor's own typed paragraphs (from Enter -> insertParagraph)
    // come out as plain, unstyled <div>/<p> tags -- previously left
    // completely unstyled here, so they rendered with NO vertical gap
    // between them in the preview/sent email even though they looked
    // like separate paragraphs while typing (contentEditable's own
    // rendering isn't representative of how bare divs/paragraphs render
    // once actually placed in the page). This is very likely the main
    // cause of "formatting looks nothing like what I set": text that
    // looked like distinct paragraphs while editing collapses together.
    .replace(/<div(?![^>]*style=)/gi, '<div style="margin:0 0 12px 0;"')
    .replace(/<p(?![^>]*style=)/gi, '<p style="margin:0 0 12px 0;"')
    .replace(/<h2(?![^>]*style=)/gi, '<h2 style="font-size:22px;font-weight:700;color:#1a0f0a;margin:24px 0 12px;"')
    .replace(/<h3(?![^>]*style=)/gi, '<h3 style="font-size:18px;font-weight:700;color:#1a0f0a;margin:20px 0 10px;"')
    .replace(
      /<blockquote(?![^>]*style=)/gi,
      '<blockquote style="border-left:3px solid #d4a348;padding-left:16px;margin:16px 0;color:#a0704a;font-style:italic;"'
    )
    .replace(/<hr\s*\/?>/gi, '<hr style="border:none;border-top:1px solid #e8ddd2;margin:24px 0;" />')
    .replace(/<img(?![^>]*style=)/gi, '<img style="max-width:100%;height:auto;border-radius:8px;"')
    .replace(/<a(?![^>]*style=)(?=[^>]*href)/gi, '<a style="color:#B8892F;"')
    // Outlook desktop (Word's rendering engine) is notorious for dropping
    // list-style/indentation on unstyled ul/ol/li -- same reasoning as
    // img/hr above, inline it explicitly rather than trusting any email
    // client's default.
    .replace(/<ul(?![^>]*style=)/gi, '<ul style="list-style:disc;padding-left:24px;margin:12px 0;"')
    .replace(/<ol(?![^>]*style=)/gi, '<ol style="list-style:decimal;padding-left:24px;margin:12px 0;"')
    .replace(/<li(?![^>]*style=)/gi, '<li style="display:list-item;margin:4px 0;"');
}

const TRACKING_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

// Broadcast emails only ever link back into this app in practice -- links
// are only rewritten through the click-tracking redirect when their host
// matches this allowlist. Anything else (an external site pasted into the
// broadcast composer) is left completely untouched: no click data for it,
// but also no way for /api/email/click to become a general-purpose open
// redirect for a domain we don't control. The click route re-validates
// this same allowlist independently before ever redirecting anywhere, so
// this rewriting step isn't itself the security boundary -- just what
// decides which links are worth tracking at all.
const TRACKABLE_LINK_HOSTS = new Set([
  new URL(TRACKING_APP_URL).host,
  "trevorjamesla.com",
  "www.trevorjamesla.com",
]);

export function isTrackableClickTarget(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && TRACKABLE_LINK_HOSTS.has(parsed.host);
  } catch {
    return false;
  }
}

// Rewrites every href="..." pointing at an allowlisted host to route
// through /api/email/click/{trackingId}?url=..., which logs the click
// then redirects to the real destination. Links to other hosts (or
// malformed/non-http hrefs) are left exactly as they were.
function wrapTrackedLinks(html: string, trackingId: string): string {
  return html.replace(/href="([^"]*)"/gi, (match, rawUrl) => {
    const decoded = rawUrl.replace(/&amp;/g, "&");
    if (!isTrackableClickTarget(decoded)) return match;
    const clickUrl = `${TRACKING_APP_URL}/api/email/click/${trackingId}?url=${encodeURIComponent(decoded)}`;
    return `href="${clickUrl}"`;
  });
}

// A single transparent pixel, invisible in every real email client --
// its only purpose is that requesting it tells /api/email/open/{id} the
// email was opened. Apple Mail Privacy Protection auto-loads this (and
// every image) for a large share of recipients regardless of whether a
// human actually opened the email, which inflates open counts -- a real,
// documented limitation of pixel-based open tracking generally, not
// something specific to this implementation. Click data is the more
// trustworthy signal for the same reason.
function buildOpenTrackingPixel(trackingId: string): string {
  return `<img src="${TRACKING_APP_URL}/api/email/open/${trackingId}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;
}

// Wraps an admin-authored rich-text body (raw HTML from the broadcast
// composer's contentEditable editor) in the same branded shell as the
// automated emails, but with a fixed, fuller signature instead of the
// automated emails' short "Founder, The Connection Room" line.
//
// trackingId (migration 095): when provided, this specific recipient's
// copy gets an open-tracking pixel and click-tracked links. Omitted
// entirely for previews/tests or if logging the send failed -- tracking
// is additive and must never be a reason a broadcast fails to send.
export function buildBroadcastEmailHtml(bodyHtml: string, trackingId?: string | null): string {
  const styledBody = styleBroadcastBodyHtml(bodyHtml);
  const trackedBody = trackingId ? wrapTrackedLinks(styledBody, trackingId) : styledBody;
  const pixel = trackingId ? buildOpenTrackingPixel(trackingId) : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#F7F1E3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F1E3;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#FFFDF8;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 8px;">
                <img src="cid:welcome-logo" alt="The Connection Room" width="240" style="display:block;max-width:240px;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;">
                <div style="font-size:16px;line-height:1.6;color:#1a0f0a;">${trackedBody}</div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="padding-right:16px;vertical-align:middle;">
                      <img src="cid:trevor-photo" alt="Trevor James" width="64" height="64" style="display:block;border-radius:50%;object-fit:cover;" />
                    </td>
                    <td style="vertical-align:middle;font-size:15px;line-height:1.4;color:#1a0f0a;">
                      <div style="font-weight:600;">Trevor James</div>
                      <div style="color:#a0704a;">Founder, The Connection Room</div>
                      <div style="color:#a0704a;">Touch Therapist and Intimacy Coach</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${pixel}
  </body>
</html>`;
}

// Plain-text fallback: strip tags and collapse whitespace, then append the
// same fixed signature.
export function buildBroadcastEmailText(bodyHtml: string): string {
  const plain = bodyHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `${plain}

Trevor James
Founder, The Connection Room
Touch Therapist and Intimacy Coach`;
}

export function buildBrandedEmailHtml(
  paragraphs: string[],
  appUrl: string,
  signOff: string = "Warm hugs,"
): string {
  const bodyParagraphs = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#1a0f0a;">${renderParagraphHtml(p)}</p>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#F7F1E3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F1E3;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#FFFDF8;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 8px;">
                <img src="cid:welcome-logo" alt="The Connection Room" width="240" style="display:block;max-width:240px;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;">
                ${bodyParagraphs}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
                  <tr>
                    <td align="center">
                      <a href="${appUrl}" style="display:inline-block;background-color:#B8892F;color:#FFFDF8;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;font-size:15px;">Visit The Connection Room</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  <tr>
                    <td style="padding-right:16px;vertical-align:middle;">
                      <img src="cid:trevor-photo" alt="Trevor James" width="64" height="64" style="display:block;border-radius:50%;object-fit:cover;" />
                    </td>
                    <td style="vertical-align:middle;font-size:15px;line-height:1.4;color:#1a0f0a;">
                      <div>${escapeHtml(signOff)}</div>
                      <div style="font-weight:600;margin-top:4px;">Trevor James</div>
                      <div style="color:#a0704a;">Founder, The Connection Room</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
