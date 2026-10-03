import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Question invitations — The Connection Room",
  robots: { index: false, follow: false },
};

// Opened from the "Unsubscribe" link in a question invitation email. No
// sign-in needed; nothing changes until the member presses the button (a
// POST), so email link scanners can't unsubscribe anyone.
export default async function ExperienceUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = typeof params.t === "string" ? params.t : "";
  const done = params.done === "1";

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <header className="border-b border-[#e8e3db] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <img src="/connection-room-logo.svg" alt="The Connection Room" className="h-14 sm:h-20 w-auto" />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md border border-[#e8e3db] space-y-4 text-center">
          {done ? (
            <>
              <h1 className="text-2xl font-bold text-[#1a0f0a]">You won&apos;t get question invitations anymore</h1>
              <p className="text-[#6b6460]">
                This only stops &ldquo;Your Experience Wanted&rdquo; emails. You can still read and join conversations
                in the app, and turn invitations back on any time.
              </p>
              <Link href="/app/experience/preferences" className="inline-block text-[#8b6f47] underline">
                Manage question invitations
              </Link>
            </>
          ) : token ? (
            <>
              <h1 className="text-2xl font-bold text-[#1a0f0a]">Stop question invitations?</h1>
              <p className="text-[#6b6460]">
                You&apos;ll stop getting occasional emails inviting you to share your experience. Other Connection
                Room emails aren&apos;t affected.
              </p>
              <form method="POST" action="/api/experience/unsubscribe">
                <input type="hidden" name="t" value={token} />
                <button type="submit" className="px-6 py-3 rounded-full bg-[#B8892F] text-white font-semibold">
                  Yes, unsubscribe me
                </button>
              </form>
              <p className="text-xs text-[#a0704a]">
                Prefer fewer topics or a pause instead?{" "}
                <Link href="/app/experience/preferences" className="underline">
                  Choose your preferences
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#1a0f0a]">This link isn&apos;t complete</h1>
              <p className="text-[#6b6460]">You can manage question invitations from your account.</p>
              <Link href="/app/experience/preferences" className="inline-block text-[#8b6f47] underline">
                Manage question invitations
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
