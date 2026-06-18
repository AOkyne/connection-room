"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile, type Profile } from "@/lib/data/profiles";
import { appConfig } from "@/lib/config";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconIntegration, IconConnection, IconProfileNav, IconProfile } from "@/components/Icons";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const p = getProfile();
    setProfile(p);
  }, []);

  const handleSave = () => {
    if (profile) {
      updateProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-4xl font-bold text-[#1a1714]">Your Profile</h1>
        <p className="text-lg text-[#6b6460] mt-2">
          Help the community get to know you
        </p>
      </div>

      <Card>
        <CardHeader title="Basic Information" icon={<IconProfile size={20} />} />
        <div className="space-y-4">
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

      <Card>
        <CardHeader title="Pairing Preferences" icon={<IconConnection size={20} />} />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1714] mb-2">
              Comfort Level with Pairings
            </label>
            <select
              value={profile.pairingComfortLevel || "text-based"}
              onChange={(e) => setProfile({ ...profile, pairingComfortLevel: e.target.value })}
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
              value={profile.pairingBoundaries || ""}
              onChange={(e) => setProfile({ ...profile, pairingBoundaries: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
            />
          </div>
        </div>
      </Card>

      {saved && (
        <div className="bg-[#7a9b6d]/10 border border-[#7a9b6d] text-[#7a9b6d] px-4 py-3 rounded-lg">
          ✓ Profile saved successfully
        </div>
      )}

      <Button variant="primary" size="lg" className="w-full" onClick={handleSave}>
        Save Profile
      </Button>
    </div>
  );
}
