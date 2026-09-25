// Pure, framework/Supabase-free generation logic for a poll's email HTML
// block -- mirrors lib/newsletter/generate.ts's shape (same reasoning: no
// dependency on this app's Supabase client just to build a string).
// Every function here is unit-tested directly.
//
// Each option's href is a PLACEHOLDER marker, not a real URL -- an email
// poll link needs a per-recipient tracking id (sent_emails.id) that only
// exists once at actual send time, not at compose time when this HTML is
// first generated. lib/email/template.ts's buildBroadcastEmailHtml()
// rewrites `POLL_VOTE:{optionId}` markers into real
// /api/email/poll-vote/{trackingId}?option={optionId} links per
// recipient, the same reason wrapTrackedLinks() exists for ordinary links.

export interface PollEmailOption {
  id: string;
  label: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pollVotePlaceholder(optionId: string): string {
  return `POLL_VOTE:${optionId}`;
}

// Table-based, inline-style-only block -- no <style> tag, no JS, safe to
// paste into an email client's HTML view, same constraints as
// renderQuestionHtml() in lib/newsletter/generate.ts.
//
// A multiple-choice poll (migration 101) can't use checkboxes in email, so
// each link stays a single tap and every tap ADDS that answer
// (submit_poll_vote_as) -- the hint line tells recipients to tap each one.
export function renderPollHtml(
  question: string,
  options: PollEmailOption[],
  { allowMultiple = false }: { allowMultiple?: boolean } = {}
): string {
  const questionText = escapeHtml(question);
  const hint = allowMultiple
    ? `\n      <p style="margin:-8px 0 12px 0;font-family:Arial,sans-serif;font-size:13px;color:#a0704a;">Choose all that apply &mdash; tap each one.</p>`
    : "";

  const optionRows = options
    .map(
      (option) => `
        <tr>
          <td style="padding:4px 0;">
            <a href="${escapeHtml(pollVotePlaceholder(option.id))}" style="display:block;padding:12px 16px;background-color:#fffbf7;border:1px solid #e8ddd2;border-radius:8px;font-family:Arial,sans-serif;font-size:15px;color:#1a0f0a;text-decoration:none;">${escapeHtml(option.label)}</a>
          </td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="padding:20px;background-color:#f3ede5;border-radius:12px;">
      <p style="margin:0 0 14px 0;font-family:Georgia,serif;font-size:18px;line-height:1.5;color:#1a0f0a;">${questionText}</p>${hint}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${optionRows}
      </table>
    </td>
  </tr>
</table>`;
}
