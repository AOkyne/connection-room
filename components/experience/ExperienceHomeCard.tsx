"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { experienceApi } from "@/lib/experience/client";

// A modest home-screen pointer to "Your Experience Wanted": the newest
// conversation still waiting for its first responses, if any. Renders
// nothing until there's at least one conversation.
export function ExperienceHomeCard() {
  const [question, setQuestion] = useState<{ id: string; text: string; responses: number } | null>(null);

  useEffect(() => {
    experienceApi.overview().then((r) => {
      const open = (r.data?.questions || []).filter((q) => q.status === "open" && !q.viewerIsAuthor);
      if (open.length === 0) return;
      const pick = [...open].sort((a, b) => a.responseCount - b.responseCount)[0];
      setQuestion({ id: pick.id, text: pick.text, responses: pick.responseCount });
    });
  }, []);

  if (!question) return null;

  return (
    <Card className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6f47]">Your Experience Wanted</p>
      <p className="text-lg text-[#1a0f0a]">{question.text}</p>
      <p className="text-sm text-[#6b6460]">
        {question.responses === 0 ? "No one has shared yet." : `${question.responses} ${question.responses === 1 ? "member has" : "members have"} shared.`}{" "}
        Something you&apos;ve lived through might help.
      </p>
      <div className="flex gap-4 text-sm">
        <Link href={`/app/experience/${question.id}`} className="text-[#8b6f47] font-medium hover:underline">
          Read &amp; respond
        </Link>
        <Link href="/app/experience" className="text-[#a0704a] hover:underline">
          All conversations
        </Link>
      </div>
    </Card>
  );
}
