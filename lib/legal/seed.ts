// The legal pages and their first drafts (written 2026-10-26, not yet
// reviewed by counsel). A page's row is created from this text the first
// time the legal workspace loads; after that the database is the source of
// truth and this file is never read again for that page.

import { markdownToHtml } from "./markdown";

export type LegalSlug = "terms" | "privacy" | "notes";

export interface LegalPageMeta {
  slug: LegalSlug;
  title: string;
  /** Public URL once published; null = working notes, never published. */
  path: string | null;
}

export const LEGAL_PAGES: LegalPageMeta[] = [
  { slug: "terms", title: "Terms of Service", path: "/terms" },
  { slug: "privacy", title: "Privacy Policy", path: "/privacy" },
  { slug: "notes", title: "Notes for counsel", path: null },
];

export const SEED_AUTHOR = "First draft";

export function isLegalSlug(value: unknown): value is LegalSlug {
  return value === "terms" || value === "privacy" || value === "notes";
}

const TERMS_MD = `
Effective date: [date of publication]

These Terms of Service ("Terms") are an agreement between you and Trevor James LLC ("we", "us"), a California limited liability company. They govern your use of The Connection Room website and app at community.trevorjamesla.com, our emails, and any events we host (together, the "Service"). By creating an account or using the Service, you agree to these Terms, our [House Rules](/house-rules) and our [Privacy Policy](/privacy). If you do not agree, do not use the Service.

## 1. What The Connection Room is

The Connection Room is a private community for gay, bisexual and curious men to practice honest conversation, reflection and connection. It is not a dating service, a hookup service, or a substitute for therapy, medical care, legal advice or crisis support. Participation does not create a therapist–client or any other professional relationship with us or with any member.

## 2. Who can join

You may use the Service only if:

- you are at least 18 years old (or the age of majority where you live, if higher);
- you can form a binding contract;
- you have not previously been removed from the Service, unless we have agreed in writing to let you return; and
- your use does not break any law that applies to you.

We may review applications and decline or end membership at our discretion, including to protect the safety or character of the community.

## 3. Your account

- **Accurate information.** Give us true information when you sign up and keep it current. One account per person; do not impersonate anyone.
- **Verification.** We may require you to confirm your email address or complete onboarding before using parts of the Service.
- **Security.** Keep your sign-in details private. You are responsible for activity under your account. Tell us promptly at support@trevorjamesla.com if you think your account has been misused.
- **Profile settings.** You control what your profile shows other members, within the options the Service offers. Some fields (such as location, orientation and relationship status) are visible to members by default and can be hidden in your settings.
- **Deactivation and deletion.** You may deactivate or delete your account at any time from your profile settings or by emailing us. Section 11 explains what happens to your content.

## 4. Community standards

The House Rules are part of these Terms. In addition, you agree not to:

- harass, threaten, stalk, bully or discriminate against anyone;
- share another member's posts, photos, identity, membership, sexuality, health, location or other personal details outside the Service without their explicit permission ("outing" or "doxxing");
- screenshot, record, scrape or copy other members' content for use outside the Service;
- send unsolicited sexual messages or images, or post pornographic content;
- post or request any sexual content involving anyone under 18 — we will report it to the authorities;
- solicit business, clients, money or sex, or promote outside services without our permission;
- create accounts to evade a block, suspension or removal;
- upload malware, probe or disrupt the Service, or access it with bots or automated tools; or
- use the Service for anything unlawful.

## 5. Your content

"Your content" means anything you post or submit: profile details and photos, posts, comments, reflections, questions, poll answers and messages.

- **You own it.** You keep ownership of your content.
- **License to us.** You give us a non-exclusive, worldwide, royalty-free license to host, store, display, reproduce and adapt your content as needed to run, improve and promote the Service to members. We will not use your content, name or photo in public marketing outside the Service without your separate permission.
- **Inside the community.** Content you share in Spaces and other shared areas is visible to other signed-in members. Content can be seen, remembered or misused by other people despite our rules, so share thoughtfully.
- **Your responsibility.** You confirm you have the right to post your content, and that it does not infringe anyone else's rights or break these Terms.
- **Feedback.** If you send us ideas or suggestions, we may use them without obligation to you.

## 6. Anonymous posting

Some features, such as member questions in "Been There", let you post without your name. When you do, other members see "A member" and your follow-up replies in that thread show as "Question author". We design the Service to keep the link between you and that content private from other members. However:

- our moderators and administrators can see who wrote anonymous content, and may use that to enforce these Terms or respond to legal requests;
- what you write may still identify you to people who know you; and
- anonymity does not excuse breaking these Terms or the House Rules.

## 7. Private messages and Connections

Connections lets members who both opt in exchange private messages. Messages are private between participants, but they are not end-to-end encrypted. We do not routinely read them. We may review messages when a member reports them, when needed to investigate a safety concern or Terms violation, or when required by law.

## 8. Moderation and reporting

We may, at our discretion and without obligation to monitor, remove or edit content, restrict features, warn, suspend or remove members, as described in the House Rules. Serious violations may lead to immediate removal without notice. You can report content or members in the app or at support@trevorjamesla.com, and you may ask us to review a decision about your account. We are not responsible for members' conduct, on or off the Service.

## 9. Emails from us

By joining, you agree we may email you about your account, activity that involves you (such as replies and connection messages), and community updates, newsletters and invitations to share your experience. You can turn off non-essential emails in your notification settings or with the unsubscribe link in any such email. We will still send emails needed to run your account, such as sign-in links and important changes to these Terms.

## 10. Events and in-person activities

We may host workshops, retreats and gatherings, some involving touch, embodiment or partner exercises. Participation is voluntary, and the House Rules on consent apply. You take part at your own risk and are responsible for your own health, safety and boundaries. Some events may require you to sign a separate waiver or agreement, which will apply alongside these Terms. [Counsel: confirm whether a standalone event release is needed.]

## 11. Ending your membership

- **You** may stop using the Service and delete your account at any time.
- **We** may suspend or end your access at any time, with or without notice, if we believe you have broken these Terms or the House Rules, created risk for other members or us, or if we stop offering the Service.
- **After deletion,** we delete or de-identify your account and profile as described in the Privacy Policy. Posts and comments you made in shared areas may remain visible without your name, so that conversations other members took part in stay readable. [Counsel: confirm this matches the app's deletion behavior.]
- Sections 5 (license, for content that remains), 6 and 12–16 survive termination.

## 12. Disclaimers

The Service is provided "as is" and "as available". To the fullest extent allowed by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose and non-infringement. We do not guarantee that the Service will be uninterrupted, secure or error-free, that any member is who they say they are, or that you will form any particular connection. Content from members, Trevor James and guest contributors is for reflection and education, not professional advice. If you or someone else may be in danger, contact emergency services (911 in the US).

## 13. Limitation of liability

To the fullest extent allowed by law, Trevor James LLC and its owners, staff and contractors will not be liable for any indirect, incidental, special, consequential or punitive damages, or for loss of data, reputation or goodwill, arising from your use of the Service or any member's conduct. Our total liability for any claim relating to the Service is limited to the greater of the amount you paid us in the 12 months before the claim or US$100. Some laws do not allow these limits, so they may not fully apply to you.

## 14. Indemnity

You agree to defend and indemnify us against claims, losses and costs (including reasonable legal fees) arising from your content, your conduct toward other members, or your breach of these Terms.

## 15. Disputes and governing law

These Terms are governed by the laws of the State of California, without regard to conflict-of-law rules. Any dispute will be resolved in the state or federal courts in Los Angeles County, California, and you and we consent to their jurisdiction. Before filing a claim, please contact us so we can try to resolve it informally within 30 days. [Counsel: decide whether to add arbitration and a class-action waiver.]

## 16. General

- **Changes.** We may update these Terms. If a change is material, we will notify you by email or in the app at least 14 days before it takes effect. Continuing to use the Service after that means you accept the change.
- **Entire agreement.** These Terms, the House Rules, the Privacy Policy and any event-specific agreements are the whole agreement between us about the Service.
- **Severability and waiver.** If a provision is unenforceable, the rest still applies. Not enforcing a right is not a waiver of it.
- **Assignment.** You may not transfer these Terms. We may transfer them in a merger, sale or reorganization.
- **Copyright complaints.** If you believe content infringes your copyright, email support@trevorjamesla.com with the details required by the Digital Millennium Copyright Act. [Counsel: consider registering a DMCA agent.]

## 17. Contact

Trevor James LLC · [mailing address] · Los Angeles, California · support@trevorjamesla.com
`;

