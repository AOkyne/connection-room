"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, getProfilePhoto, updateProfile, type Profile } from "@/lib/data/profiles";
import { ensureInviteCode } from "@/lib/data/invites";
import { uploadProfilePhoto } from "@/lib/utils/storage";
import { supabase } from "@/lib/supabase/client";
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
import { InvitePanel } from "@/components/invites/InvitePanel";
import { FriendsInvited } from "@/components/invites/FriendsInvited";
import { ProfileVisibilitySettings } from "@/components/members/ProfileVisibilitySettings";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const MAX_PHOTO_SIZE_MB = 5;
  const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

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

        // getProfile() no longer includes the photo itself (see its own
        // comment -- some photos are multi-megabyte and were causing real
        // profiles to time out and show as "Guest"). Fetch it separately,
        // non-blocking, so the rest of this page doesn't wait on it either.
        if (p?.id) {
          getProfilePhoto().then((photo) => {
            if (photo) setProfile((prev) => (prev ? { ...prev, profilePhoto: photo } : prev));
          });
        }

        // Ensure invite code is generated
        if (p?.id && p?.displayName) {
          try {
            await ensureInviteCode(p);
          } catch (err) {
            console.warn("Could not generate invite code:", err);
          }
        }

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file size
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError(`Photo is too large. Max size is ${MAX_PHOTO_SIZE_MB}MB (your file is ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setPhotoError('Photo must be JPG, PNG, or GIF');
      return;
    }

    setPhotoError(null);
    try {
      let photoUrl: string | null = null;

      // Try Supabase Storage first
      if (supabase) {
        photoUrl = await uploadProfilePhoto(file, profile.id);
      }

      // Fall back to base64 if Supabase upload failed or unavailable
      if (!photoUrl) {
        photoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
      }

      setProfile({ ...profile, profilePhoto: photoUrl });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to upload photo');
    }
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#1a1714]">Your Profile</h1>
          <p className="text-lg text-[#6b6460] mt-2">
            Help the community get to know you
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-[#d4a348] hover:text-[#c9956d] transition-colors"
          aria-label="Go back"
        >
          ← Back
        </button>
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
                  {photoError && (
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      ❌ {photoError}
                    </p>
                  )}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1714] mb-2">
                  Age Range
                </label>
                <select
                  value={profile.ageRange || ""}
                  onChange={(e) => setProfile({ ...profile, ageRange: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                >
                  <option value="">Prefer not to say</option>
                  {appConfig.ageRanges.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1714] mb-2">
                  Orientation
                </label>
                <select
                  value={profile.orientation || ""}
                  onChange={(e) => setProfile({ ...profile, orientation: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                >
                  <option value="">Prefer not to say</option>
                  {appConfig.orientations.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1714] mb-2">
                Relationship Status
              </label>
              <select
                value={profile.relationshipStatus || ""}
                onChange={(e) => setProfile({ ...profile, relationshipStatus: e.target.value })}
                className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
              >
                <option value="">Prefer not to say</option>
                {appConfig.relationshipStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
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

            <div>
              <label className="block text-sm font-medium text-[#1a1714] mb-2">
                What are you hoping to find or experience?
              </label>
              <textarea
                placeholder="The kinds of connection or conversations you're looking for..."
                value={profile.connectionHoping || ""}
                onChange={(e) => setProfile({ ...profile, connectionHoping: e.target.value })}
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

      {/* Privacy & Visibility */}
      <Card>
        <CardHeader title="Privacy & Visibility" icon={<IconProfile size={20} />} />
        <p className="text-sm text-[#6b6460] mb-3">
          Identity can be visible. Vulnerability should be chosen. Decide who
          sees your profile and which parts of your story you want to share.
        </p>
        <ProfileVisibilitySettings />
      </Card>

      {/* Connection Preferences and Achievements Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Preferences - 1/3 width */}
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

        {/* Achievements - 2/3 width */}
        <div className="md:col-span-2">
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
        </div>
      </div>

      {/* Invite Your Friends Section */}
      <div className="bg-[#fffbf7] rounded-2xl p-6 shadow-sm border border-[#ede6e0] space-y-4" style={{ borderTop: "3px solid #D4A040" }}>
        <h3 className="text-lg font-semibold" style={{ color: "#2C2417" }}>
          Invite Your Friends
        </h3>
        <p style={{ color: "#4A3E33" }}>
          Know someone who is tired of the apps, surface conversations, and the
          usual pressure to perform? Invite people who would bring curiosity,
          care, and a real desire for connection.
        </p>
        <Button
          onClick={() => setInvitePanelOpen(true)}
          style={{
            background: "linear-gradient(135deg, #D4A040 0%, #A67C2A 100%)",
            color: "#FFFDF8",
          }}
        >
          Invite Your Friends
        </Button>
      </div>

      {/* Friends I've Invited Section */}
      <FriendsInvited onOpenInvite={() => setInvitePanelOpen(true)} />

      {/* Invite Panel Modal */}
      <InvitePanel isOpen={invitePanelOpen} onClose={() => setInvitePanelOpen(false)} />

      <Button variant="primary" size="lg" onClick={handleSave}>
        Save Profile
      </Button>
    </div>
  );
}
