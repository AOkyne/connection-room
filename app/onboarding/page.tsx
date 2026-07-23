"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  saveProfile,
  getCoupleProfileFromSupabase,
  saveCoupleProfileToSupabase,
  type Profile,
} from "@/lib/data/profiles";
import { uploadProfilePhoto } from "@/lib/utils/storage";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { IconConnection, IconIntegration, IconProfile, IconCouples, IconReflection } from "@/components/Icons";
import { WelcomeVideoStep } from "@/components/onboarding/WelcomeVideoStep";
import Link from "next/link";

type Step = "welcome" | "agreements" | "member-type" | "basics" | "photo" | "interests" | "connections" | "couples" | "prompt" | "complete";

const ALL_STEPS: Step[] = ["welcome", "agreements", "member-type", "basics", "photo", "interests", "connections", "couples", "prompt", "complete"];

// Not legal-name verification -- just enough to catch the obvious
// non-names (screen handles, placeholders, keyboard mashing) without
// requiring ID checks. A determined user can still fake a plausible-
// looking name; the rest is a community-norms problem, not a code one.
const PLACEHOLDER_NAMES = new Set([
  "test", "asdf", "n/a", "na", "none", "xx", "xxx", "anonymous", "unknown", "idk", "abc", "asd",
]);

function isRealName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) return false;
  if (/^(.)\1*$/.test(trimmed)) return false; // e.g. "aaaa"
  return true;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [coupleMode, setCoupleMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completionSuccess, setCompletionSuccess] = useState(false);
  const [hasAttemptedCompletion, setHasAttemptedCompletion] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [coupleDisplayName, setCoupleDisplayName] = useState("");
  const [coupleGoals, setCoupleGoals] = useState<string[]>([]);

  // Every keystroke on the basics step fires a save; without sequencing,
  // an earlier request (captured before the last few characters were
  // typed) can resolve AFTER a later, more complete one and silently
  // overwrite it -- e.g. a fast-typed last name landing back as "" in the
  // DB even though the browser shows it filled in. Chaining onto this ref
  // guarantees saves land in the order they were queued.
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    const loadProfile = async () => {
      const p = await getProfile();
      if (!p) {
        router.push("/auth");
        setIsLoading(false);
        return;
      }

      setProfile(p);
      if (p.completedOnboarding) {
        router.push("/app");
        setIsLoading(false);
        return;
      }

      // Restore couple mode from the saved member type -- without this, a
      // couple who picked "couple" on the member-type step, then reloaded
      // (or resumed via onboardingStep below) lost coupleMode back to its
      // false default, silently dropping the "couples" step from their
      // flow even though their profile says they're a couple.
      const isCouple = p.memberType === "couple";
      setCoupleMode(isCouple);

      // Resume where they left off instead of always restarting at
      // "welcome" -- see migration 065's comment: combined with
      // app/app/layout.tsx's redirect-to-/onboarding for anyone with
      // completedOnboarding=false, a member who got most of the way
      // through and closed the tab before the final "Enter the Community"
      // click was otherwise sent back to step 1 every time they returned.
      // Only trust a saved step that's actually valid for this member's
      // current couple/individual flow (couples adds a "couples" step
      // between connections and prompt).
      const validSteps = isCouple
        ? ALL_STEPS
        : ALL_STEPS.filter((s) => s !== "couples");
      if (p.onboardingStep && validSteps.includes(p.onboardingStep as Step)) {
        setCurrentStep(p.onboardingStep as Step);
      }

      if (isCouple) {
        const couple = await getCoupleProfileFromSupabase(p.id);
        if (couple) {
          setCoupleDisplayName(couple.coupleDisplayName || "");
          setCoupleGoals(couple.coupleGoals || []);
        }
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-[#d4a348] border-t-transparent rounded-full mx-auto" />
          <p className="text-[#1a0f0a]">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const steps: Step[] = coupleMode
    ? ["welcome", "agreements", "member-type", "basics", "photo", "interests", "connections", "couples", "prompt", "complete"]
    : ["welcome", "agreements", "member-type", "basics", "photo", "interests", "connections", "prompt", "complete"];

  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      const next = steps[nextIndex];
      setCurrentStep(next);
      // Fire-and-forget: don't block navigation on this save, but do
      // persist it so a reload/return resumes here instead of "welcome".
      // Chained onto saveChainRef (via saveProfile with the current, already-
      // known `profile`) rather than a standalone updateProfile() call --
      // updateProfile() does its own independent get-then-merge-then-write,
      // and if that internal fetch ran before an in-flight handleUpdate save
      // (e.g. the photo-confirmation checkbox) had actually committed, it
      // would merge in stale data and write it back, undoing that save the
      // same way the keystroke race did. Confirmed live: a member's photo
      // upload + confirmation was wiped exactly this way, minutes after the
      // keystroke-race fix -- this was the one remaining unchained write.
      const updated = { ...profile, onboardingStep: next };
      const chained = saveChainRef.current.then(() => saveProfile(updated));
      saveChainRef.current = chained;
      chained.catch(() => {});
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prev = steps[prevIndex];
      setCurrentStep(prev);
      const updated = { ...profile, onboardingStep: prev };
      const chained = saveChainRef.current.then(() => saveProfile(updated));
      saveChainRef.current = chained;
      chained.catch(() => {});
    }
  };

  const handleUpdate = async (updates: Partial<Profile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    // saveProfile() directly, not updateProfile() -- `updated` is already
    // the complete profile (every field), so there's no partial update to
    // merge and nothing to gain from updateProfile()'s internal re-fetch
    // (a real network round trip, on every single field edit throughout
    // onboarding, that can time out on a slow/flaky connection -- see
    // saveProfile()'s own comment).
    // Chained onto saveChainRef (not fired independently) so rapid
    // keystrokes' saves can't complete out of order and clobber a newer
    // value with a stale one.
    const chained = saveChainRef.current.then(() => saveProfile(updated));
    saveChainRef.current = chained;
    await chained;
  };

  const handleComplete = async () => {
    if (!profile || isSubmitting || hasAttemptedCompletion) return;

    // Defense in depth: the "basics" step's Continue button already
    // requires both, so the normal linear flow can't reach here without
    // them -- but this is the point where completedOnboarding actually
    // gets set to true, so it shouldn't trust that no other path (a future
    // change to the step order, a resumed/stale session, etc.) could ever
    // reach it with either blank.
    if (!isRealName(profile.firstName) || !isRealName(profile.lastName)) {
      setSubmitError("Please provide a proper first and last name before completing your profile.");
      setCurrentStep("basics");
      return;
    }

    setIsSubmitting(true);
    setHasAttemptedCompletion(true);
    setSubmitError(null);

    try {
      const updated = {
        ...profile,
        completedOnboarding: true,
        onboardingCompletedAt: new Date(),
      };
      // saveProfile() directly, not updateProfile() -- `updated` is
      // already the complete profile, so skip updateProfile()'s internal
      // re-fetch (a network round trip with nothing to gain here, and one
      // more thing that can time out on the single most important save in
      // the whole flow). Chained onto saveChainRef so this can't race
      // ahead of (and then get clobbered by) a still-in-flight keystroke
      // save from the previous step.
      const chained = saveChainRef.current.then(() => saveProfile(updated));
      saveChainRef.current = chained;
      const result = await chained;

      if (!result) {
        throw new Error("Failed to save completion. Please try again.");
      }

      setProfile(updated);
      setCompletionSuccess(true);
      // Screen now stays visible until user clicks a button or "Skip for Now"
    } catch (error) {
      console.error("Onboarding completion error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      setIsSubmitting(false);
      setHasAttemptedCompletion(false);
    }
  };

  const handleNavigateToDestination = (destination: string) => {
    router.push(destination);
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#e8ddd2] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-2 sm:px-6">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="flex items-center">
              <img
                src="/connection-room-logo.svg"
                alt="The Connection Room"
                className="h-20 w-auto"
              />
            </Link>
            {currentStep !== "welcome" && (
              <span className="text-sm text-[#a0704a]">
                Step {currentIndex + 1} of {steps.length}
              </span>
            )}
          </div>
          {currentStep !== "welcome" && (
            <div className="w-full bg-[#e8ddd2] rounded-full h-2">
              <div
                className="bg-[#d4a348] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          {currentStep === "welcome" && (
            <Card>
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-5xl text-[#1a0f0a] mb-2">Welcome to The Connection Room</h2>
                  <p className="text-lg text-[#d4a348] font-medium">A space for authentic connection</p>
                </div>
                <p className="text-lg text-[#1a0f0a] leading-relaxed">
                  We're creating a community of people committed to exploring intimacy, vulnerability, and real connection. Your profile helps us match you with people on the same journey.
                </p>
                <div className="bg-[#f3ede5] p-6 rounded-lg space-y-3">
                  <p className="font-semibold text-[#1a0f0a]">What's ahead:</p>
                  <ul className="text-sm text-[#1a0f0a] space-y-2 text-left">
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4a348]">✓</span>
                      <span>Community agreements (what makes this space safe)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4a348]">✓</span>
                      <span>Your story (who you are and what brings you here)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4a348]">✓</span>
                      <span>Your preferences (how you want to connect)</span>
                    </li>
                  </ul>
                  <p className="text-xs text-[#a0704a] pt-2">⏱️ Takes about 5 minutes</p>
                </div>
                <Button variant="primary" size="lg" onClick={handleNext} className="">
                  Let's Begin
                </Button>
              </div>
            </Card>
          )}

          {currentStep === "agreements" && (
            <Card>
              <CardHeader title="Community Agreements" icon={<IconConnection size={20} />} />
              <div className="space-y-4">
                <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                  <p className="text-[#1a0f0a]">
                    <span className="font-semibold text-[#1a0f0a]">Why this matters:</span> These agreements create the container for real connection. When everyone honors the same values, vulnerability becomes possible.
                  </p>
                </div>
                <p className="text-[#1a0f0a] mb-2">
                  Please read and acknowledge these agreements:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {appConfig.communityAgreements.map((agreement, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[#f3ede5] rounded-lg">
                      <span className="text-[#d4a348]">✓</span>
                      <span className="text-sm text-[#1a0f0a]">{agreement}</span>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-3 p-3 border-2 border-[#d4a348] rounded-lg cursor-pointer mt-4">
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                  <span className="text-[#1a0f0a]">I agree to uphold these agreements</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button variant="primary" size="md" onClick={handleNext} className="flex-1">
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {currentStep === "member-type" && (
            <>
              <div className="animate-in fade-in slide-in-from-top-6 duration-600" style={{ animationDelay: "0ms" }}>
                <Card className="bg-orange-100 border-2 border-orange-400 mb-6">
                  <div className="text-center space-y-3 py-1">
                    <div className="text-4xl animate-bounce">✓</div>
                    <div>
                      <p className="text-lg font-bold text-[#1a0f0a]">You've set the foundation.</p>
                      <p className="text-sm text-[#8b7f77] mt-1">Community agreements create the container for real connection.</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
                <Card>
              <CardHeader title="Who Are You?" icon={<IconProfile size={20} />} />
              <div className="space-y-4">
                <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                  <p className="text-[#1a0f0a]">
                    <span className="font-semibold text-[#1a0f0a]">This helps us:</span> Customize your experience and match you with people in similar situations who understand your journey.
                  </p>
                </div>

                <div className="space-y-3">
                  {appConfig.memberTypeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        handleUpdate({ memberType: option.id });
                        if (option.id === "couple") setCoupleMode(true);
                      }}
                      className={`p-4 text-left rounded-lg border-2 transition-all ${
                        profile.memberType === option.id
                          ? "border-[#d4a348] bg-[#f3ede5]"
                          : "border-[#e8ddd2] hover:border-[#d4a348]"
                      }`}
                    >
                      <p className="font-medium text-[#1a0f0a]">{option.label}</p>
                      <p className="text-sm text-[#1a0f0a] mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  disabled={!profile.memberType}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </Card>
              </div>
            </>
          )}

          {currentStep === "basics" && (
            <>
              <div className="animate-in fade-in slide-in-from-top-6 duration-600" style={{ animationDelay: "0ms" }}>
                <Card className="bg-orange-100 border-2 border-orange-400 mb-6">
                  <div className="text-center space-y-3 py-1">
                    <div className="text-4xl animate-bounce">✓</div>
                    <div>
                      <p className="text-lg font-bold text-[#1a0f0a]">Your path is becoming clear.</p>
                      <p className="text-sm text-[#8b7f77] mt-1">Now we'll learn who you are.</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
                <Card>
              <CardHeader title="Your Profile" icon={<IconIntegration size={20} />} />
              <div className="space-y-4">
                <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                  <p className="text-[#1a0f0a]">
                    <span className="font-semibold text-[#1a0f0a]">This helps us:</span> Understand who you are so we can match you with compatible people and create meaningful connections.
                  </p>
                </div>
                <p className="text-sm text-[#a0704a]">
                  Please use your real first and last name — not a screen name or handle. We don't need a legal name, just a proper one; it's what builds trust in this community.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a0f0a] mb-2">First Name *</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => {
                        const firstName = e.target.value;
                        const displayName = firstName && profile.lastName
                          ? `${firstName} ${profile.lastName[0]}.`
                          : firstName;
                        handleUpdate({ firstName, displayName });
                      }}
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                      placeholder="First name"
                    />
                    {profile.firstName.trim().length > 0 && !isRealName(profile.firstName) && (
                      <p className="text-xs text-red-600 mt-1">Please enter a proper first name.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => {
                        const lastName = e.target.value;
                        const displayName = profile.firstName && lastName
                          ? `${profile.firstName} ${lastName[0]}.`
                          : profile.firstName;
                        handleUpdate({ lastName, displayName });
                      }}
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                      placeholder="Last name"
                    />
                    {profile.lastName.trim().length > 0 && !isRealName(profile.lastName) && (
                      <p className="text-xs text-red-600 mt-1">Please enter a proper last name.</p>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-[#f3ede5] rounded-lg">
                  <p className="text-sm text-[#1a0f0a]">
                    <span className="font-medium">Display name:</span> {profile.displayName || "(Will appear as First L.)"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Pronouns</label>
                    <input
                      type="text"
                      value={profile.pronouns || ""}
                      onChange={(e) => handleUpdate({ pronouns: e.target.value })}
                      placeholder="he/him"
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Location</label>
                    <input
                      type="text"
                      value={profile.location || ""}
                      onChange={(e) => handleUpdate({ location: e.target.value })}
                      placeholder="City, State"
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Age Range</label>
                    <select
                      value={profile.ageRange || ""}
                      onChange={(e) => handleUpdate({ ageRange: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                    >
                      <option value="">Prefer not to say</option>
                      {appConfig.ageRanges.map((range) => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Orientation</label>
                    <select
                      value={profile.orientation || ""}
                      onChange={(e) => handleUpdate({ orientation: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                    >
                      <option value="">Prefer not to say</option>
                      {appConfig.orientations.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Relationship Status</label>
                  <select
                    value={profile.relationshipStatus || ""}
                    onChange={(e) => handleUpdate({ relationshipStatus: e.target.value })}
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  >
                    <option value="">Prefer not to say</option>
                    {appConfig.relationshipStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a0f0a] mb-2">What brought you here?</label>
                  <textarea
                    value={profile.whatBroughtYouHere || ""}
                    onChange={(e) => handleUpdate({ whatBroughtYouHere: e.target.value })}
                    placeholder="Share what drew you to this community..."
                    rows={3}
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a0f0a] mb-2">What are you hoping to find or experience?</label>
                  <textarea
                    value={profile.connectionHoping || ""}
                    onChange={(e) => handleUpdate({ connectionHoping: e.target.value })}
                    placeholder="The kinds of connection or conversations you're looking for..."
                    rows={3}
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Profile tagline (optional)</label>
                  <input
                    type="text"
                    value={profile.profile_tagline || ""}
                    onChange={(e) => handleUpdate({ profile_tagline: e.target.value })}
                    placeholder="A short phrase that captures who you are (e.g., 'Learning to be vulnerable')"
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  disabled={!isRealName(profile.firstName) || !isRealName(profile.lastName)}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </Card>
              </div>
            </>
          )}

          {currentStep === "photo" && (
            <>
              <div className="animate-in fade-in slide-in-from-top-6 duration-600" style={{ animationDelay: "0ms" }}>
                <Card className="bg-orange-100 border-2 border-orange-400 mb-6">
                  <div className="text-center space-y-3 py-1">
                    <div className="text-4xl animate-bounce">✓</div>
                    <div>
                      <p className="text-lg font-bold text-[#1a0f0a]">You're halfway there.</p>
                      <p className="text-sm text-[#8b7f77] mt-1">Thanks for arriving thoughtfully.</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
                <Card>
                  <CardHeader title="Add Your Photo" icon="📸" />
                  <div className="space-y-4">
                    <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                      <p className="text-[#1a0f0a]">
                        <span className="font-semibold text-[#1a0f0a]">Why your photo matters:</span> We need to see your face — it's how trust gets built in this community. A photo of a landscape, a pet, or an avatar doesn't let anyone recognize you.
                      </p>
                    </div>

                    <p className="text-[#1a0f0a]">
                      Share a clear, recent photo where your face is visible. This is essential to our community.
                    </p>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-[#1a0f0a]">
                      Upload your photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPhotoUploadError(null);
                        setIsUploadingPhoto(true);
                        try {
                          // Uploads to Supabase Storage (resized/compressed
                          // client-side first, see lib/utils/image.ts) --
                          // this used to be the single biggest source of
                          // base64 bloat in the profiles table, since this
                          // was the one photo-upload path in the whole app
                          // that never even tried Storage and just stored
                          // the raw file as base64 (migration 064).
                          const { publicUrl, path } = await uploadProfilePhoto(file, profile.id);
                          handleUpdate({ profilePhoto: publicUrl, profilePhotoPath: path });
                        } catch (err) {
                          setPhotoUploadError(err instanceof Error ? err.message : "Failed to upload photo. Please try again.");
                        } finally {
                          setIsUploadingPhoto(false);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-dashed border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                    />
                    <p className="text-xs text-[#a0704a]">JPG, PNG, or GIF. Max 5MB. A clear, recent photo works best.</p>
                    {isUploadingPhoto && <p className="text-xs text-[#a0704a]">Uploading...</p>}
                    {photoUploadError && <p className="text-xs text-red-600">{photoUploadError}</p>}
                  </div>

                  {/* Current Photo Preview */}
                  {profile.profilePhoto && (
                    <div className="mt-6 flex justify-center">
                      <img
                        src={profile.profilePhoto}
                        alt="Your photo preview"
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    </div>
                  )}

                  {/* Photo Confirmation Checkbox */}
                  {profile.profilePhoto && (
                    <div className="mt-6 p-4 bg-[#f3ede5] rounded-lg">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.photo_confirmed || false}
                          onChange={(e) =>
                            handleUpdate({
                              photo_confirmed: e.target.checked,
                              photo_confirmed_at: e.target.checked ? new Date() : undefined,
                            })
                          }
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-sm text-[#1a0f0a]">
                          I confirm this is a current, recognizable photograph of me and that I have permission to use it.
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleNext}
                      disabled={!profile.profilePhoto || !profile.photo_confirmed}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}

          {currentStep === "interests" && (
            <>
              <div className="animate-in fade-in slide-in-from-top-6 duration-600" style={{ animationDelay: "0ms" }}>
                <Card className="bg-orange-100 border-2 border-orange-400 mb-6">
                  <div className="text-center space-y-3 py-1">
                    <div className="text-4xl animate-bounce">✓</div>
                    <div>
                      <p className="text-lg font-bold text-[#1a0f0a]">Your photo is in place.</p>
                      <p className="text-sm text-[#8b7f77] mt-1">A real face helps the room feel more human.</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
                <Card>
                  <CardHeader title="Your Interests" icon={<IconIntegration size={20} />} />
                  <div className="space-y-4">
                    <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                      <p className="text-[#1a0f0a]">
                        <span className="font-semibold text-[#1a0f0a]">This helps us:</span> Connect you with people who share your interests and are exploring similar aspects of intimacy and connection.
                      </p>
                    </div>

                    <p className="text-[#1a0f0a] mb-2">What draws you here? (Select all that apply)</p>
                    <div className="space-y-2">
                      {appConfig.interests.map((interest) => (
                        <label key={interest} className="flex items-center gap-3 p-3 hover:bg-[#f3ede5] rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profile.interests?.includes(interest) || false}
                            onChange={(e) => {
                              const interests = profile.interests || [];
                              const updated = e.target.checked
                                ? [...interests, interest]
                                : interests.filter((i) => i !== interest);
                              handleUpdate({ interests: updated });
                            }}
                            className="w-5 h-5"
                          />
                          <span className="text-[#1a0f0a]">{interest}</span>
                        </label>
                      ))}
                      <div className="border-t border-[#e8ddd2] pt-3 mt-3">
                        <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Other interests?</label>
                        <input
                          type="text"
                          placeholder="Tell us what else draws you..."
                          defaultValue={profile.interests?.find(i => !appConfig.interests.includes(i)) || ""}
                          onChange={(e) => {
                            const interests = profile.interests || [];
                            const otherInterests = interests.filter(i => !appConfig.interests.includes(i));
                            const baseInterests = interests.filter(i => appConfig.interests.includes(i));
                            const updated = e.target.value ? [...baseInterests, e.target.value] : baseInterests;
                            handleUpdate({ interests: updated });
                          }}
                          className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                      Back
                    </Button>
                    <Button variant="primary" size="md" onClick={handleNext} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}

          {currentStep === "connections" && (
            <>
              <div className="animate-in fade-in slide-in-from-top-6 duration-600" style={{ animationDelay: "0ms" }}>
                <Card className="bg-orange-100 border-2 border-orange-400 mb-6">
                  <div className="text-center space-y-3 py-1">
                    <div className="text-4xl animate-bounce">✨</div>
                    <div>
                      <p className="text-lg font-bold text-[#1a0f0a]">You know what draws you.</p>
                      <p className="text-sm text-[#8b7f77] mt-1">Your interests light the way forward.</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
                <Card>
              <CardHeader title="Connections" icon={<IconConnection size={20} />} />
              <div className="space-y-4">
                <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                  <p className="text-[#1a0f0a]">
                    <span className="font-semibold text-[#1a0f0a]">What are connections:</span> Structured 20-minute conversations with matched members. A guided, safe way to practice vulnerability and authentic connection.
                  </p>
                </div>
                <p className="text-[#1a0f0a]">
                  Would you like to participate in connections?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: "weekly", label: "Connect me this week" },
                    { id: "monthly", label: "Connect me monthly" },
                    { id: "pause", label: "Not at this time" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleUpdate({ connectionComfortLevel: option.id })}
                      className={`p-4 text-center rounded-lg border-2 transition-all ${
                        profile.connectionComfortLevel === option.id
                          ? "border-[#d4a348] bg-[#f3ede5]"
                          : "border-[#e8ddd2] hover:border-[#d4a348]"
                      }`}
                    >
                      <p className="text-[#1a0f0a] text-sm">{option.label}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#a0704a] pt-2">
                  You can update your connection preferences anytime in your profile.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button variant="primary" size="md" onClick={handleNext} className="flex-1">
                  Continue
                </Button>
              </div>
            </Card>
              </div>
            </>
          )}

          {currentStep === "couples" && coupleMode && (
            <>
              <div className="animate-in fade-in slide-in-from-top-6 duration-600" style={{ animationDelay: "0ms" }}>
                <Card className="bg-orange-100 border-2 border-orange-400 mb-6">
                  <div className="text-center space-y-3 py-1">
                    <div className="text-4xl animate-bounce">🤝</div>
                    <div>
                      <p className="text-lg font-bold text-[#1a0f0a]">You're ready to connect.</p>
                      <p className="text-sm text-[#8b7f77] mt-1">Now let's honor your partnership.</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
                <Card>
              <CardHeader title="Couples Profile" icon={<IconCouples size={20} />} />
              <div className="space-y-4">
                <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                  <p className="text-[#1a0f0a]">
                    <span className="font-semibold text-[#1a0f0a]">Your couple journey:</span> Tell us about your partnership and what you're exploring together. This helps us suggest relevant experiences and matches.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a0f0a] mb-2">Couple Name (optional)</label>
                  <input
                    type="text"
                    value={coupleDisplayName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCoupleDisplayName(value);
                      saveCoupleProfileToSupabase(profile.id, { coupleDisplayName: value });
                    }}
                    placeholder="How would you like to be known as a couple?"
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a0f0a] mb-2">What are your couple goals? (Select all)</label>
                  <div className="space-y-2">
                    {appConfig.coupleGoals.map((goal) => (
                      <label key={goal} className="flex items-center gap-3 p-2 hover:bg-[#f3ede5] rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={coupleGoals.includes(goal)}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...coupleGoals, goal]
                              : coupleGoals.filter((g) => g !== goal);
                            setCoupleGoals(updated);
                            saveCoupleProfileToSupabase(profile.id, { coupleGoals: updated });
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-sm text-[#1a0f0a]">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-[#f3ede5] p-4 rounded-lg">
                  <p className="text-sm text-[#1a0f0a]">
                    💡 <strong>Partner Invitation:</strong> Partner accounts coming in Phase 2. For now, complete your profile and we'll guide you on next steps.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button variant="primary" size="md" onClick={handleNext} className="flex-1">
                  Continue
                </Button>
              </div>
            </Card>
              </div>
            </>
          )}

          {currentStep === "prompt" && (
            <>
              <div className="animate-in fade-in slide-in-from-top-6 duration-600" style={{ animationDelay: "0ms" }}>
                <Card className="bg-orange-100 border-2 border-orange-400 mb-6">
                  <div className="text-center space-y-3 py-1">
                    <div className="text-4xl animate-pulse">✨</div>
                    <div>
                      <p className="text-lg font-bold text-[#1a0f0a]">One final reflection,</p>
                      <p className="text-sm text-[#8b7f77] mt-1">then the room is yours to explore.</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "700ms" }}>
                <Card>
                  <CardHeader title="First Reflection" icon={<IconReflection size={20} />} />
                  <div className="space-y-4">
                    <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-4 rounded">
                      <p className="text-[#1a0f0a]">
                        <span className="font-semibold text-[#1a0f0a]">Reflections are private and powerful:</span> This first reflection sets the container for your experience. It's just for you—a chance to name what you're seeking and what's holding you back.
                      </p>
                    </div>

                    <div className="bg-[#f3ede5] p-4 rounded-lg italic text-[#1a0f0a]">
                      "What kind of connection are you craving this week, and what part of you feels hesitant to ask for it?"
                    </div>

                    <textarea
                      value={profile.firstPromptResponse || ""}
                      onChange={(e) => handleUpdate({ firstPromptResponse: e.target.value })}
                      placeholder="Your reflection (optional for now)..."
                      rows={4}
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                    />

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#1a0f0a] block">What would you like to do with this reflection?</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => handleUpdate({ firstPromptIsPublic: true })}
                          className={`p-4 text-left rounded-lg border-2 transition-all ${
                            profile.firstPromptIsPublic === true
                              ? "border-[#d4a348] bg-[#f3ede5]"
                              : "border-[#e8ddd2] hover:border-[#d4a348]"
                          }`}
                        >
                          <p className="font-medium text-[#1a0f0a]">Share in the Community</p>
                          <p className="text-xs text-[#1a0f0a] mt-1">Other members can see and respond</p>
                        </button>
                        <button
                          onClick={() => handleUpdate({ firstPromptIsPublic: false })}
                          className={`p-4 text-left rounded-lg border-2 transition-all ${
                            profile.firstPromptIsPublic === false
                              ? "border-[#d4a348] bg-[#f3ede5]"
                              : "border-[#e8ddd2] hover:border-[#d4a348]"
                          }`}
                        >
                          <p className="font-medium text-[#1a0f0a]">Keep Private</p>
                          <p className="text-xs text-[#1a0f0a] mt-1">Just for your journey, not shared</p>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                      Back
                    </Button>
                    <Button variant="primary" size="md" onClick={handleNext} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}

          {currentStep === "complete" && !completionSuccess && (
            <Card>
              <div className="text-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl text-[#1a0f0a]">Welcome to The Connection Room</h2>
                <p className="text-lg text-[#1a0f0a]">
                  Your profile is ready, and you're part of the community.
                </p>

                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{submitError}</p>
                    <button
                      onClick={() => {
                        // Previously only cleared the error text (setSubmitError(null))
                        // without re-attempting anything -- the button then vanished
                        // entirely (this block only renders while submitError is set),
                        // leaving no visible next step besides noticing and re-clicking
                        // the separate "Enter the Community" button above. Confirmed
                        // live: multiple members reported being permanently "blocked" at
                        // this exact screen after clicking what looked like the retry
                        // action. "Try again" now actually tries again.
                        setSubmitError(null);
                        handleComplete();
                      }}
                      className="text-sm text-red-600 underline mt-2 hover:text-red-700"
                    >
                      Try again
                    </button>
                  </div>
                )}

                <div className="space-y-3 pt-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleComplete}
                    disabled={isSubmitting || submitError === null && isSubmitting}
                    className=""
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Entering the Community…</span>
                      </div>
                    ) : (
                      "Enter the Community"
                    )}
                  </Button>
                </div>

                <p className="text-xs text-[#a0704a] pt-2">
                  {isSubmitting
                    ? "Saving your profile..."
                    : "Your profile will be saved and you'll enter the app."}
                </p>
              </div>
            </Card>
          )}

          {currentStep === "complete" && completionSuccess && (
            <WelcomeVideoStep
              profile={profile}
              onUpdate={handleUpdate}
              onEnter={() => handleNavigateToDestination("/app")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
