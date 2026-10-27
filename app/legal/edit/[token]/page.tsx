import type { Metadata } from "next";
import { LegalWorkspace } from "@/components/legal/LegalWorkspace";

// Private edit link for an outside reviewer (e.g. the lawyer): no account
// needed. The token is checked by every /api/legal call; edits are tracked
// under the name the link was made for, and only an admin can publish.

export const metadata: Metadata = {
  title: "Legal pages — The Connection Room",
  robots: { index: false, follow: false },
};

export default async function LegalEditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="min-h-dvh bg-[#faf6f1]">
      <header className="border-b border-[#e8ddd2] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <img src="/connection-room-logo.svg" alt="The Connection Room" className="h-9 w-auto" />
          <span className="text-sm text-[#a0704a]">Terms &amp; Privacy · private editing link</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a0f0a]">Terms of Service &amp; Privacy Policy</h1>
          <p className="text-sm text-[#a0704a] mt-1">
            Edit directly below; changes save automatically under your name. &ldquo;Show changes&rdquo; displays every
            edit since the last published version, and who made it. Nothing goes live until Trevor publishes it.
          </p>
        </div>
        <LegalWorkspace auth={{ kind: "token", token }} />
      </main>
    </div>
  );
}
