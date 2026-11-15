"use client";

import Link from "next/link";
import { promptInstall, useInstallState } from "@/lib/pwa/install";
import { InstallSteps } from "./InstallSteps";
import { PhoneIcon } from "./GetAppButton";

export function GetAppPage() {
  const install = useInstallState();
  const onPhone = install.platform !== "desktop" && install.platform !== "mac-safari";

  return (
    <div className="min-h-dvh bg-[#fdfbf7] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="block mx-auto w-fit">
          <img src="/connection-room-logo.svg" alt="The Connection Room" className="h-24 w-auto" />
        </Link>
        <div className="rounded-3xl border border-[#e8e3db] bg-white p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img src="/icons/apple-touch-icon.png" alt="" width={72} height={72} className="rounded-2xl border border-[#e8e3db]" />
            <div>
              <h1 className="text-3xl font-semibold text-[#1a0f0a]" style={{ fontFamily: "var(--font-serif)" }}>
                Get the app
              </h1>
              <p className="text-sm text-[#6b6460]">Free · no app store · a few seconds</p>
            </div>
          </div>

          {!install.ready ? (
            <p className="text-[#6b6460]">One moment…</p>
          ) : install.installed ? (
            <div className="space-y-4">
              <p className="text-[15px] text-[#1a0f0a]">You’re already using the app. Welcome back.</p>
              <Link href="/app" className="block text-center rounded-full py-3 font-semibold bg-[#d4a348] text-white">
                Open The Connection Room
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[15px] text-[#1a0f0a]">
                {onPhone
                  ? "Add The Connection Room to your home screen. It opens full-screen, one tap away, like any other app."
                  : "Install The Connection Room on this computer, or on your phone."}
              </p>
              {install.canPrompt && (
                <button
                  type="button"
                  onClick={() => promptInstall()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3 font-semibold bg-[#d4a348] text-white"
                >
                  <PhoneIcon /> Install now
                </button>
              )}
              <InstallSteps platform={install.platform} canPrompt={install.canPrompt} />
            </>
          )}
        </div>
        <p className="text-center text-sm text-[#6b6460]">
          Already a member? <Link href="/app" className="underline">Go to The Connection Room</Link>
        </p>
      </div>
    </div>
  );
}
