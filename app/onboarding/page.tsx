"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile, type Profile } from "@/lib/data/profiles";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { IconConnection, IconIntegration, IconProfile, IconCouples, IconReflection } from "@/components/Icons";
import Link from "next/link";

type Step = "welcome" | "agreements" | "member-type" | "basics" | "photo" | "interests" | "pairings" | "couples" | "prompt" | "complete";

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [coupleMode, setCoupleMode] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const p = await getProfile();
      if (!p) {
        router.push("/auth");
      } else {
        setProfile(p);
        if (p.completedOnboarding) {
          router.push("/app");
        }
      }
    };

    loadProfile();
  }, [router]);

  if (!profile) return null;

  const steps: Step[] = coupleMode
    ? ["welcome", "agreements", "member-type", "basics", "photo", "interests", "pairings", "couples", "prompt", "complete"]
    : ["welcome", "agreements", "member-type", "basics", "photo", "interests", "pairings", "prompt", "complete"];

  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleUpdate = async (updates: Partial<Profile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await updateProfile(updated);
  };

  const handleComplete = async () => {
    const updated = { ...profile, completedOnboarding: true };
    setProfile(updated);
    await updateProfile(updated);
    router.push("/app");
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#e8ddd2] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-2 sm:px-6">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="flex items-center">
              <img
                src="/Connection-room-logo.png"
                alt="The Connection Room"
                className="h-20 w-auto"
              />
            </Link>
            {currentStep !== "welcome" && (
              <span className="text-sm text-[#a0968a]">
                Step {currentIndex + 1} of {steps.length}
              </span>
            )}
          </div>
          {currentStep !== "welcome" && (
            <div className="w-full bg-[#e8ddd2] rounded-full h-2">
              <div
                className="bg-[#d4a574] h-2 rounded-full transition-all duration-300"
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
                <h2 className="text-4xl text-[#2a2318]">Welcome</h2>
                <p className="text-lg text-[#6b5f52]">
                  Let's set up your profile and learn about our community agreements.
                </p>
                <p className="text-[#6b5f52]">
                  This takes about 5 minutes. You can edit your profile anytime after.
                </p>
                <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
                  Let's Begin
                </Button>
              </div>
            </Card>
          )}

          {currentStep === "agreements" && (
            <Card>
              <CardHeader title="Community Agreements" icon={<IconConnection size={20} />} />
              <div className="space-y-4">
                <p className="text-[#6b5f52] mb-4">
                  We're building a safe, respectful space. Please read and acknowledge these agreements:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {appConfig.communityAgreements.map((agreement, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[#f3ede5] rounded-lg">
                      <span className="text-[#d4a574]">✓</span>
                      <span className="text-sm text-[#6b5f52]">{agreement}</span>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-3 p-3 border-2 border-[#d4a574] rounded-lg cursor-pointer mt-4">
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                  <span className="text-[#6b5f52]">I agree to uphold these agreements</span>
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
            <Card>
              <CardHeader title="Who Are You?" icon={<IconProfile size={20} />} />
              <div className="space-y-3">
                {appConfig.memberTypeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      handleUpdate({ memberType: option.id });
                      if (option.id === "couple") setCoupleMode(true);
                    }}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      profile.memberType === option.id
                        ? "border-[#d4a574] bg-[#f3ede5]"
                        : "border-[#e8ddd2] hover:border-[#d4a574]"
                    }`}
                  >
                    <p className="font-medium text-[#2a2318]">{option.label}</p>
                    <p className="text-sm text-[#6b5f52] mt-1">{option.description}</p>
                  </button>
                ))}
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
          )}

          {currentStep === "basics" && (
            <Card>
              <CardHeader title="Your Profile" icon={<IconIntegration size={20} />} />
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2a2318] mb-2">Display Name *</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => handleUpdate({ displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                    placeholder="How should we call you?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2a2318] mb-2">Pronouns</label>
                    <input
                      type="text"
                      value={profile.pronouns || ""}
                      onChange={(e) => handleUpdate({ pronouns: e.target.value })}
                      placeholder="he/him"
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2a2318] mb-2">Location</label>
                    <input
                      type="text"
                      value={profile.location || ""}
                      onChange={(e) => handleUpdate({ location: e.target.value })}
                      placeholder="City, State"
                      className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a2318] mb-2">What brought you here?</label>
                  <textarea
                    value={profile.whatBroughtYouHere || ""}
                    onChange={(e) => handleUpdate({ whatBroughtYouHere: e.target.value })}
                    placeholder="Share what drew you to this community..."
                    rows={3}
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                  />
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
          )}

          {currentStep === "photo" && (
            <Card>
              <CardHeader title="Add Your Photo" icon="📸" />
              <p className="text-[#6b5f52] mb-6">
                A real photo of yourself helps members recognize you and builds authentic connection. This is essential to our community.
              </p>

              {/* File Upload */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-[#2a2318]">
                  Upload your photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        handleUpdate({ profilePhoto: dataUrl });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a574] text-sm"
                />
                <p className="text-xs text-[#a0968a]">JPG, PNG, or GIF. Max 5MB. A clear, recent photo works best.</p>
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

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" size="md" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  disabled={!profile.profilePhoto}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {currentStep === "interests" && (
            <Card>
              <CardHeader title="Your Interests" icon={<IconIntegration size={20} />} />
              <p className="text-[#6b5f52] mb-4">What draws you here? (Select all that apply)</p>
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
                    <span className="text-[#6b5f52]">{interest}</span>
                  </label>
                ))}
                <div className="border-t border-[#e8ddd2] pt-3 mt-3">
                  <label className="block text-sm font-medium text-[#2a2318] mb-2">Other interests?</label>
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
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574] text-sm"
                  />
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
          )}

          {currentStep === "pairings" && (
            <Card>
              <CardHeader title="Connection Pairings" icon={<IconConnection size={20} />} />
              <div className="space-y-4">
                <p className="text-[#6b5f52]">
                  We offer optional pairings with other members for 20-minute conversations. Would you like to participate?
                </p>
                <div className="space-y-3">
                  {[
                    { id: "weekly", label: "Pair me this week" },
                    { id: "monthly", label: "Pair me monthly" },
                    { id: "pause", label: "Pause pairings" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleUpdate({ pairingComfortLevel: option.id })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        profile.pairingComfortLevel === option.id
                          ? "border-[#d4a574] bg-[#f3ede5]"
                          : "border-[#e8ddd2] hover:border-[#d4a574]"
                      }`}
                    >
                      <p className="text-[#6b5f52]">{option.label}</p>
                    </button>
                  ))}
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
          )}

          {currentStep === "couples" && coupleMode && (
            <Card>
              <CardHeader title="Couples Profile" icon={<IconCouples size={20} />} />
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2a2318] mb-2">Couple Name (optional)</label>
                  <input
                    type="text"
                    placeholder="How would you like to be known as a couple?"
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a2318] mb-2">What are your couple goals? (Select all)</label>
                  <div className="space-y-2">
                    {appConfig.coupleGoals.map((goal) => (
                      <label key={goal} className="flex items-center gap-3 p-2 hover:bg-[#f3ede5] rounded-lg cursor-pointer">
                        <input type="checkbox" className="w-5 h-5" />
                        <span className="text-sm text-[#6b5f52]">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-[#f3ede5] p-4 rounded-lg">
                  <p className="text-sm text-[#6b5f52]">
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
          )}

          {currentStep === "prompt" && (
            <Card>
              <CardHeader title="First Reflection" icon={<IconReflection size={20} />} />
              <div className="space-y-4">
                <div className="bg-[#f3ede5] p-4 rounded-lg italic text-[#6b5f52]">
                  "What kind of connection are you craving this week, and what part of you feels hesitant to ask for it?"
                </div>
                <textarea
                  value={profile.firstPromptResponse || ""}
                  onChange={(e) => handleUpdate({ firstPromptResponse: e.target.value })}
                  placeholder="Your reflection (optional for now)..."
                  rows={4}
                  className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
                />
                <div className="space-y-3">
                  <label className="text-sm font-medium text-[#2a2318] block">What would you like to do with this reflection?</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleUpdate({ firstPromptIsPublic: true })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        profile.firstPromptIsPublic === true
                          ? "border-[#d4a574] bg-[#f3ede5]"
                          : "border-[#e8ddd2] hover:border-[#d4a574]"
                      }`}
                    >
                      <p className="font-medium text-[#2a2318]">Share in the Community</p>
                      <p className="text-xs text-[#6b5f52] mt-1">Other members can see and respond</p>
                    </button>
                    <button
                      onClick={() => handleUpdate({ firstPromptIsPublic: false })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        profile.firstPromptIsPublic === false
                          ? "border-[#d4a574] bg-[#f3ede5]"
                          : "border-[#e8ddd2] hover:border-[#d4a574]"
                      }`}
                    >
                      <p className="font-medium text-[#2a2318]">Keep Private</p>
                      <p className="text-xs text-[#6b5f52] mt-1">Just for your journey, not shared</p>
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
          )}

          {currentStep === "complete" && (
            <Card>
              <div className="text-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl text-[#2a2318]">Welcome Home</h2>
                <p className="text-lg text-[#6b5f52]">
                  You're all set. Your profile is complete and you're part of the community.
                </p>
                <p className="text-[#6b5f52]">
                  Start by exploring spaces, reading prompts, or connecting with others.
                </p>
                <Button variant="primary" size="lg" onClick={handleComplete} className="w-full">
                  Enter the Community
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
