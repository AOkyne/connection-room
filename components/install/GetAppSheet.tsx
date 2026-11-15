"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useInstallState } from "@/lib/pwa/install";
import { InstallSteps } from "./InstallSteps";

// In-page sheet with the install steps for this device (no native dialogs:
// they misbehave in Safari).
export function GetAppSheet({ onClose }: { onClose: () => void }) {
  const { platform, canPrompt } = useInstallState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPhone = platform !== "desktop" && platform !== "mac-safari";

  // Rendered into <body> with its own spacing, so the page it opens from
  // (e.g. the landing page's CSS reset and centred hero) can't restyle it.
  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/40 text-left"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-app-title"
    >
      <div
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#fdfbf7] flex flex-col gap-5 shadow-xl"
        style={{ padding: "24px 24px max(24px, env(safe-area-inset-bottom))", lineHeight: 1.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <img src="/icons/apple-touch-icon.png" alt="" width={56} height={56} className="rounded-2xl border border-[#e8e3db]" />
          <div className="flex-1">
            <h2 id="get-app-title" className="text-2xl font-semibold text-[#1a0f0a]" style={{ fontFamily: "var(--font-serif)", margin: 0 }}>
              Get the app
            </h2>
            <p className="text-sm text-[#6b6460]">
              {onPhone ? "Keep The Connection Room on your home screen, one tap away." : "Keep The Connection Room one click away."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-[#6b6460]" style={{ padding: "0 4px" }}>
            ×
          </button>
        </div>
        <InstallSteps platform={platform} canPrompt={canPrompt} />
        <p className="text-xs text-[#6b6460]">
          It’s free, takes a few seconds, and needs no app store. It opens full-screen, like any other app.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full font-semibold bg-[#f3ede5] text-[#8b6f47]"
          style={{ padding: "12px 0" }}
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}
