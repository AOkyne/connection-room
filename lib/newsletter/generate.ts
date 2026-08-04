// Pure, framework/Supabase-free generation logic for the admin newsletter
// segment generator -- deliberately a copy-paste generator, not a sender
// (see app/app/admin/newsletter/page.tsx and its API route for the admin
// UI/data side). Every function here is unit-tested directly.

export interface NewsletterQuestion {
  postId: string;
  spaceId: string;
  spaceName: string;
  questionText: string;
  buttonLabel: string;
}

// Mirrors lib/email/template.ts's escapeHtml -- kept local rather than
// importing that (unexported) helper, since this module has no other
// dependency on the branded-email template file and shouldn't need one
// just to escape a string.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildQuestionUrl(
  postId: string,
  spaceId: string,
  campaign: string,
  appUrl: string = "https://community.trevorjamesla.com"
): string {
  const params = new URLSearchParams({
    source: "weekly_newsletter",
    campaign,
    question: postId,
  });
  return `${appUrl}/app/spaces/${spaceId}/posts/${postId}?${params.toString()}`;
}

// Table-based single-button block: no <style> tag, no JS, only inline
// style= attributes, so it survives being pasted directly into an email
// client's HTML/source view. aria-label always carries the full
// space+question context even though the visible button text is
// whatever short label the admin chose (default "Join the Conversation"),
// satisfying "descriptive link text" without forcing a long visible
// button.
export function renderQuestionHtml(question: NewsletterQuestion, url: string): string {
  const spaceName = escapeHtml(question.spaceName);
  const questionText = escapeHtml(question.questionText);
  const buttonLabel = escapeHtml(question.buttonLabel);
  const safeUrl = escapeHtml(url);
  const ariaLabel = escapeHtml(`Join the conversation about: ${question.questionText} in ${question.spaceName}`);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="padding:20px;background-color:#f3ede5;border-radius:12px;">
      <p style="margin:0 0 8px 0;font-family:Georgia,serif;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#8b6f47;">${spaceName}</p>
      <p style="margin:0 0 20px 0;font-family:Georgia,serif;font-size:18px;line-height:1.5;color:#1a0f0a;">${questionText}</p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius:8px;background-color:#d4a348;">
            <a href="${safeUrl}" aria-label="${ariaLabel}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#1a0f0a;text-decoration:none;min-height:44px;line-height:16px;">${buttonLabel}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function renderQuestionPlainText(question: NewsletterQuestion, url: string): string {
  return `${question.spaceName}\n\n${question.questionText}\n\n${question.buttonLabel}: ${url}`;
}

export function renderCombinedHtml(questions: Array<{ question: NewsletterQuestion; url: string }>): string {
  return questions
    .map(({ question, url }) => renderQuestionHtml(question, url))
    .join('\n<table role="presentation" width="100%"><tr><td style="height:8px;"></td></tr></table>\n');
}

export function renderCombinedPlainText(questions: Array<{ question: NewsletterQuestion; url: string }>): string {
  return questions.map(({ question, url }) => renderQuestionPlainText(question, url)).join("\n\n---\n\n");
}
