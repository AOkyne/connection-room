"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile, type Profile } from "@/lib/data/profiles";
import { getUserBadges } from "@/lib/data/badges";
import { getSpaces } from "@/lib/data/spaces";
import { waitForAuthReady } from "@/lib/supabase/auth-ready";
import { getBadgeImage } from "@/lib/badge-icons";
import { appConfig } from "@/lib/config";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Breadcrumb } from "@/components/Breadcrumb";
import { IconIntegration, IconConnection, IconProfileNav, IconProfile, IconBadges } from "@/components/Icons";
import { ProfileSavedFeedback } from "@/components/feedback";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        let p = await getProfile();

        // If no profile in localStorage, create a demo one
        if (!p) {
          p = {
            id: "demo-profile",
            firstName: "Demo",
            lastName: "User",
            displayName: "Demo User",
            pronouns: "they/them",
            profilePhoto: "",
            memberType: "individual",
            interests: ["Connection", "Growth", "Community"],
            completedOnboarding: true,
            spacesJoined: [],
            joinedAt: new Date(),
          };
        }

        setProfile(p);

        // Load user badges with auth ready check
        if (p?.id) {
          await waitForAuthReady(2000);
          try {
            // Load spaces to pass to getUserBadges (same as home/journey pages)
            let spaces: any[] = [];
            try {
              spaces = await getSpaces();
            } catch (err) {
              console.warn("Could not load spaces for badges");
            }

            const badgesPromise = getUserBadges(p.id, p, spaces);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 3000)
            );
            const userBadges = await Promise.race([badgesPromise, timeoutPromise]);
            setBadges(userBadges as any[]);
          } catch (err) {
            console.warn("Badge loading timed out or failed");
            setBadges([]);
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        // Fallback to demo profile
        setProfile({
          id: "demo-profile",
          firstName: "Demo",
          lastName: "User",
          displayName: "Demo User",
          pronouns: "they/them",
          profilePhoto: "",
          memberType: "individual",
          interests: ["Connection", "Growth", "Community"],
          completedOnboarding: true,
          spacesJoined: [],
          joinedAt: new Date(),
        });
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (profile) {
      try {
        await updateProfile(profile);
        setProfileSavedFeedback(true);
      } catch (error) {
        console.warn("Error saving profile:", error);
      }
    }
  };

  const handleInterestToggle = (interest: string) => {
    if (!profile) return;
    const interests = profile.interests || [];
    const updated = interests.includes(interest)
      ? interests.filter((i) => i !== interest)
      : [...interests, interest];
    setProfile({ ...profile, interests: updated });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setProfile({ ...profile, profilePhoto: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  if (!profile) return <LoadingScreen message="Loading your profile" subtitle="We're gathering your information. Just a moment..." />;

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "Your Profile", isActive: true },
        ]}
      />

      {/* Profile Saved Feedback */}
      {profileSavedFeedback && (
        <ProfileSavedFeedback onClose={() => setProfileSavedFeedback(false)} />
      )}

      <div>
        <h1 className="text-4xl font-bold text-[#1a1714]">Your Profile</h1>
        <p className="text-lg text-[#6b6460] mt-2">
          Help the community get to know you
        </p>
      </div>

      {/* Two-column layout for Basic Information and Interests */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Basic Information" icon={<IconProfile size={20} />} />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1714] mb-2">
                Profile Photo
              </label>
              <div className="flex gap-4 items-start">
                {profile.profilePhoto && !profile.profilePhoto.includes("data:image/svg") && (
                  <img
                    src={profile.profilePhoto}
                    alt="Profile"
                    className="w-24 h-24 rounded-lg object-cover border border-[#e8e3db]"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-sm text-[#6b6460] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#6b5a45] file:text-white hover:file:bg-[#5a4936]"
                  />
                  <p className="text-xs text-[#8b6f47] mt-2">
                    Choose a JPG, PNG, or GIF (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1714] mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1714] mb-2">
                Pronouns (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. he/him, she/her, they/them"
                value={profile.pronouns || ""}
                onChange={(e) => setProfile({ ...profile, pronouns: e.target.value })}
                className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1714] mb-2">
                Location (optional)
              </label>
              <input
                type="text"
                placeholder="City, State"
                value={profile.location || ""}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1714] mb-2">
                What brought you here?
              </label>
              <textarea
                placeholder="Share what drew you to this community..."
                value={profile.whatBroughtYouHere || ""}
                onChange={(e) => setProfile({ ...profile, whatBroughtYouHere: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
              />
            </div>
          </div>
      </Card>

        <Card>
          <CardHeader title="Interests" icon={<IconIntegration size={20} />} />
          <div className="space-y-2">
            {appConfig.interests.map((interest) => (
              <label key={interest} className="flex items-center gap-3 p-2 hover:bg-[#f8f6f2] rounded">
                <input
                  type="checkbox"
                  checked={profile.interests?.includes(interest) || false}
                  onChange={() => handleInterestToggle(interest)}
                />
                <span className="text-[#1a1714]">{interest}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Connection Preferences" icon={<IconConnection size={20} />} />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1714] mb-2">
              Comfort Level with Connections
            </label>
            <select
              value={profile.connectionComfortLevel || "text-based"}
              onChange={(e) => setProfile({ ...profile, connectionComfortLevel: e.target.value })}
              className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
            >
              <option value="text-based">Text-based only</option>
              <option value="voice-video">Voice/video okay</option>
              <option value="local">Open to local/in-person if appropriate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1714] mb-2">
              Any boundaries or preferences?
            </label>
            <textarea
              placeholder="Share any important preferences..."
              value={profile.connectionBoundaries || ""}
              onChange={(e) => setProfile({ ...profile, connectionBoundaries: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
            />
          </div>
        </div>
      </Card>

      {/* Badges Section */}
      {/* Mobile: Simple List */}
      <div className="md:hidden">
        <Card className="border-2 border-[#d4a348]">
          <h3 className="text-lg font-bold text-[#d4a348] mb-4">🏆 Achievements {badges.length > 0 && `(${badges.length})`}</h3>
          {badges.length > 0 ? (
            <div className="space-y-2">
              {badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-3 p-3 bg-[#f3ede5] rounded">
                  <img src={getBadgeImage(badge.id)} alt={badge.name} className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a0f0a]">{badge.name}</p>
                    <p className="text-xs text-[#a0704a]">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#a0704a]">No badges earned yet. Start participating!</p>
          )}
        </Card>
      </div>

      {/* Desktop: Grid - matches home page style */}
      {badges.length > 0 && (
        <div className="hidden md:block">
          <h3 className="text-lg font-bold text-[#d4a348] mb-3">🏆 Your Achievements</h3>
          <div className="grid grid-cols-4 lg:grid-cols-5 gap-0">
            {badges.map((badge) => (
              <img
                key={badge.id}
                src={getBadgeImage(badge.id)}
                alt={badge.name}
                title={`${badge.name}: ${badge.description}`}
                className="w-48 h-48 object-contain cursor-pointer hover:scale-110 transition-transform drop-shadow -m-6"
              />
            ))}
          </div>
        </div>
      )}

      <Button variant="primary" size="lg" onClick={handleSave}>
        Save Profile
      </Button>
    </div>
  );
}
