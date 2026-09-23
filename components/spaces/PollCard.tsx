"use client";

import { useEffect, useState } from "react";
import { getPollResults, submitPollVote, type Poll, type PollResultOption } from "@/lib/data/polls";

interface PollCardProps {
  poll: Poll;
}

// Before voting: every option is a plain clickable button. After voting
// (or on a repeat visit to a poll already voted on): each option shows a
// percentage bar instead, with the member's own choice highlighted and a
// "Change your vote" link that switches back to the button view --
// submitPollVote() is an upsert (migration 099), so re-voting just moves
// the existing vote rather than erroring or duplicating it.
export function PollCard({ poll }: PollCardProps) {
  const [results, setResults] = useState<PollResultOption[] | null>(null);
  const [voting, setVoting] = useState(false);
  const [changingVote, setChangingVote] = useState(false);

  useEffect(() => {
    getPollResults(poll.id).then(setResults);
  }, [poll.id]);

  const hasVoted = !!results?.some((r) => r.isMyVote);
  const totalVotes = results?.reduce((sum, r) => sum + r.voteCount, 0) || 0;

  const handleVote = async (optionId: string) => {
    setVoting(true);
    const ok = await submitPollVote(poll.id, optionId);
    if (ok) {
      const fresh = await getPollResults(poll.id);
      setResults(fresh);
      setChangingVote(false);
    }
    setVoting(false);
  };

  return (
    <div className="border border-[#e8ddd2] rounded-lg p-4 bg-white space-y-3">
      <p className="font-medium text-[#1a0f0a]">{poll.question}</p>

      {hasVoted && !changingVote ? (
        <div className="space-y-2">
          {(results || []).map((r) => {
            const pct = totalVotes > 0 ? Math.round((r.voteCount / totalVotes) * 100) : 0;
            return (
              <div key={r.optionId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={r.isMyVote ? "font-semibold text-[#1a0f0a]" : "text-[#1a0f0a]"}>
                    {r.label}
                    {r.isMyVote && " ✓"}
                  </span>
                  <span className="text-[#a0704a]">{pct}%</span>
                </div>
                <div className="h-2 bg-[#f3ede5] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.isMyVote ? "bg-[#d4a348]" : "bg-[#e8ddd2]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between text-xs text-[#a0704a] pt-1">
            <span>{totalVotes} vote{totalVotes === 1 ? "" : "s"}</span>
            <button onClick={() => setChangingVote(true)} className="text-[#d4a348] hover:underline">
              Change your vote
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voting}
              className="w-full text-left px-3 py-2 rounded-lg border border-[#e8ddd2] text-[#1a0f0a] hover:bg-[#f3ede5] transition-colors disabled:opacity-50"
            >
              {option.label}
            </button>
          ))}
          {changingVote && (
            <button onClick={() => setChangingVote(false)} className="text-xs text-[#a0704a] hover:underline">
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
