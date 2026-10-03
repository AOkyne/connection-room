// Real SMTP mailer for experience invitations (server only).

import type { SupabaseClient } from "@supabase/supabase-js";
import { logEmailSend, sendExperienceEmail } from "@/lib/email/send";
import { renderInvitationEmail } from "./email";
import type { InvitationMailer, SendOutcome } from "./engine";
import { createUnsubscribeToken } from "./tokens";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";
}

export function invitationLinks(invitationId: string, userId: string) {
  const base = appUrl();
  const token = createUnsubscribeToken(userId);
  return {
    // Visit-logging redirect into the thread (GET never answers or changes content).
    threadUrl: `${base}/r/experience/${invitationId}`,
    preferencesUrl: `${base}/app/experience/preferences`,
    unsubscribePageUrl: `${base}/experience/unsubscribe?t=${encodeURIComponent(token)}`,
    oneClickUnsubscribeUrl: `${base}/api/experience/unsubscribe?t=${encodeURIComponent(token)}`,
  };
}

/** Stable per-invitation Message-ID: ties provider webhooks back to the ledger row. */
export function invitationMessageId(invitationId: string): string {
  const host = new URL(appUrl()).host;
  return `<experience-${invitationId}@${host}>`;
}

export class SmtpInvitationMailer implements InvitationMailer {
  constructor(private supabase: SupabaseClient) {}

  async send({ invitation, member, question }: Parameters<InvitationMailer["send"]>[0]): Promise<SendOutcome> {
    const links = invitationLinks(invitation.id, member.userId);
    const email = renderInvitationEmail({
      firstName: member.firstName,
      source: question.source,
      questionText: question.emailText || question.text,
      threadUrl: links.threadUrl,
      preferencesUrl: links.preferencesUrl,
      unsubscribeUrl: links.unsubscribePageUrl,
    });
    const result = await sendExperienceEmail({
      to: member.email!,
      subject: email.subject,
      html: email.html,
      text: email.text,
      messageId: invitationMessageId(invitation.id),
      headers: {
        "List-Unsubscribe": `<${links.oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.kind === "accepted") {
      // Email History log: subject only (fixed text) -- never the question.
      await logEmailSend(this.supabase, {
        category: "experience_invitation",
        to: member.email!,
        subject: email.subject,
        recipientUserId: member.userId,
      });
    }
    return result;
  }
}
