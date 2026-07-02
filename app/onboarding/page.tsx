"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile, type Profile } from "@/lib/data/profiles";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { IconConnection, IconIntegration, IconProfile, IconCouples, IconReflection } from "@/components/Icons";
import Link from "next/link";

type Step = "welcome" | "agreements" | "member-type" | "basics" | "photo" | "interests" | "connections" | "couples" | "prompt" | "complete";

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
    if (!profile || isSubmitting || hasAttemptedCompletion) return;

    setIsSubmitting(true);
    setHasAttemptedCompletion(true);
    setSubmitError(null);

    try {
      const updated = { ...profile, completedOnboarding: true };
      const result = await updateProfile(updated);

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
                <Button variant="primary" size="md" onClick={handleNext} className="flex-1">
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
                        <span className="font-semibold text-[#1a0f0a]">Why your photo matters:</span> A real, current photo helps people recognize you and builds the human connection this community is built on.
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
                      className="w-full px-4 py-3 border-2 border-dashed border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                    />
                    <p className="text-xs text-[#a0704a]">JPG, PNG, or GIF. Max 5MB. A clear, recent photo works best.</p>
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
                    placeholder="How would you like to be known as a couple?"
                    className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a0f0a] mb-2">What are your couple goals? (Select all)</label>
                  <div className="space-y-2">
                    {appConfig.coupleGoals.map((goal) => (
                      <label key={goal} className="flex items-center gap-3 p-2 hover:bg-[#f3ede5] rounded-lg cursor-pointer">
                        <input type="checkbox" className="w-5 h-5" />
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
                      onClick={() => setSubmitError(null)}
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
            <Card>
              <div className="text-center space-y-8">
                <div className="space-y-2">
                  <div className="text-6xl mb-4 animate-bounce">✓</div>
                  <h2 className="text-5xl text-[#1a0f0a]">You're in</h2>
                  <p className="text-xl text-[#d4a348] font-medium">Welcome to The Connection Room</p>
                  <p className="text-lg text-[#1a0f0a] mt-4 leading-relaxed">
                    Your profile is complete, and you're now part of our community. You're ready to explore connection, meet others on the same path, and begin your journey toward authentic intimacy.
                  </p>
                </div>

                <div className="bg-[#f3ede5] p-6 rounded-lg space-y-3">
                  <p className="font-semibold text-[#1a0f0a]">What you can do now:</p>
                  <ul className="text-sm text-[#1a0f0a] space-y-2 text-left">
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4a348]">🚪</span>
                      <span><strong>Seven Doors:</strong> A guided 7-week journey through connection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4a348]">🤝</span>
                      <span><strong>Find Connections:</strong> Browse people matched to your interests</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4a348]">💬</span>
                      <span><strong>Join Spaces:</strong> Share reflections and connect with the community</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#fffbf7] border-l-4 border-[#d4a348] p-6 rounded-lg space-y-3">
                  <p className="text-[#1a0f0a] italic text-lg leading-relaxed">
                    "Welcome to the room. I'm here every day, and I'm genuinely glad you're here. What you're about to experience isn't therapy, and it isn't a hookup app—it's something real. A place where the guard comes down, where you can be seen, and where connection becomes possible. Take your time. Start wherever feels right. And remember: you don't have to arrive ready. You just have to arrive."
                  </p>
                  <p className="text-[#a0704a] text-sm">— Trevor James</p>
                </div>

                <div className="space-y-4">
                  <p className="text-[#1a0f0a] font-medium">Where would you like to start?</p>

                  <button
                    onClick={() => handleNavigateToDestination("/app/journey")}
                    className="w-full p-4 text-left rounded-lg border-2 border-[#d4a348] bg-[#f3ede5] hover:bg-[#e8ddd2] transition-all"
                  >
                    <p className="font-medium text-[#1a0f0a]">🚪 Start the Seven Doors</p>
                    <p className="text-sm text-[#1a0f0a] mt-1">Your first guided chapter—explore your connection patterns and begin your transformation</p>
                  </button>

                  <button
                    onClick={() => handleNavigateToDestination("/app/spaces?space=commons")}
                    className="p-4 text-left rounded-lg border-2 border-[#e8ddd2] hover:border-[#d4a348] hover:bg-[#f3ede5] transition-all"
                  >
                    <p className="font-medium text-[#1a0f0a]">Visit The Commons</p>
                    <p className="text-sm text-[#1a0f0a] mt-1">Introduce yourself and see who else is here</p>
                  </button>

                  <button
                    onClick={() => handleNavigateToDestination("/app/spaces")}
                    className="p-4 text-left rounded-lg border-2 border-[#e8ddd2] hover:border-[#d4a348] hover:bg-[#f3ede5] transition-all"
                  >
                    <p className="font-medium text-[#1a0f0a]">Explore Your Spaces</p>
                    <p className="text-sm text-[#1a0f0a] mt-1">Browse all the communities available to you</p>
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleNavigateToDestination("/app")}
                    className="flex-1"
                  >
                    Skip for Now
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
