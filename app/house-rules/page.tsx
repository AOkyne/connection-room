import type { Metadata } from "next";
import { ContentHeader } from "@/components/content/ContentHeader";
import { ContentFooter } from "@/components/content/ContentFooter";

export const metadata: Metadata = {
  title: "House Rules — The Connection Room",
};

const RULES = [
  {
    title: "A Community, Not a Marketplace",
    body: "This isn't a dating app, hookup space, or client pool. Friendship, attraction, and collaboration may emerge naturally, that's human. Pursuing someone using a vulnerable disclosure as an opening, or pressuring members for contact, sex, or business, is not welcome. A friendly response isn't consent to romantic or sexual interest.",
  },
  {
    title: "Treat Every Member with Dignity",
    body: "Disagreement is welcome; contempt is not. No insults, shaming, bullying, threats, slurs, or dehumanizing language. No racism, homophobia, biphobia, transphobia, sexism, ableism, ageism, body shaming, religious intolerance, or xenophobia. You don't need to understand someone's experience to treat him with dignity.",
  },
  {
    title: "Protect Privacy and Confidentiality",
    body: "What's shared in the Room stays in the Room. Don't screenshot, record, repost, or share another member's posts, images, or story (even anonymously if identifiable) without explicit permission. Never reveal someone's sexuality, relationship status, health, location, workplace, legal name, or membership. No platform guarantees absolute confidentiality, so share thoughtfully.",
  },
  {
    title: "Show Up as Yourself",
    body: "No need to perform or posture. Speak from your own experience (\"What I noticed was...\", \"In my experience...\") rather than sweeping claims about what all men, or any group, think or need. Your experience is valid, but it isn't automatically everyone else's truth.",
  },
  {
    title: "Consent Applies to Every Interaction",
    body: "Consent covers conversations, advice, DMs, photos, disclosures, humor, and flirting, not just physical contact. Ask before offering advice, asking intimate questions, moving to private messages, touching, or photographing. Anyone can decline, pause, or withdraw at any time, no explanation owed. Silence or politeness isn't consent. Don't pressure, guilt, or punish someone for setting a boundary.",
  },
  {
    title: "Be Curious, Not Corrective",
    body: "This is a space for exploration, not unsolicited fixing. Listen before diagnosing, labeling, or telling someone what he needs. Ask: \"Would you like to be heard, reflected back to, or offered ideas?\" Uninvited advice can be a way of not listening.",
  },
  {
    title: "Respect Each Person's Pace",
    body: "Some members are new to this work; others have years in it. No one owes you his story, progress, or affection on your timeline. Don't rush, shame, or compare. Choosing not to share, or needing more time, is still participation.",
  },
  {
    title: "Participate with Care",
    body: "You don't need to post daily, but the Room works because members help create it. Introduce yourself, respond to others, offer encouragement. Also notice if you're dominating conversations or drawing more emotional energy than you give. Make room, and take room.",
  },
  {
    title: "Use Private Messages Responsibly",
    body: "A DM should feel like an invitation, not an intrusion. Introduce yourself, explain why you're reaching out, and make it easy to decline. Don't repeatedly message someone who hasn't replied, or move a public disagreement into DMs to confront someone. Blocking is a valid boundary; evading a block via another account or channel is prohibited.",
  },
  {
    title: "Don't Turn Sexual Openness into Sexual Access",
    body: "Open conversation about sex, desire, or intimacy doesn't mean someone is available for flirtation or sexual contact. No unsolicited sexual messages, explicit images, or intrusive questions about someone's body. If interest isn't clearly reciprocated, step back.",
  },
  {
    title: "Share Sensitive Content Thoughtfully",
    body: "Use a brief content note for graphic sexual experiences, abuse, violence, or self-harm topics. No pornographic content, unsolicited nudity, or material meant to shock or arouse. Any sexual content involving minors is strictly prohibited and may be reported to authorities.",
  },
  {
    title: "No Self-Promotion Without Permission",
    body: "Don't use the Room to solicit business, pitch services, recruit clients, or repeatedly promote outside platforms. Relevant resources may be shared if they genuinely support a conversation. Ask the community team before promoting an event, offer, or study.",
  },
  {
    title: "Respect Creative and Intellectual Work",
    body: "Don't present others' writing, ideas, or work as your own. Credit sources, and get permission before distributing private material. Content created for the Room (prompts, workshops, courses) may not be copied or redistributed without permission.",
  },
  {
    title: "In-Person Events Require Active Consent",
    body: "These rules apply to workshops, retreats, and gatherings. For touch, embodiment, or partner exercises: consent must be clear, informed, and ongoing; ask before touching or photographing; consent to one activity doesn't imply consent to another; anyone may stop at any time; follow facilitator instructions; don't participate impaired by alcohol or drugs; tell a facilitator if something feels unsafe. No one is required to touch, be touched, disclose, or participate to belong.",
  },
  {
    title: "Take Responsibility for Your Impact",
    body: "Good intentions don't erase impact. If someone says your words affected him negatively, pause, listen, and consider your role. You don't have to agree with every interpretation to acknowledge the experience. Good-faith mistakes can become repair. Repeated harm or refusal to respect boundaries may lead to moderation.",
  },
  {
    title: "Report Concerns Rather Than Managing Them Alone",
    body: "Report harassment, discrimination, unwanted sexual attention, privacy violations, impersonation, block evasion, or anything that feels unsafe. You don't need to confront the person first. Reports are reviewed as discreetly and fairly as possible; absolute confidentiality can't be guaranteed if the law or member safety requires disclosure. Retaliation for reporting is prohibited.",
  },
  {
    title: "Community, Not a Substitute for Professional Care",
    body: "The Room offers connection and reflection, not psychotherapy, medical care, legal advice, or crisis services. Don't present opinions as professional diagnosis. Participation doesn't create a professional relationship. If you or someone else may be in danger, contact emergency services.",
  },
];

