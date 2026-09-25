"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/lib/supabase/client";
import { getPollById, type Poll } from "@/lib/data/polls";
import { PollCard } from "@/components/spaces/PollCard";

// Reachable from an email poll link's vote redirect, or directly. Sits
// under app/app/*, so the shared layout (app/app/layout.tsx) already
// handles "not signed in -> /auth?next=/app/polls/{id} -> back here on
// success" generically -- the exact same mechanism the newsletter
// deep-link post page relies on, no custom redirect logic needed here.
export default function PollResultsPage() {
  const params = useParams();
  const pollId = params?.id as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !pollId) {
        setNotFound(true);
        return;
      }

      const loaded = await getPollById(pollId);
      if (!loaded) {
        setNotFound(true);
        return;
      }

      if (loaded.postId) {
        const { data: post } = await supabase.from("posts").select("space_id").eq("id", loaded.postId).maybeSingle();
        setSpaceId(post?.space_id || null);
      }
      setPoll(loaded);
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

  if (!poll) {
    return <LoadingScreen message="Loading poll results" subtitle="Just a moment..." />;
  }

  // Same card as in Spaces: shows the results with the member's own
  // answers ticked, and lets them change their vote -- the only way to
  // remove an answer on a multiple-choice poll voted from email, where
  // every tap adds one.
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader title="Poll Results" />
        <PollCard poll={poll} />
      </Card>

      {poll.postId && spaceId && (
        // The space itself, not the post's page -- that page redirects
        // poll posts back here.
        <Link href={`/app/spaces/${spaceId}`}>
          <Button variant="outline" className="w-full">
            View this in the space
          </Button>
        </Link>
      )}
    </div>
  );
}