const PRIVACY_MD = `
Effective date: [date of publication]

We collect only what we need to run a private, safe community, and we never sell your personal information. This Privacy Policy explains how Trevor James LLC ("we", "us") handles information through The Connection Room website and app at community.trevorjamesla.com, our emails and our events (the "Service").

## 1. Information we collect

| Category | Examples | Where it comes from |
| --- | --- | --- |
| Account | Name, email address, sign-in details, account role and status | You, at sign-up |
| Profile | Photo and photo framing, age, city and state, pronouns, tagline, interests, connection preferences and boundaries | You, during onboarding and in settings |
| Sensitive profile details | Sexual orientation, relationship status, and anything you choose to share about your sexuality, health or intimate life | You, optionally |
| Your content | Posts, comments, reflections, questions (including anonymous ones), poll answers, reactions, event RSVPs | You, as you use the Service |
| Private messages | Messages exchanged through Connections | You and the members you message |
| Preferences | Notification settings, email topic choices, time zone (from your browser) | You and your device |
| Usage and device | Pages visited, sign-in times, clicks on links in our emails, IP address, browser and device type, error logs | Collected automatically |
| Quiz answers | Answers to optional quizzes hosted by ScoreApp | You, through ScoreApp |
| Safety records | Reports you make or that concern you, moderation decisions | You, other members, our moderators |

**Sensitive information.** Membership itself may suggest your sexual orientation. We treat your membership and all sensitive profile details as confidential. You choose whether to provide orientation, relationship status and location, and you can hide them from other members in your profile settings. We use this information only to run the community features you use, never for advertising.

**Cookies and similar storage.** We use essential cookies and your browser's local storage to keep you signed in, remember settings, and save unsent drafts on your device. We do not use advertising or cross-site tracking cookies. [Confirm: no analytics tools are in use; update if any are added.]

## 2. How we use it

- **Run the Service:** create your account, show your profile to members, deliver posts, messages and notifications.
- **Match and invite:** suggest Connections and choose which members to invite to answer community questions, based on your preferences and topic choices.
- **Communicate:** send account emails, activity notifications, newsletters and invitations you can opt out of.
- **Keep the community safe:** verify members, investigate reports, enforce the Terms and House Rules, prevent fraud and abuse.
- **Improve the Service:** understand which features are used, using counts and aggregates where possible.
- **Meet legal obligations:** respond to lawful requests and protect our rights.

We do not use your content to train artificial intelligence models, and we do not make decisions with legal or similarly significant effects about you by automated means alone.

## 3. Who can see your information

- **Other members.** Signed-in members can see your profile (except fields you hide), your posts and comments in Spaces, and your participation in shared features. Only the members in a conversation can see its private messages. The Service is not visible to the public or to search engines.
- **Anonymous content.** When you post anonymously, members see "A member" or "Question author". Only our administrators and moderators can see who wrote it.
- **Our team.** Trevor James and a small number of authorized staff or contractors can access information when needed to operate, support and moderate the Service, under confidentiality obligations.

## 4. Who we share it with

We do not sell or rent your personal information, and we do not share it for targeted advertising. We share it only as follows.

**Service providers** that process data on our behalf under contract:

| Provider | Purpose | Location |
| --- | --- | --- |
| [Supabase](https://supabase.com/privacy) | Database, sign-in and photo storage | United States [confirm region] |
| [Vercel](https://vercel.com/legal/privacy-policy) | Website hosting and server logs | United States |
| [SMTP2GO](https://www.smtp2go.com/privacy/) | Sending email and handling bounces and unsubscribes | [confirm region] |
| [ScoreApp](https://www.scoreapp.com/privacy-policy/) | Optional quizzes (only if you take one) | [confirm region] |

**Legal and safety.** We may disclose information if we believe in good faith it is required by law, subpoena or court order, or needed to protect someone's safety, investigate a Terms violation, or defend our legal rights. Where the law allows, we will tell you before disclosing your information in response to a legal demand. Any sexual content involving minors will be reported to the authorities.

**Business changes.** If Trevor James LLC is involved in a merger, sale or reorganization, your information may transfer to the new owner, who must honor this policy.

**With your permission.** In any other case, only when you ask us to.

## 5. Your choices

- **Profile visibility:** hide location, orientation and relationship status, and edit or remove your photo, in profile settings.
- **Emails:** change notification frequency, turn off community invitations, or use the unsubscribe link in any non-essential email.
- **Content:** edit or delete your posts, comments and messages where the Service allows.
- **Connections:** opt in or out at any time, and block any member.
- **Account:** deactivate or delete your account from settings or by emailing support@trevorjamesla.com.

## 6. Your rights

Depending on where you live, you may have the right to:

- know what personal information we hold about you and get a copy;
- correct inaccurate information;
- delete your information;
- limit our use of sensitive personal information (we already use it only to provide the Service);
- opt out of sale or sharing for targeted advertising (we do neither); and
- not be treated differently for using these rights.

To make a request, email support@trevorjamesla.com from the address on your account. We will confirm your identity and respond within 45 days. You may use an authorized agent; we may ask for proof of their authority. If we decline your request, you may appeal by replying to our decision.

**California residents.** This section is our notice under the California Consumer Privacy Act as amended by the CPRA. In the past 12 months we collected the categories in section 1 for the purposes in section 2, disclosed them only to the recipients in section 4, and did not sell or share personal information. [Counsel: confirm whether CCPA thresholds apply and adjust.]

**Other states.** Residents of states with comprehensive privacy or consumer health data laws (for example Washington, Nevada, Colorado, Connecticut, Virginia and Texas) have similar rights and may use the same process. [Counsel: confirm whether a separate consumer health data notice is required.]

## 7. How long we keep it

| Information | Kept for |
| --- | --- |
| Account and profile | While your account is active; deleted or de-identified within 30 days of account deletion |
| Posts and comments in shared areas | Until you delete them; after account deletion, kept without your name so conversations stay readable |
| Private messages | Until deleted by you or the other member, or your account is deleted |
| Email and link-click records | [24 months] |
| Server and security logs | [90 days] |
| Safety and moderation records | As long as needed to protect the community, up to [5 years] |
| Backups | Overwritten on our providers' backup schedules, typically within [30 days] |

[Counsel: these periods are proposed; confirm before publishing.]

## 8. Security

We use encryption in transit (HTTPS), access controls that limit which staff and systems can read each kind of data, row-level database permissions, and signed links that carry no passwords. No system is perfectly secure. If a breach affects your personal information, we will notify you as required by law.

## 9. Age limit

The Service is only for adults 18 and over. We do not knowingly collect information from anyone under 18. If we learn we have, we will delete it and close the account.

## 10. International members

We are based in the United States and store information there. If you use the Service from another country, your information will be transferred to and processed in the United States. [Counsel: expand if members in the EU or UK are accepted.]

## 11. Changes to this policy

If we make a material change, we will notify you by email or in the app at least 14 days before it takes effect. The effective date at the top shows the latest version.

## 12. Contact

Trevor James LLC · [mailing address] · Los Angeles, California · support@trevorjamesla.com
`;

