"use client";

import { useEffect, useState } from "react";
import {
  getPollResults,
  submitPollVote,
  submitPollVotes,
  type Poll,
  type PollResultOption,
} from "@/lib/data/polls";

interface PollCardProps {
  poll: Poll;
}

// Before voting: a single-choice poll shows every option as a one-tap
// button; a multiple-choice poll ("choose all that apply", migration 101)
// shows checkboxes plus a Submit button. After voting (or on a repeat
// visit): a percentage bar per option -- percent of the members who
// answered, so a multiple-choice poll can add up to more than 100% --
// with the member's own choices highlighted and a "Change your vote" link
// back to the voting view. Both RPCs replace the member's previous answer
// rather than erroring or duplicating it.
export function PollCard({ poll }: PollCardProps) {
  const [results, setResults] = useState<PollResultOption[] | null>(null);
  const [voting, setVoting] = useState(false);
  const [changingVote, setChangingVote] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPollResults(poll.id).then((fresh) => {
      setResults(fresh);
      setSelected(new Set(fresh.filter((r) => r.isMyVote).map((r) => r.optionId)));
    });
  }, [poll.id]);

  const hasVoted = !!results?.some((r) => r.isMyVote);
  const voterCount = results?.[0]?.voterCount || 0;

  const finishVote = async (ok: boolean) => {
    if (ok) {
      const fresh = await getPollResults(poll.id);
      setResults(fresh);
      setSelected(new Set(fresh.filter((r) => r.isMyVote).map((r) => r.optionId)));
      setChangingVote(false);
    }
    setVoting(false);
  };

  const handleVote = async (optionId: string) => {
    setVoting(true);
    await finishVote(await submitPollVote(poll.id, optionId));
  };

  const handleSubmitMultiple = async () => {
    if (selected.size === 0) return;
    setVoting(true);
    await finishVote(await submitPollVotes(poll.id, Array.from(selected)));
  };

  const toggle = (optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  return (
    <div className="border border-[#e8ddd2] rounded-lg p-4 bg-white space-y-3">
      <div>
        <p className="font-medium text-[#1a0f0a]">{poll.question}</p>
        {poll.allowMultiple && <p className="text-xs text-[#a0704a] mt-0.5">Choose all that apply</p>}
      </div>

      {hasVoted && !changingVote ? (
        <div className="space-y-2">
          {(results || []).map((r) => {
            const pct = voterCount > 0 ? Math.round((r.voteCount / voterCount) * 100) : 0;
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
            <span>
              {voterCount} {voterCount === 1 ? "person" : "people"} voted
            </span>
            <button onClick={() => setChangingVote(true)} className="text-[#d4a348] hover:underline">
              Change your vote
            </button>
          </div>
        </div>
      ) : poll.allowMultiple ? (
        <div className="space-y-2">
          {poll.options.map((option) => (
            <label
              key={option.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selected.has(option.id) ? "border-[#d4a348] bg-[#fdfaf5]" : "border-[#e8ddd2] hover:bg-[#f3ede5]"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(option.id)}
                onChange={() => toggle(option.id)}
                disabled={voting}
                className="w-4 h-4 accent-[#d4a348]"
              />
              <span className="text-[#1a0f0a]">{option.label}</span>
            </label>
          ))}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmitMultiple}
              disabled={voting || selected.size === 0}
              className="px-4 py-2 rounded-lg bg-[#B8892F] text-white text-sm font-semibold disabled:opacity-50"
            >
              {voting ? "Saving..." : "Submit"}
            </button>
            {changingVote && (
              <button onClick={() => setChangingVote(false)} className="text-xs text-[#a0704a] hover:underline">
                Cancel
              </button>
            )}
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
