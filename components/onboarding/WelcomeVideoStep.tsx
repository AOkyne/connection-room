"use client";

import { useEffect, useRef } from "react";
import type { Profile } from "@/lib/data/profiles";

// YouTube video ID for Trevor's welcome video (from https://youtu.be/bbUOT_Mudw8).
const WELCOME_VIDEO_ID = "bbUOT_Mudw8";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface WelcomeVideoStepProps {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => Promise<void> | void;
  onEnter: () => void;
}

export function WelcomeVideoStep({ profile, onUpdate, onEnter }: WelcomeVideoStepProps) {
  const playerRef = useRef<any>(null);
  const watchedRef = useRef(profile.welcomeVideoWatched || false);

  // Watching is entirely optional and never blocks onboarding. This just
  // best-effort records that the video played to the end, for our own
  // visibility into whether the welcome video is landing with members.
  useEffect(() => {
    if (!WELCOME_VIDEO_ID || watchedRef.current) return;

    const markWatched = () => {
      if (watchedRef.current) return;
      watchedRef.current = true;
      onUpdate({ welcomeVideoWatched: true, welcomeVideoWatchedAt: new Date() });
    };

    const createPlayer = () => {
      if (!window.YT || !document.getElementById("tcr-welcome-video")) return;
      playerRef.current = new window.YT.Player("tcr-welcome-video", {
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              markWatched();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const existing = document.getElementById("youtube-iframe-api");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        createPlayer();
      };
    }

    return () => {
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionPad = { padding: "32px 20px" };

  return (
    <div className="tcr-page" style={{ background: "transparent" }}>
      <section className="section section--center" style={{ ...sectionPad, paddingBottom: 0 }}>
        <p className="eyebrow">Welcome to The Connection Room</p>
        <h1 style={{ fontSize: 32 }}>You made it through the door.</h1>
        <p className="lede">That&rsquo;s not a small thing.</p>
      </section>

      <section style={{ padding: "24px 20px" }}>
        <div className="video-frame">
          {WELCOME_VIDEO_ID ? (
            <iframe
              id="tcr-welcome-video"
              src={`https://www.youtube.com/embed/${WELCOME_VIDEO_ID}?enablejsapi=1`}
              title="Welcome video from Trevor James"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="video-placeholder">
              <div className="video-placeholder__inner">
                <div className="video-placeholder__play">
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
                    <polygon points="0,0 20,11 0,22" fill="#F7F1E3" />
                  </svg>
                </div>
                <div className="video-placeholder__label">Welcome video from Trevor James</div>
                <div className="video-placeholder__sub">Coming soon</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section--center" style={sectionPad}>
        <p className="eyebrow">First, a little honesty</p>
        <h2 style={{ fontSize: 24 }}>
          Most men spend years circling connection without ever stepping fully into it.
        </h2>
        <p className="pull-line">Staying busy. Staying guarded. Staying &ldquo;fine.&rdquo;</p>
        <p className="measure-narrow">
          The fact that you&rsquo;re here means some part of you is ready for something different.
          We built this room for that part of you.
        </p>
      </section>

      <section className="section--alt section--center" style={{ ...sectionPad, borderRadius: "var(--tcr-radius-lg)" }}>
        <p className="eyebrow">Let&rsquo;s be clear</p>
        <h2 style={{ fontSize: 24 }}>What this room is. And what it isn&rsquo;t.</h2>
        <p className="measure-narrow">
          This isn&rsquo;t a dating app, and it isn&rsquo;t a forum you scroll through and disappear
          from. It&rsquo;s a space, and like any space worth entering, it works best when you show up
          as yourself and let it work on you.
        </p>
        <div className="callout" style={{ margin: "24px auto 0" }}>
          <p>
            This room lives online because that&rsquo;s how we stay connected in between the moments
            that matter most. But it&rsquo;s a bridge, not a destination. The real work, the kind
            that actually changes how you move through the world, happens when you&rsquo;re sitting
            across from another man, not scrolling past his name. As you get settled, keep an eye out
            for calls, workshops, and gatherings where that can happen with intention, not by
            accident.
          </p>
        </div>
      </section>

      <section className="section--center" style={sectionPad}>
        <p className="eyebrow">Wherever you&rsquo;re starting from</p>
        <p className="measure-narrow">
          Whether you&rsquo;re just beginning to explore what real intimacy and connection could look
          like in your life, or you&rsquo;re already deep in the work through one of our coaching
          programs, you belong here.
        </p>
        <p className="stack-lines" style={{ fontSize: 22 }}>
          Some of you are arriving grounded.
          <br />
          Some of you are arriving in motion.
          <br />
          <span className="final">All of you are arriving with intention.</span>
        </p>
        <p className="measure-narrow" style={{ marginTop: 4 }}>
          Before you go further, three things are worth a few minutes of your time.
        </p>
      </section>

      <section style={{ padding: "0 20px 24px" }}>
        <div className="link-cards" style={{ gridTemplateColumns: "1fr" }}>
          <a className="link-card" href="/philosophy" target="_blank" rel="noopener noreferrer">
            <div className="link-card__title">The Connection Room Philosophy</div>
            <div className="link-card__desc">
              Why this space exists, and what we believe about men, touch, and connection.
            </div>
            <div className="link-card__cta">Read the Philosophy &rarr;</div>
          </a>
          <a className="link-card" href="/house-rules" target="_blank" rel="noopener noreferrer">
            <div className="link-card__title">House Rules</div>
            <div className="link-card__desc">
              How we hold this space together, and what we ask of each other.
            </div>
            <div className="link-card__cta">Read the House Rules &rarr;</div>
          </a>
          <a className="link-card" href="/faqs" target="_blank" rel="noopener noreferrer">
            <div className="link-card__title">FAQs</div>
            <div className="link-card__desc">Practical answers about how the community works.</div>
            <div className="link-card__cta">Read the FAQs &rarr;</div>
          </a>
        </div>
      </section>

      <section style={{ padding: "0 20px 24px" }}>
        <div className="panel-dark">
          <p className="quote" style={{ fontSize: 20 }}>
            &ldquo;Take your time with those. Then come in, look around, and introduce yourself. Not
            with a highlight reel, just with where you actually are. We&rsquo;re glad you&rsquo;re
            here.&rdquo;
          </p>
          <div className="attribution">
            <div className="avatar">TJ</div>
            <span>&mdash; Trevor James</span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button type="button" className="btn btn--primary" onClick={onEnter}>
            Enter the Community
          </button>
        </div>
      </section>
    </div>
  );
}