const NOTES_MD = `
These are first drafts, not yet reviewed by a lawyer. They are written to match how The Connection Room actually works today. Please edit the Terms of Service and Privacy Policy directly; every change is saved with your name, and "Show changes" displays who added or removed what. This page is for working notes and is never published.

Bracketed text like [this] marks a fact or choice that needs confirming.

**About the service.** The Connection Room is a private online community for gay, bisexual and curious men, operated by Trevor James LLC in Los Angeles. Members create profiles, post and comment in topic Spaces, answer reflection prompts and polls, and can opt in to one-to-one Connections with private messages. Trevor James also runs in-person workshops and events. Membership is currently free. The [House Rules](/house-rules) (community conduct standards) are a separate page and are incorporated by reference.

## Decisions for counsel

- Arbitration and class-action waiver: include, or rely on California courts only? (Drafted as courts only.)
- Governing law and venue: California, Los Angeles County — confirm.
- Liability cap amount: drafted as the greater of fees paid in the last 12 months or US$100.
- Event waiver: should in-person touch and embodiment events use a separate signed release? (Drafted as a short assumption-of-risk clause plus a pointer to event-specific waivers.)
- Sensitive data: profiles can include sexual orientation, relationship status and location. Confirm the consent wording meets CCPA/CPRA "sensitive personal information" rules and any state health-data laws (e.g. Washington My Health My Data).
- Whether members outside the US are accepted. If so, GDPR/UK GDPR sections need expanding.
- Data retention periods in the Privacy Policy are proposed, not yet built into the app — confirm before publishing.
- Paid membership: if fees are introduced later, add billing, renewal and refund terms.
`;

const SEED_MD: Record<LegalSlug, string> = {
  terms: TERMS_MD,
  privacy: PRIVACY_MD,
  notes: NOTES_MD,
};

export function seedHtml(slug: LegalSlug): string {
  return markdownToHtml(SEED_MD[slug]);
}
