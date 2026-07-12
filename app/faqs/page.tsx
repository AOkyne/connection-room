"use client";

import { useState } from "react";
import { ContentHeader } from "@/components/content/ContentHeader";
import { ContentFooter } from "@/components/content/ContentFooter";

const FAQS = [
  {
    q: "What is The Connection Room?",
    a: "It's a private online community for men working on connection, intimacy, and embodiment, built as an extension of Trevor James's practice. It's a place to process what you're learning, be witnessed by other men doing similar work, and stay connected between sessions, workshops, or programs.",
  },
  {
    q: "Who is this for?",
    a: "Gay, bisexual, straight, and curious men who want to deepen their capacity for connection, whether you're brand new to this work or already enrolled in one of our coaching programs. You don't need to be “successful” or at any particular life stage. Some members are well established. Others are rebuilding or just starting to ask questions. Both belong.",
  },
  {
    q: "Is this a dating or hookup platform?",
    a: (
      <>
        No. There&rsquo;s no swiping, matching, or chat-for-strangers functionality here. Genuine
        connections of all kinds can and do form naturally, but this community isn&rsquo;t built
        around that outcome, and using it as a dating or hookup space works against its purpose.
        See our <a href="/house-rules">House Rules</a> for more on this.
      </>
    ),
  },
  {
    q: "Do I need to be enrolled in a coaching program to join?",
    a: "No. You just have to be committed to working on yourself and connecting intentionally with others.",
  },
  {
    q: "Is what I share here confidential?",
    a: "Yes. Discretion is one of our House Rules, not just a policy. What's shared in this room is meant to stay in this room. Please review the full House Rules and our Privacy Policy for details on how we protect your information.",
  },
  {
    q: "How much do I need to participate?",
    a: "There's no minimum posting requirement or attendance quota. That said, this community works because members show up for each other, not just consume content. If you go quiet for a long stretch, that's normal and human. If your account is only ever taking without ever engaging, we may reach out just to check in.",
  },
  {
    q: "What if I don't connect with anyone right away?",
    a: "That's completely normal. Not every conversation or thread will land, and that's not a measure of whether this community is working for you. You're never expected to force a connection. Give it time, and keep showing up as yourself.",
  },
  {
    q: "What if something makes me uncomfortable?",
    a: "Say something in the moment if you're able to, or reach out to our team directly and privately. We take every concern seriously and handle it with discretion. Protecting the comfort and safety of this room is our top priority.",
  },
  {
    q: "Is this a substitute for therapy or one-on-one coaching?",
    a: (
      <>
        No. The Connection Room is a community space, not a clinical or therapeutic service. It&rsquo;s
        designed to support the deeper work some of you are doing through Trevor James&rsquo;s
        coaching, bodywork, or programs, not replace it. If you&rsquo;re navigating something that
        needs more individual support,{" "}
        <a href="https://trevorjamesla.as.me/free-consult" target="_blank" rel="noopener noreferrer">
          book a Clarity Call
        </a>
        .
      </>
    ),
  },
  {
    q: "Can I invite a friend?",
    a: "Absolutely. If you know someone on the same path who would appreciate this community and want to participate, use the invitation link in your profile to invite them.",
  },
  {
    q: "How is the community moderated?",
    a: "Our team reviews the space regularly and takes reports seriously. Members who violate our House Rules, particularly around harassment, coercion, discrimination, or turning the space into a dating/solicitation platform, may be removed at our discretion.",
  },
  {
    q: "What if I have a question this didn't answer?",
    a: (
      <>
        Reach out to us directly. We read everything.{" "}
        <a href="mailto:support@trevorjamesla.com">support@trevorjamesla.com</a>
      </>
    ),
  },
];

export default function FaqsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="tcr-page">
      <ContentHeader active="faqs" />

      <section className="section section--center">
        <div className="wrap">
          <p className="eyebrow">FAQs</p>
          <h1>Everything you might want to know.</h1>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="faq-list">
            {FAQS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div className={`faq-item${isOpen ? " is-open" : ""}`} key={item.q}>
                  <button
                    type="button"
                    className="faq-item__question"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-item__number">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="faq-item__title">{item.q}</span>
                    <span className="faq-item__icon" />
                  </button>
                  <div
                    className="faq-item__answer"
                    style={{ maxHeight: isOpen ? "600px" : undefined }}
                  >
                    <div className="faq-item__answer-inner">{item.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ContentFooter hide="faqs" />
    </div>
  );
}
