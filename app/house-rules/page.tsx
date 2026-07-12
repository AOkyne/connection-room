import type { Metadata } from "next";
import { ContentHeader } from "@/components/content/ContentHeader";
import { ContentFooter } from "@/components/content/ContentFooter";

export const metadata: Metadata = {
  title: "House Rules — The Connection Room",
};

const RULES = [
  {
    title: "This is an environment, not a marketplace.",
    body: "The Connection Room is not a dating app and not a hookup space. There's no swiping, no matchmaking, no ranking. Connections of every kind, friendship, brotherhood, even attraction, can and do emerge naturally here, but building this into a transactional or explicitly sexual space works against everything it's meant to be. Please don't use it that way.",
  },
  {
    title: "Discretion is the foundation.",
    body: "What's shared in this room stays in this room. Don't screenshot, repost, or repeat another member's story, identity, or personal details outside this space, even anonymized, even with good intentions. Assume every man here is trusting you the same way you're trusting them.",
  },
  {
    title: "Show up as yourself, and let others do the same.",
    body: "No performing, no posturing, no pretending you're further along than you are. You'll get more out of this room by being honestly where you are than by managing an image. Extend the same grace to every other member, regardless of where they are in their journey or where they land on the spectrum of gay, bisexual, straight, or curious.",
  },
  {
    title: "Comfort and consent come first, always.",
    body: "If something in this room feels off, whether it's a conversation, a dynamic, or another member's behavior, you're not expected to push through it or handle it alone. Say something in the moment if you can. If you can't, reach out to our team directly. We take every concern seriously and handle it discreetly.",
  },
  {
    title: "Participation is active, not passive.",
    body: "You're not required to post daily or show up to everything. Life happens, and we understand that. But this room works because members help hold it, not just consume it. Introduce yourself. Respond to other men with the same openness you'd want back.",
  },
  {
    title: "No self-promotion without permission.",
    body: "This isn't a space to solicit business, pitch your services, or recruit for other communities, programs, or platforms. If you have something you genuinely think would benefit the group, ask our team first.",
  },
  {
    title: "Respect the pace of the man next to you.",
    body: "Some members are five minutes into this work. Others are years in. Nobody here owes you their story on your timeline, and nobody should be made to feel behind for taking longer than someone else. Comparison has no place in this room.",
  },
  {
    title: "This room supports professional work. It doesn't replace it.",
    body: "Nothing shared here is a substitute for therapy, medical care, or one-on-one coaching. If you're in crisis or need support beyond what this community can offer, please reach out to a licensed professional or, in an emergency, local emergency services.",
  },
  {
    title: "Zero tolerance for harassment, hate, or coercion.",
    body: "Discriminatory language, harassment, unwanted advances, or pressure of any kind toward another member will not be tolerated. This applies regardless of how the other person responds or whether they report it themselves. Violations can result in removal from the community, at our discretion, without refund.",
  },
  {
    title: "When in doubt, choose kindness.",
    body: "Most of what happens in this room isn't covered by a rule. It's covered by the same thing that makes any good room work: paying attention to the men around you, and treating this space like it matters. It does.",
  },
];

export default function HouseRulesPage() {
  return (
    <div className="tcr-page">
      <ContentHeader active="house-rules" />

      <section className="section section--center">
        <div className="wrap wrap--wide">
          <p className="eyebrow">House Rules</p>
          <h1>
            These aren&rsquo;t legal terms. <em>This is how we hold this room together.</em>
          </h1>
          <p className="lede">Read them once, and let them become instinct.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap wrap--wide">
          <div className="rules-grid">
            {RULES.map((rule, idx) => (
              <div className="rule-card" key={rule.title}>
                <div className="rule-card__number">{String(idx + 1).padStart(2, "0")}</div>
                <div className="rule-card__title">{rule.title}</div>
                <p className="rule-card__body">{rule.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="card" style={{ textAlign: "center", borderColor: "var(--tcr-gold)" }}>
            <p style={{ marginBottom: 24 }}>
              If you ever have a concern, question, or something doesn&rsquo;t sit right, reach out
              to us directly. We read everything, and we&rsquo;d rather hear from you than have you
              carry it alone.
            </p>
            <a href="mailto:support@trevorjamesla.com" className="btn btn--primary">
              Contact us &rarr;
            </a>
          </div>
        </div>
      </section>

      <ContentFooter hide="house-rules" />
    </div>
  );
}
