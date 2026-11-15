"use client";

import { useState } from "react";
import { promptInstall, useInstallState } from "@/lib/pwa/install";
import { GetAppSheet } from "./GetAppSheet";

// "Get the app": fires the browser's own install prompt where there is one
// (Chrome, Edge, Android), otherwise opens the step-by-step sheet. Hidden
// once the visitor is using the installed app.

export function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </svg>
  );
}

type Variant = "pill" | "sidebar" | "solid" | "plain";

const STYLES: Record<Variant, string> = {
  // Members header: compact gold pill, visible on every screen size.
  pill: "inline-flex items-center gap-1.5 rounded-full bg-[#d4a348] text-white text-sm font-semibold px-3.5 py-2 hover:bg-[#b98c37] transition-colors whitespace-nowrap",
  // Desktop sidebar item, highlighted.
  sidebar: "w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#fbf3e2] text-[#8b6f47] font-semibold hover:bg-[#f5e8cc] transition-colors",
  // Large button for cards and pages.
  solid: "inline-flex items-center justify-center gap-2 rounded-full bg-[#d4a348] text-white font-semibold px-6 py-3 hover:bg-[#b98c37] transition-colors",
  // Unstyled: the caller's className does the styling.
  plain: "",
};

export function GetAppButton({
  variant = "pill",
  label = "Get the app",
  className = "",
  icon = true,
  shortLabel,
}: {
  variant?: Variant;
  label?: string;
  className?: string;
  icon?: boolean;
  /** Shown instead of `label` on phone-width screens, where space is tight. */
  shortLabel?: string;
}) {
  const install = useInstallState();
  const [open, setOpen] = useState(false);
  if (!install.ready || install.installed) return null;

  const onClick = async () => {
    if (install.canPrompt && (await promptInstall())) return;
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={onClick} className={`${STYLES[variant]} ${className}`.trim()}>
        {icon && <PhoneIcon size={variant === "sidebar" ? 20 : 18} />}
        {shortLabel ? (
          <>
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
      {open && <GetAppSheet onClose={() => setOpen(false)} />}
    </>
  );
}