const AGREEMENTS = [
  "I am at least 18.",
  "I have read and understood these House Rules.",
  "I agree to respect the consent, dignity, privacy, and boundaries of other members.",
  "I understand my participation may be restricted or ended for violations.",
  "I will report serious concerns rather than managing them alone.",
];

export default function HouseRulesPage() {
  return (
    <div className="tcr-page">
      <ContentHeader active="house-rules" />

      <section className="section section--center">
        <div className="wrap wrap--wide">
          <p className="eyebrow">House Rules</p>
          <h1>
            These aren&rsquo;t legal terms (found separately). <em>This is how we take care of the
            Room, ourselves, and one another.</em>
          </h1>
        </div>
      </section>

      <section className="section section--center" style={{ paddingTop: 0 }}>
        <div className="wrap measure-narrow">
          <p>
            The Connection Room exists for honest conversation, reflection, and connection. You
            don&rsquo;t need to be healed, articulate, or polished to belong, just willing to
            participate with care, respect boundaries, and remember there&rsquo;s a real person
            behind every post.
          </p>
          <p>By participating in the Room, online or in person, you agree to these House Rules.</p>

          <div className="callout">
            <p>
              <strong>The Short Version:</strong> Be honest. Be kind. Ask rather than assume.
              Respect boundaries. Protect privacy. Don&rsquo;t treat people as prospects, projects,
              or products. When something goes wrong, listen, repair, and learn.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--alt" style={{ paddingTop: 56 }}>
        <div className="wrap wrap--wide">
          {RULES.map((rule, idx) => (
            <div key={rule.title} style={{ marginBottom: 40 }}>
              <h3 style={{ marginBottom: 8 }}>
                {idx + 1}. {rule.title}
              </h3>
              <p style={{ margin: 0 }}>{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap measure-narrow">
          <p className="eyebrow">How Moderation Works</p>
          <h2 style={{ fontSize: 24 }}>Protecting the conditions for honesty, not policing imperfection</h2>
          <p>
            Our goal is to protect the conditions for honesty and connection, not to police
            ordinary imperfection. Depending on severity and pattern, the Room may offer a private
            reminder, request repair, edit or remove content, restrict access, issue a warning,
            suspend, or permanently remove a member.
          </p>
          <p>
            Serious violations (threats, stalking, discriminatory harassment, doxxing,
            impersonation, non-consensual sexual behavior, deliberate privacy violations, block
            evasion) may result in immediate removal without warning or refund. Members may contact
            the community team to request review of a decision; community safety remains the
            primary consideration.
          </p>
        </div>
      </section>

      <section className="section section--alt section--center">
        <div className="wrap measure-narrow">
          <p className="eyebrow">When in Doubt, Choose Kindness</p>
          <p>
            Pay attention to those around you. Ask rather than assume. Respect a boundary the first
            time. The goal isn&rsquo;t a room where no one is ever uncomfortable. Honest connection
            sometimes means sitting with difference and challenge. The goal is a room where people
            can take those risks without being shamed, hunted, exploited, or harmed. We&rsquo;re
            here to practice connection, not perfection.
          </p>
          <p>
            If something doesn&rsquo;t sit right, contact us. We&rsquo;d rather hear from you than
            have you carry it alone.
          </p>
          <a href="mailto:support@trevorjamesla.com" className="btn btn--primary">
            support@trevorjamesla.com
          </a>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="card">
            <p className="eyebrow" style={{ textAlign: "center" }}>
              Member Agreement
            </p>
            <p style={{ textAlign: "center", marginBottom: 20 }}>By joining, I confirm:</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              {AGREEMENTS.map((line) => (
                <li key={line} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <span style={{ color: "var(--tcr-gold)" }}>✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p style={{ textAlign: "center", margin: 0 }}>
              I agree to help make The Connection Room a place where honesty, kindness, curiosity,
              and connection can grow.
            </p>
          </div>
        </div>
      </section>

      <ContentFooter hide="house-rules" />
    </div>
  );
}
