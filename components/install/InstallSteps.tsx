"use client";

import { useState } from "react";
import type { Platform } from "@/lib/pwa/install";

// Step-by-step "add to your home screen" instructions for the visitor's
// device. Used in the Get the app sheet and on /get-app.

const INK = "#1a0f0a";
const MUTED = "#6b6460";
const GOLD = "#d4a348";

function ShareIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline" style={{ verticalAlign: "-3px", margin: "0 2px" }}>
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline" style={{ verticalAlign: "-3px", margin: "0 2px" }}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function MenuDotsIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill={INK} className="inline" style={{ verticalAlign: "-3px", margin: "0 2px" }}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3 list-none" style={{ padding: 0, margin: 0 }}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: GOLD, color: "#fff" }}
          >
            {i + 1}
          </span>
          <span className="text-[15px] leading-relaxed" style={{ color: INK, paddingTop: 2 }}>
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "https://community.trevorjamesla.com";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked: the address is shown on screen to type instead
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border" style={{ borderColor: "#e8e3db", background: "#fff", padding: "8px 12px" }}>
      <span className="text-sm font-medium break-all" style={{ color: INK }}>
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        onClick={copy}
        className="rounded-full text-sm font-semibold"
        style={{ background: "#f8f6f2", color: "#8b6f47", padding: "4px 12px", marginLeft: "auto" }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function PhoneSteps() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]" style={{ color: MUTED }}>
        On your phone, open this address, sign in, and tap <strong>Get the app</strong>:
      </p>
      <CopyLink />
    </div>
  );
}

export function InstallSteps({ platform, canPrompt }: { platform: Platform; canPrompt?: boolean }) {
  switch (platform) {
    case "ios-safari":
      return (
        <Steps
          items={[
            <>Tap the <strong>Share</strong> button <ShareIcon /> at the bottom of Safari (at the top on iPad).</>,
            <>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquareIcon />.</>,
            <>Tap <strong>Add</strong>. The Connection Room icon appears on your home screen.</>,
          ]}
        />
      );
    case "ios-other":
      return (
        <Steps
          items={[
            <>Tap the <strong>Share</strong> button <ShareIcon /> next to the address bar.</>,
            <>Tap <strong>Add to Home Screen</strong> <PlusSquareIcon /> (you may need to tap <strong>More</strong> first).</>,
            <>Tap <strong>Add</strong>. If you don’t see the option, open this page in <strong>Safari</strong> and try there.</>,
          ]}
        />
      );
    case "in-app":
      return (
        <div className="flex flex-col gap-4">
          <p className="text-[15px]" style={{ color: INK }}>
            You’re inside another app’s browser, which can’t add apps to your phone. Open this page in{" "}
            <strong>Safari</strong> (iPhone) or <strong>Chrome</strong> (Android) first:
          </p>
          <Steps
            items={[
              <>Tap the <strong>⋯</strong> or <MenuDotsIcon /> menu in the corner of this screen.</>,
              <>Choose <strong>Open in Safari</strong> or <strong>Open in browser</strong>.</>,
              <>Tap <strong>Get the app</strong> again there.</>,
            ]}
          />
          <p className="text-sm" style={{ color: MUTED }}>Or copy the link and paste it into Safari or Chrome:</p>
          <CopyLink />
        </div>
      );
    case "android":
      return (
        <Steps
          items={[
            <>Tap the menu <MenuDotsIcon /> at the top right of Chrome (at the bottom in Samsung Internet).</>,
            <>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>,
            <>Tap <strong>Install</strong>. The Connection Room icon appears with your other apps.</>,
          ]}
        />
      );
    case "mac-safari":
      return (
        <div className="flex flex-col gap-5">
          <Steps
            items={[
              <>In the menu bar at the top of your screen, click <strong>File</strong>.</>,
              <>Click <strong>Add to Dock</strong>, then <strong>Add</strong>.</>,
            ]}
          />
          <PhoneSteps />
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-5">
          {!canPrompt && (
            <Steps
              items={[
                <>In Chrome or Edge, click the install icon at the right end of the address bar, or open the menu <MenuDotsIcon />.</>,
                <>Choose <strong>Install The Connection Room</strong> (in Edge: <strong>Apps → Install this site as an app</strong>).</>,
              ]}
            />
          )}
          <PhoneSteps />
        </div>
      );
  }
}
