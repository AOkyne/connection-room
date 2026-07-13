// Shared branded email wrapper: logo at top, Trevor's photo next to a
// fixed sign-off. Every automated email (welcome, drip sequence) supplies
// only its own body paragraphs and renders through these two functions so
// a single style/copy change applies everywhere at once.

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

export function buildBrandedEmailText(paragraphs: string[]): string {
  return `${paragraphs.join("\n\n")}

Warm hugs,

Trevor James
Founder, The Connection Room`;
}

export function buildBrandedEmailHtml(paragraphs: string[]): string {
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
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  <tr>
                    <td style="padding-right:16px;vertical-align:middle;">
                      <img src="cid:trevor-photo" alt="Trevor James" width="64" height="64" style="display:block;border-radius:50%;object-fit:cover;" />
                    </td>
                    <td style="vertical-align:middle;font-size:15px;line-height:1.4;color:#1a0f0a;">
                      <div>Warm hugs,</div>
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
