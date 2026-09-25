"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listPollResults, type AdminPollResult } from "@/lib/admin/polls";
import { Card } from "@/components/Card";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";

// Every poll (broadcast and space), newest first, with totals per option.
// Counts only -- individual ballots are never shown, anywhere in the app.
// Percentages are "% of people who voted", so a multiple-choice poll's can
// add up to more than 100%.
export default function AdminPollsPage() {
  const router = useRouter();
  const [polls, setPolls] = useState<AdminPollResult[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      const result = await listPollResults();
      if (result.error) setError(result.error);
      setPolls(result.polls);
    };
    init();
  }, [router]);

  if (!polls) return <LoadingScreen message="Loading poll results" subtitle="Just a moment..." />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", href: "/app/admin" }, { label: "Poll Results" }]} />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Poll Results</h1>
        <p className="text-[#a0704a] mt-1">
          Every poll you&apos;ve run, newest first. Totals only; individual votes stay private.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {polls.length === 0 && !error && (
        <Card>
          <p className="text-[#1a0f0a]">No polls yet. Add one to a broadcast email with the 📊 Poll button.</p>
        </Card>
      )}

      {polls.map((poll) => {
        const leader = Math.max(0, ...poll.options.map((o) => o.voteCount));
        return (
          <Card key={poll.id} className="space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[#1a0f0a]">{poll.question}</p>
              <p className="text-xs text-[#a0704a]">
                {new Date(poll.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {poll.spaceId ? (
                  <Link href={`/app/spaces/${poll.spaceId}`} className="underline hover:text-[#8b6f47]">
                    Also in {poll.spaceName}
                  </Link>
                ) : (
                  "Email only"
                )}
                {poll.allowMultiple && " · Multiple answers allowed"}
              </p>
            </div>

            <div className="space-y-3">
              {poll.options.map((o) => {
                const pct = poll.voterCount > 0 ? Math.round((o.voteCount / poll.voterCount) * 100) : 0;
                const isLeader = o.voteCount > 0 && o.voteCount === leader;
                return (
                  <div key={o.id}>
                    <div className="flex justify-between gap-3 text-sm mb-1">
                      <span className={isLeader ? "font-semibold text-[#1a0f0a]" : "text-[#1a0f0a]"}>{o.label}</span>
                      <span className="text-[#a0704a] whitespace-nowrap">
                        {o.voteCount} vote{o.voteCount === 1 ? "" : "s"} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#f3ede5] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isLeader ? "bg-[#d4a348]" : "bg-[#e8ddd2]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-[#1a0f0a]">
              <strong>{poll.voterCount}</strong> {poll.voterCount === 1 ? "person" : "people"} voted
            </p>
          </Card>
        );
      })}
    </div>
  );
}
