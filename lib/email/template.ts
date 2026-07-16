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

// Wraps an admin-authored rich-text body (raw HTML from the broadcast
// composer's contentEditable editor) in the same branded shell as the
// automated emails, but with a fixed, fuller signature instead of the
// automated emails' short "Founder, The Connection Room" line.
export function buildBroadcastEmailHtml(bodyHtml: string): string {
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
                <div style="font-size:16px;line-height:1.6;color:#1a0f0a;">${bodyHtml}</div>
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
