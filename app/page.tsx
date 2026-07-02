import Link from "next/link";
import "./landing.css";

export default function LandingPage() {
  return (
    <>
      <header>
        <div className="wrap header-inner">
          <Link href="/" className="logo-mark">
            <img
              src="/connection-room-logo.svg"
              alt="The Connection Room"
              style={{
                height: "clamp(90px, 15vw, 160px)",
                width: "auto",
                display: "block"
              }}
            />
          </Link>
          <Link href="/auth" className="signin-link">
            Sign In
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="hero-desktop-copy">
              <p className="eyebrow">A Private Community for Men &amp; Couples</p>
              <h1>Honest connection, <em>minus</em> the small talk.</h1>
              <p className="lede">
                A guided space for men and couples practicing embodied intimacy, real
                conversation, and the kind of presence that&apos;s hard to fake. No shame.
                No pressure. No &quot;so, what do you do for work&quot; energy.
              </p>

              <ul className="checklist">
                <li><span className="mark">✓</span> For individuals exploring personal connection and embodiment</li>
                <li><span className="mark">✓</span> For couples practicing honesty, touch, and repair</li>
                <li><span className="mark">✓</span> Zero tolerance for unsolicited anything (you know the kind)</li>
                <li><span className="mark">✓</span> Guided by the EROS Method: Embody, Regulate, Own, Share</li>
              </ul>

              <div className="cta-row">
                <Link href="/auth?mode=member" className="btn-primary">Enter the Community</Link>
                <Link href="https://trevorjamesla.as.me/free-consult" className="link-secondary">Or talk to Trevor first →</Link>
              </div>
              <p className="fine-print">Currently in private beta. Creating an account takes about 90 seconds, roughly the time it takes to overthink sending a text.</p>
            </div>

            {/* Condensed copy shown only under 600px. Same destinations, shorter trip. */}
            <div className="hero-mobile">
              <p className="eyebrow">A Private Community for Men &amp; Couples</p>
              <h1>Honest connection, <em>minus</em> the small talk.</h1>
              <p className="lede">
                A guided space for honest, embodied intimacy. No shame, no pressure,
                no &quot;so what do you do&quot; energy.
              </p>

              <ul className="checklist">
                <li><span className="mark">✓</span> For individuals and couples</li>
                <li><span className="mark">✓</span> Guided by the EROS Method</li>
              </ul>

              <Link href="/auth?mode=member" className="btn-primary">Enter the Community</Link>
              <Link href="https://trevorjamesla.as.me/free-consult" className="link-secondary">Free 90-second signup. Or talk to Trevor first →</Link>
            </div>
          </div>

          <div className="hero-image-wrap">
            <img src="/imagery/image10.png" alt="Members in conversation at The Connection Room" />
          </div>
        </div>
      </section>

      {/* A LOOK INSIDE */}
      <section className="block inside" id="look-inside">
        <div className="wrap">
          <div className="block-head">
            <p className="eyebrow" style={{ textAlign: "center" }}>A Look Inside</p>
            <h2>You don&apos;t have to take our word for it.</h2>
            <p>Here&apos;s a small, honest piece of what&apos;s actually in here. Not a brochure. The real thing, just smaller.</p>
          </div>

          <div className="inside-grid">
            <div className="inside-card">
              <h3>Your first week has a shape</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: "15px" }}>
                New members move through the Seven Doors of Connection. Each one&apos;s
                a small invitation, not a homework assignment.
              </p>
              <div className="doors-row" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <div key={num} className="door-chip">{num}</div>
                ))}
              </div>
              <p className="doors-caption">Arrival · Awareness · Being Seen · Curiosity · Embodiment · Courage · Intention</p>

              <blockquote className="trevor">
                &quot;You do not have to become a different person to belong here.
                Start by noticing what helps you return: to your body, to honesty,
                to connection, and to the parts of yourself that have been waiting
                for a little more room.&quot;
                <cite>— A note from Trevor</cite>
              </blockquote>
            </div>

            <div className="inside-card">
              <h3>This is what honesty sounds like here</h3>
              <div className="commons-post">
                <p>&quot;I walked in here expecting to be told what I&apos;m doing wrong.
                Instead I&apos;m learning to ask myself: what do I actually want?
                Not what looks good, not what impresses people. Just… me.
                That&apos;s weirdly hard.&quot;</p>
                <div className="reactions">
                  <span className="pill">I feel this (4)</span>
                  <span className="pill">That shifted something</span>
                  <span className="pill">Oof, too real</span>
                </div>
              </div>
              <p className="quip">A real reflection from a real member. The bar for vulnerability in here is delightfully low. Bring a sentence, not a TED talk.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU'LL EXPLORE */}
      <section className="block">
        <div className="wrap">
          <div className="block-head">
            <h2>What You&apos;ll Explore</h2>
            <p>Three threads, woven through everything here.</p>
          </div>

          <div className="explore-grid">
            <div className="explore-card">
              <div className="glyph"></div>
              <h3>Embodiment</h3>
              <p>Come back to your body. Notice sensation, presence, and aliveness, even if your body&apos;s been politely ignored since roughly 2019.</p>
            </div>
            <div className="explore-card">
              <div className="glyph"></div>
              <h3>Connection</h3>
              <p>Practice honest expression, vulnerability, and relational presence. Turns out &quot;fine, you?&quot; was never actually a full conversation.</p>
            </div>
            <div className="explore-card">
              <div className="glyph"></div>
              <h3>Integration</h3>
              <p>Bring together spirit, sexuality, emotion, and embodiment, so they stop operating like four separate apps that never sync.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust">
        <div className="wrap trust-grid">
          <div>
            <h4>What happens in the Room</h4>
            <p>Your reflections, posts, and connection preferences are visible only to other members, never to the public, never indexed, never screenshotted into a brand deck.</p>
          </div>
          <div>
            <h4>Real members, not avatars</h4>
            <p>This is a beta community we&apos;re building deliberately. We&apos;d rather grow slowly with real people than fast with placeholder faces.</p>
          </div>
          <div>
            <h4>Guided, not algorithmic</h4>
            <p>Matching and structured conversations are guided by the EROS Method, not a swipe deck. You&apos;re here to connect, not to shop.</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="wrap">
          <h2>Ready when you are.</h2>
          <p>No countdown timer, no &quot;spots filling fast.&quot; Come in when it feels right.</p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link href="/auth?mode=member" className="btn-primary">Enter the Community</Link>
            <Link href="https://trevorjamesla.as.me/free-consult" className="link-secondary">Free Consultation →</Link>
          </div>
        </div>
      </section>

      <footer>
        <p>&copy; 2026 Trevor James LLC. All rights reserved. | Based in Hollywood, Los Angeles</p>
        <p className="links"><Link href="https://www.trevorjamesla.com">Main Website</Link> · Built with care for authentic connection</p>
      </footer>
    </>
  );
}
