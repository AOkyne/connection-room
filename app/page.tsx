"use client";

import Link from "next/link";
import "./landing.css";

export default function LandingPage() {
  return (
    <>
      <style>{`
        :root {
          --cream: #FAF6EE;
          --cream-deep: #F3ECDD;
          --card: #FFFDF8;
          --ink: #2C2417;
          --ink-soft: #5C5142;
          --ink-faint: #8B7F6C;
          --gold: #C09A4A;
          --gold-deep: #8C6B2F;
          --bronze: #A3763A;
          --line: #E4D9C4;
          --shadow: 0 18px 50px rgba(60, 45, 20, 0.1);
          --radius: 18px;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: var(--cream);
          color: var(--ink);
          font-family: 'DM Sans', sans-serif;
          font-size: 17px;
          line-height: 1.65;
          -webkit-font-smoothing: antialiased;
        }

        ::selection {
          background: rgba(192, 154, 74, 0.25);
        }

        .wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 28px;
        }

        h1, h2, h3, .serif {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 500;
        }

        a:focus-visible, button:focus-visible {
          outline: 3px solid var(--gold);
          outline-offset: 3px;
          border-radius: 6px;
        }

        /* header */
        header {
          padding: 26px 0;
          border-bottom: 1px solid var(--line);
          background: var(--cream);
        }

        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brandmark {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          color: var(--ink);
        }

        .brandmark img {
          height: 42px;
          width: auto;
          object-fit: contain;
        }

        .brandmark .name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem;
          letter-spacing: 0.02em;
        }

        .brandmark .by {
          display: block;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-faint);
        }

        .header-cta {
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          color: var(--gold-deep);
          border: 1px solid var(--gold);
          padding: 9px 20px;
          border-radius: 999px;
          transition: background 0.2s, color 0.2s;
        }

        .header-cta:hover {
          background: var(--gold-deep);
          color: var(--cream);
          border-color: var(--gold-deep);
        }

        /* hero */
        .hero {
          padding: 96px 0 84px;
          text-align: center;
          background: radial-gradient(60% 50% at 50% 0%, rgba(192, 154, 74, 0.1), transparent 70%),
                      var(--cream);
        }

        .hero .eyebrow {
          font-size: 0.74rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--bronze);
          margin-bottom: 34px;
          font-weight: 500;
        }

        .headline {
          max-width: 760px;
          margin: 0 auto;
        }

        .headline .line {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.4rem, 6vw, 4.1rem);
          line-height: 1.14;
        }

        .headline .not {
          color: var(--ink-faint);
          text-decoration: line-through;
          text-decoration-color: rgba(163, 118, 58, 0.55);
          text-decoration-thickness: 2px;
          opacity: 0;
          animation: riseIn 0.8s ease forwards;
        }

        .headline .not:nth-child(2) {
          animation-delay: 0.35s;
        }

        .headline .something {
          font-style: italic;
          font-weight: 600;
          background: linear-gradient(100deg, var(--gold) 10%, var(--gold-deep) 90%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          opacity: 0;
          animation: riseIn 0.9s ease 0.75s forwards;
          padding-bottom: 0.08em;
        }

        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .headline .not, .headline .something {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }

        .hero .sub {
          max-width: 560px;
          margin: 30px auto 0;
          font-size: 1.12rem;
          color: var(--ink-soft);
        }

        .cta-row {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .btn-primary {
          display: inline-block;
          text-decoration: none;
          background: linear-gradient(100deg, var(--gold) 0%, var(--gold-deep) 100%);
          color: #FFFDF8;
          font-weight: 500;
          font-size: 1.02rem;
          padding: 16px 42px;
          border-radius: 999px;
          box-shadow: 0 10px 26px rgba(140, 107, 47, 0.28);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(140, 107, 47, 0.34);
        }

        .link-secondary {
          font-size: 0.95rem;
          color: var(--ink-soft);
          text-decoration: none;
          border-bottom: 1px solid var(--line);
          padding-bottom: 2px;
          transition: color 0.2s, border-color 0.2s;
        }

        .link-secondary:hover {
          color: var(--gold-deep);
          border-color: var(--gold-deep);
        }

        .fine-print {
          margin-top: 22px;
          font-size: 0.85rem;
          color: var(--ink-faint);
        }

        /* section scaffolding */
        section {
          padding: 86px 0;
        }

        .section-label {
          font-size: 0.74rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--bronze);
          font-weight: 500;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: clamp(1.9rem, 3.6vw, 2.7rem);
          line-height: 1.2;
          max-width: 620px;
        }

        .section-title em {
          font-style: italic;
          color: var(--gold-deep);
        }

        /* the feeling */
        .feeling {
          background: var(--cream);
        }

        .feeling-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 64px;
          align-items: center;
          margin-top: 14px;
        }

        .feeling p {
          color: var(--ink-soft);
          margin-top: 20px;
          max-width: 52ch;
        }

        .feeling p strong {
          color: var(--ink);
          font-weight: 500;
        }

        .feeling-image {
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow);
        }

        .feeling-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          aspect-ratio: 4 / 5;
        }

        /* is / isn't */
        .isnt {
          background: var(--cream-deep);
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }

        .isnt-header {
          text-align: center;
        }

        .isnt-header .section-title {
          margin: 0 auto;
        }

        .isnt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          max-width: 900px;
          margin: 52px auto 0;
        }

        .isnt-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 36px 34px;
          box-shadow: 0 8px 30px rgba(60, 45, 20, 0.06);
        }

        .isnt-card h3 {
          font-size: 1.5rem;
          margin-bottom: 18px;
        }

        .isnt-card h3 span {
          font-style: italic;
          color: var(--gold-deep);
        }

        .isnt-card ul {
          list-style: none;
        }

        .isnt-card li {
          padding: 11px 0;
          color: var(--ink-soft);
          font-size: 0.98rem;
          border-bottom: 1px solid var(--line);
          display: flex;
          gap: 12px;
          align-items: baseline;
        }

        .isnt-card li:last-child {
          border-bottom: none;
        }

        .isnt-card .mark {
          font-family: 'Cormorant Garamond', serif;
          color: var(--gold-deep);
          font-size: 1.05rem;
        }

        .isnt-note {
          text-align: center;
          margin-top: 36px;
          color: var(--ink-faint);
          font-size: 0.92rem;
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
        }

        /* a look inside */
        .inside .intro {
          max-width: 600px;
          color: var(--ink-soft);
          margin-top: 18px;
        }

        .room-frame {
          margin-top: 52px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 22px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .room-chrome {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--line);
          background: linear-gradient(180deg, #FBF7EE, #F6EFE0);
        }

        .room-chrome .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--line);
        }

        .room-chrome .dot:first-child {
          background: #D8B978;
        }

        .room-chrome .addr {
          margin-left: 12px;
          font-size: 0.78rem;
          color: var(--ink-faint);
          letter-spacing: 0.03em;
        }

        .room-body {
          display: grid;
          grid-template-columns: 1.25fr 0.85fr;
          gap: 0;
        }

        .room-main {
          padding: 36px 38px;
          border-right: 1px solid var(--line);
        }

        .room-side {
          padding: 36px 32px;
          background: #FBF7EE;
        }

        .room-h {
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--bronze);
          font-weight: 500;
          margin-bottom: 18px;
        }

        .post {
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 24px 24px 18px;
        }

        .post-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--gold), var(--gold-deep));
          color: #FFFDF8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
        }

        .post-meta .who {
          font-weight: 500;
          font-size: 0.95rem;
        }

        .post-meta .where {
          font-size: 0.78rem;
          color: var(--ink-faint);
        }

        .post-body {
          color: var(--ink-soft);
          font-size: 0.97rem;
        }

        .post-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .reaction {
          font-size: 0.78rem;
          color: var(--gold-deep);
          border: 1px solid var(--line);
          background: var(--card);
          padding: 6px 14px;
          border-radius: 999px;
        }

        .trevor-note {
          margin-top: 22px;
          border-left: 3px solid var(--gold);
          background: var(--cream);
          border-radius: 0 14px 14px 0;
          padding: 22px 24px;
        }

        .trevor-note .from {
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--bronze);
          margin-bottom: 10px;
          font-weight: 500;
        }

        .trevor-note p {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.18rem;
          line-height: 1.5;
          font-style: italic;
          color: var(--ink);
        }

        .trevor-note .sig {
          margin-top: 10px;
          font-size: 0.85rem;
          color: var(--ink-faint);
          font-style: normal;
          font-family: 'DM Sans', sans-serif;
        }

        .doors {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .door {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.92rem;
          color: var(--ink-soft);
        }

        .door .num {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          color: var(--gold-deep);
          font-size: 1.05rem;
          min-width: 20px;
          text-align: center;
        }

        .door.open {
          border-color: var(--gold);
          background: #FDF9F0;
          color: var(--ink);
        }

        .room-side .caption {
          margin-top: 18px;
          font-size: 0.82rem;
          color: var(--ink-faint);
        }

        /* eros */
        .eros {
          background: var(--cream-deep);
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          text-align: center;
        }

        .eros .section-title {
          margin: 0 auto;
        }

        .eros-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
          max-width: 920px;
          margin: 52px auto 0;
        }

        .eros-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 32px 24px;
        }

        .eros-card .letter {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 2.6rem;
          line-height: 1;
          background: linear-gradient(120deg, var(--gold), var(--gold-deep));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .eros-card h3 {
          font-size: 1.25rem;
          margin: 12px 0 8px;
        }

        .eros-card p {
          font-size: 0.9rem;
          color: var(--ink-soft);
        }

        .eros-note {
          margin-top: 34px;
          color: var(--ink-faint);
          font-size: 0.92rem;
        }

        /* founding */
        .founding-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }

        .founding p {
          color: var(--ink-soft);
          margin-top: 20px;
          max-width: 50ch;
        }

        .founding p strong {
          color: var(--ink);
          font-weight: 500;
        }

        .founding-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 42px 40px;
          text-align: center;
        }

        .founding-card .serif {
          font-size: 1.7rem;
          line-height: 1.3;
        }

        .founding-card .serif em {
          color: var(--gold-deep);
        }

        .founding-card .btn-primary {
          margin-top: 28px;
        }

        .founding-card .link-secondary {
          display: inline-block;
          margin-top: 18px;
        }

        .founding-card .fine-print {
          margin-top: 20px;
        }

        /* footer */
        footer {
          border-top: 1px solid var(--line);
          padding: 40px 0 48px;
          text-align: center;
          color: var(--ink-faint);
          font-size: 0.85rem;
        }

        footer a {
          color: var(--gold-deep);
          text-decoration: none;
        }

        footer a:hover {
          text-decoration: underline;
        }

        /* responsive */
        @media (max-width: 860px) {
          .feeling-grid, .founding-inner {
            grid-template-columns: 1fr;
            gap: 44px;
          }

          .room-body {
            grid-template-columns: 1fr;
          }

          .room-main {
            border-right: none;
            border-bottom: 1px solid var(--line);
          }

          .eros-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          section {
            padding: 64px 0;
          }

          .hero {
            padding: 70px 0 60px;
          }

          .isnt-grid, .eros-row {
            grid-template-columns: 1fr;
          }

          .room-main, .room-side {
            padding: 26px 22px;
          }

          .hero .sub {
            font-size: 1.04rem;
          }

          .feeling-image img {
            aspect-ratio: 4 / 3;
          }
        }
      `}</style>

      <header>
        <div className="wrap header-inner">
          <Link className="brandmark" href="/">
            <img src="/connection-room-logo.svg" alt="The Connection Room logo" />
            <span className="name">
              The Connection Room
              <span className="by">by Trevor James</span>
            </span>
          </Link>
          <Link className="header-cta" href="/auth?mode=member">
            Enter the Community
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">A private community for men, now in beta</p>
          <h1 className="headline">
            <span className="line not">Not therapy.</span>
            <span className="line not">Not Grindr.</span>
            <span className="line something">Something else.</span>
          </h1>
          <p className="sub">
            A private room where men practice real connection: honesty, embodiment,
            and being seen without performing. At your own pace, with the door
            firmly closed behind you.
          </p>
          <div className="cta-row">
            <Link className="btn-primary" href="/auth?mode=member">
              Step Inside
            </Link>
            <a className="link-secondary" href="https://trevorjamesla.as.me/free-consult">
              Or talk to Trevor first →
            </a>
          </div>
          <p className="fine-print">
            Private beta. Joining takes about 90 seconds, roughly the time it takes to overthink a text.
          </p>
        </div>
      </section>

      {/* THE FEELING */}
      <section className="feeling">
        <div className="wrap feeling-grid">
          <div>
            <p className="section-label">You know the feeling</p>
            <h2 className="section-title">
              Good at nearly everything. Except <em>this.</em>
            </h2>
            <p>
              You can run the meeting, plan the trip, host the dinner. You are the
              friend people call &quot;so put together.&quot; And still, when someone gets
              close, some quiet part of you leaves the room.
            </p>
            <p>
              You&apos;ve read the books. You&apos;ve done some therapy, and it helped, right
              up until it plateaued. You can narrate your patterns beautifully now.
              <strong>You just can&apos;t feel your way out of them alone.</strong>
            </p>
            <p>
              That&apos;s not a flaw. It&apos;s a skill nobody ever gave you a place to
              practice. This is that place.
            </p>
          </div>
          <div className="feeling-image">
            <img src="/two-men-in-conversation.png" alt="Two men in easy, genuine conversation" />
          </div>
        </div>
      </section>

      {/* IS / ISN'T */}
      <section className="isnt">
        <div className="wrap">
          <div className="isnt-header">
            <p className="section-label">Let&apos;s be clear</p>
            <h2 className="section-title">
              What this room is. And what it <em>isn&apos;t.</em>
            </h2>
          </div>
          <div className="isnt-grid">
            <div className="isnt-card">
              <h3>
                This <span>is</span>
              </h3>
              <ul>
                <li>
                  <span className="mark">✓</span> A private, moderated space where consent is the house rule
                </li>
                <li>
                  <span className="mark">✓</span> Men and couples practicing honesty, embodiment, and repair
                </li>
                <li>
                  <span className="mark">✓</span> Guided structure, so you&apos;re never dropped into a feed wondering what to do
                </li>
                <li>
                  <span className="mark">✓</span> Share when you&apos;re ready. Reading quietly counts as participating.
                </li>
              </ul>
            </div>
            <div className="isnt-card">
              <h3>
                This <span>isn&apos;t</span>
              </h3>
              <ul>
                <li>
                  <span className="mark">✕</span> A hookup app in a nicer outfit
                </li>
                <li>
                  <span className="mark">✕</span> A place anyone will pressure you to bare your soul on day one
                </li>
                <li>
                  <span className="mark">✕</span> A feed that sells your attention or your data
                </li>
                <li>
                  <span className="mark">✕</span> Unsolicited anything. You know the kind. Zero tolerance.
                </li>
              </ul>
            </div>
          </div>
          <p className="isnt-note">
            Your profile is yours to shape. Use the name you&apos;re comfortable with,
            share the photo you choose, and nothing here appears in a search engine.
          </p>
        </div>
      </section>

      {/* A LOOK INSIDE */}
      <section className="inside">
        <div className="wrap">
          <p className="section-label">A look inside</p>
          <h2 className="section-title">
            See the room before you <em>walk in.</em>
          </h2>
          <p className="intro">
            No mystery signups here. This is what it actually looks like on the
            other side of the door: real conversation, a guided path, and a host
            who shows up daily.
          </p>

          <div className="room-frame" role="img" aria-label="A preview of The Connection Room interior showing a Commons post, a note from Trevor, and the Seven Doors onboarding path">
            <div className="room-chrome" aria-hidden="true">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="addr">community.trevorjamesla.com</span>
            </div>
            <div className="room-body">
              <div className="room-main">
                <p className="room-h">From The Commons</p>
                <div className="post">
                  <div className="post-head">
                    <div className="avatar" aria-hidden="true">
                      M
                    </div>
                    <div className="post-meta">
                      <div className="who">Marcus</div>
                      <div className="where">The Commons · 2 days ago</div>
                    </div>
                  </div>
                  <p className="post-body">
                    Tried something small this week. A friend hugged me goodbye and
                    instead of doing my usual two-pat-and-release, I just... stayed.
                    Three whole seconds. Reporting back: nobody died, and I thought
                    about it the entire drive home.
                  </p>
                  <div className="post-actions" aria-hidden="true">
                    <span className="reaction">I feel this · 14</span>
                    <span className="reaction">Witnessed · 9</span>
                    <span className="reaction">Me too · 6</span>
                  </div>
                </div>

                <div className="trevor-note">
                  <p className="from">A note from Trevor</p>
                  <p>
                    You don&apos;t have to arrive ready. You just have to arrive.
                    The room does the rest, one honest sentence at a time.
                  </p>
                  <p className="sig">Trevor James, your host. In the room daily.</p>
                </div>
              </div>

              <div className="room-side">
                <p className="room-h">Your path: The Seven Doors</p>
                <ul className="doors">
                  <li className="door open">
                    <span className="num">I</span> Arrival · What drew you here?
                  </li>
                  <li className="door">
                    <span className="num">II</span> Belonging
                  </li>
                  <li className="door">
                    <span className="num">III</span> Being Seen
                  </li>
                  <li className="door">
                    <span className="num">IV</span> Honest Desire
                  </li>
                  <li className="door">
                    <span className="num">V</span> Embodiment
                  </li>
                  <li className="door">
                    <span className="num">VI</span> Connection
                  </li>
                  <li className="door">
                    <span className="num">VII</span> Integration
                  </li>
                </ul>
                <p className="caption">
                  A gentle onboarding arc that ramps up slowly. Door one asks what
                  brought you here. Nobody&apos;s asking for your childhood on day one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EROS METHOD */}
      <section className="eros">
        <div className="wrap">
          <p className="section-label">The method underneath</p>
          <h2 className="section-title">
            Guided by the <em>EROS Method</em>
          </h2>
          <div className="eros-row">
            <div className="eros-card">
              <div className="letter">E</div>
              <h3>Embody</h3>
              <p>Get out of your head and back into the body that&apos;s been waiting for you.</p>
            </div>
            <div className="eros-card">
              <div className="letter">R</div>
              <h3>Regulate</h3>
              <p>Learn to stay present when closeness makes your nervous system reach for the exit.</p>
            </div>
            <div className="eros-card">
              <div className="letter">O</div>
              <h3>Own</h3>
              <p>Name what you actually want, without apology and without the résumé.</p>
            </div>
            <div className="eros-card">
              <div className="letter">S</div>
              <h3>Share</h3>
              <p>Practice being seen, in a room built to make that safe.</p>
            </div>
          </div>
          <p className="eros-note">
            The same framework Trevor uses in sessions, workshops, and retreats.
            The room is where it becomes a daily practice instead of a breakthrough
            that fades by Thursday.
          </p>
        </div>
      </section>

      {/* FOUNDING */}
      <section className="founding">
        <div className="wrap founding-inner">
          <div>
            <p className="section-label">An honest note</p>
            <h2 className="section-title">
              The paint is <em>still drying.</em>
            </h2>
            <p>
              We&apos;re in private beta, which means the room is intimate and still
              finding its voice. I&apos;d rather tell you that plainly than pretend
              it&apos;s a metropolis.
            </p>
            <p>
              What it means for you: <strong>you&apos;d be a founding member.</strong>
              The conversations you start, the tone you set, the honesty you risk,
              that becomes the culture every man after you walks into. Twenty men
              in a real conversation beats two hundred strangers scrolling past
              each other. I&apos;m in the room every day, and I&apos;d love to have you
              there early.
            </p>
          </div>
          <div className="founding-card">
            <p className="serif">
              Come be one of the first through the <em>door.</em>
            </p>
            <Link className="btn-primary" href="/auth?mode=member">
              Step Inside
            </Link>
            <br />
            <a className="link-secondary" href="https://trevorjamesla.as.me/free-consult">
              Prefer to talk to Trevor first? Book a free Clarity Call →
            </a>
            <p className="fine-print">Private. Moderated. No unsolicited anything.</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <p>
            The Connection Room is part of the{" "}
            <a href="https://www.trevorjamesla.com">Trevor James</a> ecosystem · Hollywood,
            Los Angeles
          </p>
          <p style={{ marginTop: "8px" }}>
            &copy; 2026 Trevor James LA. A private community. What happens in the room stays in the room.
          </p>
        </div>
      </footer>
    </>
  );
}
