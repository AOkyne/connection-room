"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, getProfilePhoto, type Profile } from "@/lib/data/profiles";
import { getSpaces } from "@/lib/data/spaces";
import { getTodaysPrompt } from "@/lib/data/recommendations";
import { createPost } from "@/lib/data/posts";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Breadcrumb } from "@/components/Breadcrumb";
import Link from "next/link";
import { PublicReflectionFeedback } from "@/components/feedback";

export default function ReflectPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [spaces, setSpaces] = useState<any[]>([]);
  const [todaysPrompt, setTodaysPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reflectionShared, setReflectionShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const p = await getProfile();
        if (!p) {
          router.push("/auth");
          return;
        }
        setProfile(p);
        getProfilePhoto().then(setProfilePhoto);

        const s = await getSpaces();
        setSpaces(s);
        if (s.length > 0) {
          setSelectedSpaceId(s[0].id);
        }

        const prompt = getTodaysPrompt();
        setTodaysPrompt(prompt);

        setMounted(true);
      } catch (error) {
        console.error("Error loading data:", error);
        setMounted(true);
      }
    };

    loadData();
  }, [router]);

  if (!mounted || !profile) {
    return <div className="p-4">Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim() || !selectedSpaceId) return;

    // Same rationale as the space page's post/comment gate: a member who
    // never finished onboarding still has profile.displayName set to their
    // raw email prefix, and nothing else here stops them from posting
    // under that placeholder name.
    if (!profile.firstName?.trim() || !profile.lastName?.trim()) {
      setError("Add your first and last name to your profile before posting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createPost(
        selectedSpaceId,
        profile.displayName,
        response,
        true,
        undefined,
        profile.pronouns,
        profilePhoto || profile.profilePhoto
      );
      setReflectionShared(true);
    } catch (error) {
      console.warn("Error creating post:", error);
      setError("Failed to post your response. Please try again.");
      setSubmitting(false);
    }
  };

  if (reflectionShared) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PublicReflectionFeedback
          spaceId={selectedSpaceId}
          onClose={() => router.push("/app")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "Respond to Prompt", isActive: true },
        ]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl text-[#1a0f0a] mb-2">Respond to Today's Prompt</h1>
            <p className="text-[#1a0f0a]">Share your thoughts on today's reflection.</p>
          </div>

          <div className="bg-[#f3ede5] rounded-lg p-4">
            <p className="text-[#1a0f0a] italic text-lg">"{todaysPrompt}"</p>
            <p className="text-sm text-[#c97a2a] mt-3">A sentence or two is enough. No need to write a memoir unless the memoir insists.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a0f0a] mb-2">
                Your Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a348] text-[#1a0f0a] bg-white"
                rows={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a0f0a] mb-2">
                Share in Space
              </label>
              <select
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                className="w-full px-4 py-3 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a348] text-[#1a0f0a] bg-white"
                required
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/app" className="flex-1">
                <Button variant="outline" size="md" className="">
                  Cancel
                </Button>
              </Link>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={submitting || !response.trim() || !selectedSpaceId}
                className="flex-1"
              >
                {submitting ? "Posting..." : "Post Response"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
