"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/lib/supabase/client";
import { getPollResults, type PollResultOption } from "@/lib/data/polls";

// Reachable from an email poll link's vote redirect, or directly. Sits
// under app/app/*, so the shared layout (app/app/layout.tsx) already
// handles "not signed in -> /auth?next=/app/polls/{id} -> back here on
// success" generically -- the exact same mechanism the newsletter
// deep-link post page relies on, no custom redirect logic needed here.
export default function PollResultsPage() {
  const params = useParams();
  const pollId = params?.id as string;

  const [question, setQuestion] = useState<string | null>(null);
  const [results, setResults] = useState<PollResultOption[] | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !pollId) {
        setNotFound(true);
        return;
      }

      const { data: poll } = await supabase.from("polls").select("question, post_id").eq("id", pollId).maybeSingle();
      if (!poll) {
        setNotFound(true);
        return;
      }
      setQuestion(poll.question);
      setPostId(poll.post_id);

      if (poll.post_id) {
        const { data: post } = await supabase.from("posts").select("space_id").eq("id", poll.post_id).maybeSingle();
        setSpaceId(post?.space_id || null);
      }

      setResults(await getPollResults(pollId));
    };

    load();
  }, [pollId]);

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-4">
        <p className="text-[#1a0f0a]">This poll could not be found.</p>
        <Link href="/app">
          <Button variant="outline">Back to the app</Button>
        </Link>
      </div>
    );
  }

  if (!question || !results) {
    return <LoadingScreen message="Loading poll results" subtitle="Just a moment..." />;
  }

  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader title="Poll Results" />
        <p className="text-lg font-medium text-[#1a0f0a] mb-4">{question}</p>
        <div className="space-y-3">
          {results.map((r) => {
            const pct = totalVotes > 0 ? Math.round((r.voteCount / totalVotes) * 100) : 0;
            return (
              <div key={r.optionId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={r.isMyVote ? "font-semibold text-[#1a0f0a]" : "text-[#1a0f0a]"}>
                    {r.label}
                    {r.isMyVote && " ✓ (your vote)"}
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
        </div>
        <p className="text-xs text-[#a0704a] mt-4">
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </p>
      </Card>

      {postId && spaceId && (
        <Link href={`/app/spaces/${spaceId}/posts/${postId}`}>
          <Button variant="outline" className="w-full">
            View this in the space
          </Button>
        </Link>
      )}
    </div>
  );
}
