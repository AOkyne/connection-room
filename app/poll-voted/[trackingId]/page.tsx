import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thanks for voting — The Connection Room",
  robots: { index: false, follow: false },
};

// Where an email poll vote lands (app/api/email/poll-vote/[trackingId]
// redirects here once the vote is recorded). Deliberately OUTSIDE /app, so
// it needs no sign-in: the vote itself never needed one (it's recorded
// server-side from sent_emails.recipient_user_id), and sending voters to
// the signed-in results page put a login screen between tapping an answer
// and seeing it counted -- and on phones, where email links open in a
// browser that isn't signed in, that was nearly everyone.
//
// The tracking id in the URL is the same per-recipient token the vote link
// itself carries, so this page shows nothing that link didn't already
// grant: aggregate counts (never who voted for what) plus the recipient's
// own answers.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface VotedPoll {
  pollId: string;
  question: string;
  allowMultiple: boolean;
  voterCount: number;
  options: { id: string; label: string; voteCount: number; isMine: boolean }[];
}

async function loadVotedPoll(trackingId: string, pollId: string): Promise<VotedPoll | null> {
  if (!UUID_RE.test(trackingId) || !UUID_RE.test(pollId)) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);

  const [{ data: sentEmail }, { data: poll }, { data: options }, { data: votes }] = await Promise.all([
    supabase.from("sent_emails").select("recipient_user_id").eq("id", trackingId).maybeSingle(),
    supabase.from("polls").select("id, question, allow_multiple").eq("id", pollId).maybeSingle(),
    supabase.from("poll_options").select("id, label, position").eq("poll_id", pollId).order("position"),
    supabase.from("poll_votes").select("option_id, user_id").eq("poll_id", pollId),
  ]);

  const recipientId = sentEmail?.recipient_user_id;
  if (!recipientId || !poll) return null;

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  const voters = new Set<string>();
  for (const v of votes || []) {
    counts.set(v.option_id, (counts.get(v.option_id) || 0) + 1);
    voters.add(v.user_id);
    if (v.user_id === recipientId) mine.add(v.option_id);
  }

  return {
    pollId: poll.id,
    question: poll.question,
    allowMultiple: !!poll.allow_multiple,
    voterCount: voters.size,
    options: (options || []).map((o) => ({
      id: o.id,
      label: o.label,
      voteCount: counts.get(o.id) || 0,
      isMine: mine.has(o.id),
    })),
  };
}

export default async function PollVotedPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackingId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { trackingId } = await params;
  const pollParam = (await searchParams).poll;
  const pollId = typeof pollParam === "string" ? pollParam : "";
  const poll = await loadVotedPoll(trackingId, pollId);
  const votedAny = !!poll?.options.some((o) => o.isMine);
  const notChosen = poll?.options.filter((o) => !o.isMine) || [];

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <header className="border-b border-[#e8e3db] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <Link href="/app">
            <img src="/connection-room-logo.svg" alt="The Connection Room" className="h-14 sm:h-20 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md border border-[#e8e3db] space-y-6">
          {!poll ? (
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-bold text-[#1a0f0a]">This poll is no longer available</h1>
              <p className="text-[#6b6460]">It may have been closed or removed. Thanks for wanting to weigh in!</p>
              <Link
                href="/app"
                className="inline-block mt-2 px-6 py-3 rounded-full bg-[#B8892F] text-white font-semibold"
              >
                Open The Connection Room
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-[#1a0f0a]">
                  {votedAny ? "✓ Thanks, your vote is in" : "Poll results"}
                </h1>
                {!votedAny && (
                  <p className="text-sm text-[#6b6460]">We couldn&apos;t record your answer. Please try the link again.</p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-lg font-medium text-[#1a0f0a]">{poll.question}</p>
                {poll.options.map((o) => {
                  const pct = poll.voterCount > 0 ? Math.round((o.voteCount / poll.voterCount) * 100) : 0;
                  return (
                    <div key={o.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={o.isMine ? "font-semibold text-[#1a0f0a]" : "text-[#1a0f0a]"}>
                          {o.label}
                          {o.isMine && " ✓ your answer"}
                        </span>
                        <span className="text-[#a0704a]">{pct}%</span>
                      </div>
                      <div className="h-2 bg-[#f3ede5] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${o.isMine ? "bg-[#d4a348]" : "bg-[#e8ddd2]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-[#a0704a]">
                  {poll.voterCount} {poll.voterCount === 1 ? "person has" : "people have"} voted
                </p>
              </div>

              {poll.allowMultiple && votedAny && notChosen.length > 0 && (
                <div className="space-y-2 border-t border-[#e8e3db] pt-4">
                  <p className="text-sm font-medium text-[#1a0f0a]">Choose all that apply. Tap to add another answer:</p>
                  {notChosen.map((o) => (
                    <a
                      key={o.id}
                      href={`/api/email/poll-vote/${trackingId}?option=${o.id}`}
                      className="block px-4 py-3 rounded-lg border border-[#e8ddd2] bg-[#fffbf7] text-[#1a0f0a] hover:bg-[#f3ede5]"
                    >
                      + {o.label}
                    </a>
                  ))}
                </div>
              )}

              <div className="border-t border-[#e8e3db] pt-4 text-center space-y-2">
                <Link
                  href={`/app/polls/${poll.pollId}`}
                  className="inline-block px-6 py-3 rounded-full bg-[#B8892F] text-white font-semibold"
                >
                  Open The Connection Room
                </Link>
                <p className="text-xs text-[#6b6460]">To change or remove an answer, open the poll in the app.</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
