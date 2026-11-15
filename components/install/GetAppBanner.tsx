"use client";

import { useState } from "react";
import { useInstallState } from "@/lib/pwa/install";
import { GetAppButton } from "./GetAppButton";

// A warm card at the top of the members' home page inviting them to put
// The Connection Room on their phone. "Not now" hides it for two weeks;
// the Get the app button in the header stays either way.

const KEY = "tcr-get-app-banner-hidden-until";
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

export function GetAppBanner({ dismissible = true }: { dismissible?: boolean }) {
  const install = useInstallState();
  const [hidden, setHidden] = useState(() => {
    try {
      return typeof window !== "undefined" && Number(localStorage.getItem(KEY) || 0) > Date.now();
    } catch {
      return false;
    }
  });
  if (!install.ready || install.installed || (dismissible && hidden)) return null;

  const notNow = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + TWO_WEEKS));
    } catch {
      // storage unavailable: it simply hides for this visit
    }
    setHidden(true);
  };

  const onPhone = install.platform !== "desktop" && install.platform !== "mac-safari";

  return (
    <div className="rounded-2xl border border-[#ecd9b0] bg-gradient-to-br from-[#fbf3e2] to-[#fdfbf7] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <img src="/icons/apple-touch-icon.png" alt="" width={64} height={64} className="rounded-2xl border border-[#ecd9b0] shrink-0" />
      <div className="flex-1 space-y-1">
        <h2 className="text-xl font-semibold text-[#1a0f0a]" style={{ fontFamily: "var(--font-serif)" }}>
          {onPhone ? "Put The Connection Room on your phone" : "Get The Connection Room app"}
        </h2>
        <p className="text-sm text-[#6b6460]">
          One tap from your home screen, full-screen like any other app. Free, no app store, takes a few seconds.
        </p>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <GetAppButton variant="solid" />
        {dismissible && (
          <button type="button" onClick={notNow} className="text-sm text-[#6b6460] underline">
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
