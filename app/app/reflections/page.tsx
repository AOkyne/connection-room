"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/Card";
import { MyReflectionsPanel } from "@/components/daily-companion/MyReflectionsPanel";
import { getSignedInUserId } from "@/lib/data/journey-store";
import { getJourneyProgress, type JourneyProgress } from "@/lib/data/first-week-journey";
import { getGuidedRhythmProgress, getRhythmContent } from "@/lib/data/guided-rhythm";
import { firstWeekJourney } from "@/lib/content/first-week-journey";
import type { GuidedRhythmProgress, Month } from "@/lib/types/guided-rhythm";

// Every private reflection a member has written, in one place: daily
// reflections from Home, the First Week doors and the Guided Rhythm on My
// Journey. Only the member can see any of it.

interface Entry {
  key: string;
  label: string;
  prompt?: string;
  text: string;
}

const has = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

function doorEntries(p: JourneyProgress | null): Entry[] {
  if (!p) return [];
  const out: Entry[] = [];
  for (const door of firstWeekJourney) {
    const text = (p.privateReflections as Record<string, string>)[String(door.doorNumber)];
    if (has(text)) out.push({ key: `door-${door.doorNumber}`, label: `Door ${door.doorNumber}: ${door.title}`, prompt: door.reflection, text });
  }
  if (has(p.selectedIntention)) out.push({ key: "first-month-intention", label: "Your intention for your first month", text: p.selectedIntention });
  return out;
}

function rhythmEntries(p: GuidedRhythmProgress | null, content: Month[]): Entry[] {
  if (!p) return [];
  const out: Entry[] = [];
  for (const month of content) {
    const m = month.monthNumber;
    for (const week of month.weeks) {
      const text = p.privateReflections[`m${m}w${week.weekNumber}`];
      if (has(text)) out.push({ key: `m${m}w${week.weekNumber}`, label: `Month ${m}, week ${week.weekNumber}: ${week.title}`, prompt: week.privateReflection, text });
    }
    const intention = (p.monthlyIntentions as Record<string, string>)[String(m)];
    if (has(intention)) out.push({ key: `intention-${m}`, label: `Month ${m} intention`, text: intention });
    const integration = (p.monthlyIntegrations as Record<string, string>)[String(m)];
    if (has(integration)) out.push({ key: `integration-${m}`, label: `Month ${m}: looking back`, prompt: month.integration?.prompt, text: integration });
  }
  return out;
}

function EntryList({ entries, empty }: { entries: Entry[]; empty: string }) {
  if (entries.length === 0) return <p className="text-sm text-[#6b6460]">{empty}</p>;
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <Card key={e.key} className="bg-[#f8f6f2]">
          <div className="space-y-2">
            <p className="text-xs text-[#c97a2a] font-semibold uppercase tracking-wide">{e.label}</p>
            {e.prompt && <p className="text-xs text-[#1a0f0a] italic">&ldquo;{e.prompt}&rdquo;</p>}
            <p className="text-sm text-[#1a0f0a] leading-relaxed whitespace-pre-line">{e.text}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function MyPrivateReflectionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [doors, setDoors] = useState<Entry[]>([]);
  const [rhythm, setRhythm] = useState<Entry[]>([]);

  useEffect(() => {
    const init = async () => {
      const [uid, journey, rhythmProgress, content] = await Promise.all([
        getSignedInUserId(),
        getJourneyProgress().catch(() => null),
        getGuidedRhythmProgress().catch(() => null),
        getRhythmContent().catch(() => [] as Month[]),
      ]);
      setUserId(uid);
      setDoors(doorEntries(journey));
      setRhythm(rhythmEntries(rhythmProgress, content));
      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "My Private Reflections", isActive: true },
        ]}
      />

      <div>
        <h1 className="text-4xl font-bold text-[#1a1714]">My Private Reflections</h1>
        <p className="text-lg text-[#6b6460] mt-2">Everything you’ve written privately, in one place. Only you can see this.</p>
      </div>

      {loading ? (
        <p className="text-[#6b6460]">Gathering your reflections…</p>
      ) : (
        <>
          <section className="space-y-3">
            <MyReflectionsPanel
              userId={userId}
              limit={500}
              title="Daily reflections"
              emptyText="Your answers to the daily reflection on the Home page will appear here."
            />
            {!userId && (
              <>
                <h3 className="text-lg font-semibold text-[#1a0f0a]">Daily reflections</h3>
                <p className="text-sm text-[#6b6460]">Sign in to see the daily reflections saved to your account.</p>
              </>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold text-[#1a0f0a]">Your First Week</h3>
              <Link href="/app/journey" className="text-sm font-medium text-[#8b6f47] underline">
                Write or edit on My Journey
              </Link>
            </div>
            <EntryList entries={doors} empty="Reflections you write on the First Week doors (My Journey) will appear here." />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold text-[#1a0f0a]">Your weekly rhythm</h3>
              <Link href="/app/journey" className="text-sm font-medium text-[#8b6f47] underline">
                Write or edit on My Journey
              </Link>
            </div>
            <EntryList entries={rhythm} empty="Your weekly reflections and monthly intentions (My Journey) will appear here." />
          </section>
        </>
      )}
    </div>
  );
}
