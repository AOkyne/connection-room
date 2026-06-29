"use client";

import { useState, useEffect } from "react";
import { getProfile, updateProfile, type Profile } from "@/lib/data/profiles";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileSavedFeedback } from "@/components/feedback";

interface ProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileFormModal({ isOpen, onClose }: ProfileFormModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const p = await getProfile();
      setProfile(p);
    } catch (error) {
      console.warn("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      await updateProfile(profile);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.warn("Error saving profile:", error);
    } finally {
      setSaving(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-[#e8ddd2] p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[#1a0f0a]">Complete Your Profile</h2>
          <button
            onClick={onClose}
            className="text-2xl text-[#a0704a] hover:text-[#1a0f0a] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {showFeedback && (
            <ProfileSavedFeedback onClose={() => setShowFeedback(false)} />
          )}

          {loading ? (
            <p className="text-center text-[#1a0f0a]">Loading your profile...</p>
          ) : profile ? (
            <>
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1a0f0a]">Basic Information</h3>
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

              {/* Interests */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-[#1a0f0a]">Interests</h3>
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
              </div>

              {/* Connection Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1a0f0a]">Connection Preferences</h3>
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

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#e8ddd2]">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm text-[#1a0f0a] hover:bg-[#f3ede5] rounded border border-[#e8ddd2] font-medium"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-[#1a0f0a]">Unable to load profile</p>
          )}
        </div>
      </div>

      {/* Backdrop click closes modal */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
