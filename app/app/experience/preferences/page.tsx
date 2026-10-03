"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { experienceApi, type TopicOption } from "@/lib/experience/client";

// Question invitation preferences: topics (general ones by default;
// sensitive topics only if chosen here), pause/resume, or stop entirely.
// Nothing here is inferred from what a member reads or writes.
export default function ExperiencePreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [paused, setPaused] = useState(false);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [notificationsOff, setNotificationsOff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const r = await experienceApi.preferences();
      if (r.data) {
        setTopics(r.data.topics);
        setOptedOut(r.data.prefs.optedOut);
        setPaused(r.data.prefs.paused);
        setTimezone(r.data.prefs.timezone);
        setNotificationsOff(r.data.notificationsOff);
        if (r.data.prefs.topics === null) {
          setSelected(new Set(r.data.topics.filter((t) => !t.sensitive).map((t) => t.slug)));
        } else {
          setCustom(true);
          setSelected(new Set(r.data.prefs.topics));
        }
      } else {
        setMessage(r.error || "Couldn't load your preferences.");
      }
      setLoading(false);
    })();
  }, []);

  const toggle = (slug: string) => {
    setCustom(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const save = async (overrides: Partial<{ optedOut: boolean; paused: boolean }> = {}) => {
    setSaving(true);
    setMessage("");
    const next = { optedOut, paused, ...overrides };
    const r = await experienceApi.savePreferences({
      optedOut: next.optedOut,
      paused: next.paused,
      topics: custom ? [...selected] : null,
      timezone: timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone ?? null),
    });
    setSaving(false);
    if (r.error) {
      setMessage(r.error);
      return;
    }
    setOptedOut(next.optedOut);
    setPaused(next.paused);
    setMessage("Saved.");
  };

  if (loading) return <LoadingScreen message="Loading your preferences" subtitle="Just a moment..." />;

  const general = topics.filter((t) => !t.sensitive);
  const sensitive = topics.filter((t) => t.sensitive);

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "Your Experience Wanted", href: "/app/experience" },
          { label: "Invitation settings", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Question invitations</h1>
        <p className="text-[#6b6460] mt-2">
          Now and then we may email you a question other members are sharing experiences about, at most once a month.
          You can always read and join conversations in the app, whether or not you get these emails.
        </p>
      </div>

      {notificationsOff && (
        <Card>
          <p className="text-sm text-[#1a0f0a]">
            Your app notification emails are turned off, so you won&apos;t get question invitations either. You can
            change that on your <Link href="/app/profile" className="underline">profile</Link>.
          </p>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1a0f0a]">Status</h2>
        {optedOut ? (
          <>
            <p className="text-sm text-[#1a0f0a]">You&apos;ve unsubscribed from question invitations.</p>
            <Button size="sm" variant="primary" disabled={saving} onClick={() => save({ optedOut: false, paused: false })}>
              Turn invitations back on
            </Button>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ paused: !paused })}>
              {paused ? "Resume invitations" : "Pause invitations"}
            </Button>
            <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ optedOut: true })}>
              Unsubscribe
            </Button>
            {paused && <p className="text-sm text-[#a0704a] w-full">Paused: you won&apos;t get invitations until you resume.</p>}
          </div>
        )}
      </Card>

      {!optedOut && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a0f0a]">Topics</h2>
            <p className="text-sm text-[#6b6460]">
              Invitations only come from topics you have selected. More personal topics are never sent unless you
              choose them.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {general.map((t) => (
              <label key={t.slug} className="flex items-center gap-2 text-sm text-[#1a0f0a]">
                <input type="checkbox" checked={selected.has(t.slug)} onChange={() => toggle(t.slug)} className="w-4 h-4" />
                {t.label}
              </label>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-[#1a0f0a]">More personal topics (only if you choose them)</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {sensitive.map((t) => (
                <label key={t.slug} className="flex items-center gap-2 text-sm text-[#1a0f0a]">
                  <input type="checkbox" checked={selected.has(t.slug)} onChange={() => toggle(t.slug)} className="w-4 h-4" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <Button size="sm" variant="primary" disabled={saving} onClick={() => save()}>
            {saving ? "Saving..." : "Save topics"}
          </Button>
        </Card>
      )}

      {message && <p className="text-sm text-[#8b6f47]">{message}</p>}
    </div>
  );
}
