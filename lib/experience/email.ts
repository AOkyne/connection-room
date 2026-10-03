// The "Your Experience Wanted" invitation email. Pure (no I/O) so its
// escaping and copy are unit-tested.
//
// - The subject and preview text are fixed and never contain question
//   text (questions can be sensitive).
// - All member/editorial text is HTML-escaped.
// - Replies belong in the app: the copy says so, because the provider has
//   no inbound handling here (Reply-To still reaches Trevor's inbox and is
//   never published).

import type { QuestionSource } from "./types";

export const INVITATION_SUBJECT = "Your experience is welcome in The Connection Room";
const PREVIEW_TEXT = "A question from the community, if you'd like to share.";

export const SOURCE_INTRO: Record<QuestionSource, string> = {
  seed: "Here's a community question you might relate to:",
  member: "A member has invited others to share their experience:",
};

export interface InvitationEmailInput {
  firstName: string | null;
  source: QuestionSource;
  /** The text approved for email (questions.email_text), never the in-app context. */
  questionText: string;
  threadUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greetingName(firstName: string | null): string {
  const name = (firstName || "").trim();
  // Only a plain first name; anything odd falls back to "there".
  return name && name.length <= 40 && !/[<>@]/.test(name) ? name : "there";
}

export function renderInvitationEmail(input: InvitationEmailInput): RenderedEmail {
  const name = greetingName(input.firstName);
  const intro = SOURCE_INTRO[input.source];
  const question = input.questionText.trim();

  const text = [
    `Hi ${name},`,
    "",
    intro,
    "",
    `“${question}”`,
    "",
    "If something comes to mind, we'd welcome your experience. You don't need a perfect answer, and you're welcome to read what others have shared.",
    "",
    `Read & respond in The Connection Room: ${input.threadUrl}`,
    "",
    "Please add your response in the app so other members can join the conversation. Replies to this email won't appear there.",
    "",
    "Warmly,",
    "The Connection Room",
    "",
    `Manage question invitations: ${input.preferencesUrl}`,
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  const p = (content: string, style = "") =>
    `<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1a0f0a;${style}">${content}</p>`;

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#F7F1E3;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(PREVIEW_TEXT)}</div>
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
              <td style="padding:24px 32px 8px;font-family:Arial,sans-serif;">
                ${p(`Hi ${escapeHtml(name)},`)}
                ${p(escapeHtml(intro))}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="padding:18px 20px;background-color:#f3ede5;border-radius:10px;font-family:Georgia,serif;font-size:18px;line-height:1.5;color:#1a0f0a;">
                      &ldquo;${escapeHtml(question)}&rdquo;
                    </td>
                  </tr>
                </table>
                ${p("If something comes to mind, we&#39;d welcome your experience. You don&#39;t need a perfect answer, and you&#39;re welcome to read what others have shared.")}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(input.threadUrl)}" style="display:inline-block;background-color:#B8892F;color:#FFFDF8;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;font-size:15px;">Read &amp; respond in The Connection Room</a>
                    </td>
                  </tr>
                </table>
                ${p("Please add your response in the app so other members can join the conversation. Replies to this email won&#39;t appear there.", "font-size:14px;color:#6b6460;")}
                ${p("Warmly,<br />The Connection Room")}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px;font-family:Arial,sans-serif;font-size:12px;color:#a0704a;text-align:center;">
                <a href="${escapeHtml(input.preferencesUrl)}" style="color:#a0704a;">Manage question invitations</a>
                &nbsp;&middot;&nbsp;
                <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#a0704a;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: INVITATION_SUBJECT, html, text };
}
