"use client";

import { useState, useEffect } from "react";
import {
  getProfileVisibilitySettings,
  updateProfileVisibilitySettings,
  type ProfileVisibilitySettings as VisibilitySettings,
} from "@/lib/data/profiles";
import { Button } from "@/components/Button";

const DEFAULT_SETTINGS: VisibilitySettings = {
  profileVisibility: "members_only",
  showInDiscovery: true,
  showAge: true,
  showGeneralLocation: true,
  showPronouns: true,
  showOrientation: true,
  showRelationshipStatus: true,
  showWhyJoined: true,
  showConnectionIntentions: true,
  showInterests: true,
  showQuizResult: false,
  showConnectionComfortLevel: false,
  showSelectedReflection: false,
  showRecentPosts: false,
};

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f3ede5] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 mt-0.5"
      />
      <div className="flex-1">
        <p className="font-medium text-[#1a0f0a]">{label}</p>
        {description && <p className="text-sm text-[#a0704a]">{description}</p>}
      </div>
    </label>
  );
}

interface ProfileVisibilitySettingsProps {
  onSave?: () => void;
}

// Who can see what, and how much of it. Rebuilt against the real schema --
// the previous version of this component was dead code, wired to fields
// (show_in_member_lists, a three-value profile_visibility) that were never
// actual database columns on any table. Reads/writes public_profiles
// directly via getProfileVisibilitySettings/updateProfileVisibilitySettings,
// not the private profiles table -- these preferences live on the
// member-visible layer, not the private one.
export function ProfileVisibilitySettings({ onSave }: ProfileVisibilitySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<VisibilitySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getProfileVisibilitySettings().then((s) => {
      if (s) setSettings(s);
      setLoading(false);
    });
  }, [isOpen]);

  const update = <K extends keyof VisibilitySettings>(key: K, value: VisibilitySettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfileVisibilitySettings(settings);
      setIsOpen(false);
      onSave?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-[#d4a348] hover:text-[#c9956d] font-medium"
      >
        Privacy & Visibility Settings
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">
              Who Can See My Profile
            </h2>

            {loading ? (
              <p className="text-sm text-[#a0704a]">Loading your settings...</p>
            ) : (
              <div className="space-y-6">
                {/* Who Can See My Profile */}
                <div className="space-y-2">
                  {[
                    {
                      id: "members_only" as const,
                      label: "All Connection Room members",
                      desc: "Any signed-in member can see your profile",
                    },
                    {
                      id: "shared_spaces" as const,
                      label: "Only members in my spaces",
                      desc: "Only people who share a space with you",
                    },
                    {
                      id: "hidden" as const,
                      label: "Hide me from member discovery",
                      desc: "Your profile is only visible to you and the team",
                    },
                  ].map((option) => (
                    <label
                      key={option.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f3ede5] cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="profileVisibility"
                        value={option.id}
                        checked={settings.profileVisibility === option.id}
                        onChange={() => update("profileVisibility", option.id)}
                        className="w-5 h-5 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[#1a0f0a]">{option.label}</p>
                        <p className="text-xs text-[#a0704a]">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                  <ToggleRow
                    label="Leave me out of the member discovery grid"
                    description="Still visible to members who find you directly (posts, spaces, connections) -- just not surfaced as a suggestion"
                    checked={settings.showInDiscovery}
                    onChange={(v) => update("showInDiscovery", v)}
                  />
                </div>

                {/* About Me */}
                <div className="border-t border-[#e8ddd2] pt-4 space-y-1">
                  <h3 className="text-sm font-semibold text-[#1a0f0a] mb-2">About Me</h3>
                  <ToggleRow label="Age" checked={settings.showAge} onChange={(v) => update("showAge", v)} />
                  <ToggleRow label="Location" checked={settings.showGeneralLocation} onChange={(v) => update("showGeneralLocation", v)} />
                  <ToggleRow label="Pronouns" checked={settings.showPronouns} onChange={(v) => update("showPronouns", v)} />
                  <ToggleRow label="Orientation" checked={settings.showOrientation} onChange={(v) => update("showOrientation", v)} />
                  <ToggleRow label="Relationship status" checked={settings.showRelationshipStatus} onChange={(v) => update("showRelationshipStatus", v)} />
                </div>

                {/* Why I&apos;m Here */}
                <div className="border-t border-[#e8ddd2] pt-4 space-y-1">
                  <h3 className="text-sm font-semibold text-[#1a0f0a] mb-2">Why I&apos;m Here</h3>
                  <ToggleRow label="Why I joined" checked={settings.showWhyJoined} onChange={(v) => update("showWhyJoined", v)} />
                  <ToggleRow label="Preferred kinds of connection" checked={settings.showConnectionIntentions} onChange={(v) => update("showConnectionIntentions", v)} />
                  <ToggleRow label="Interests" checked={settings.showInterests} onChange={(v) => update("showInterests", v)} />
                </div>

                {/* A Little Deeper */}
                <div className="border-t border-[#e8ddd2] pt-4 space-y-1">
                  <h3 className="text-sm font-semibold text-[#1a0f0a] mb-2">A Little Deeper</h3>
                  <ToggleRow label="Quiz result" checked={settings.showQuizResult} onChange={(v) => update("showQuizResult", v)} />
                  <ToggleRow label="Preferred ways to connect" checked={settings.showConnectionComfortLevel} onChange={(v) => update("showConnectionComfortLevel", v)} />
                  <ToggleRow label="Selected reflection" checked={settings.showSelectedReflection} onChange={(v) => update("showSelectedReflection", v)} />
                </div>

                {/* Community Activity */}
                <div className="border-t border-[#e8ddd2] pt-4 space-y-1">
                  <h3 className="text-sm font-semibold text-[#1a0f0a] mb-2">Community Activity</h3>
                  <ToggleRow label="Recent posts" checked={settings.showRecentPosts} onChange={(v) => update("showRecentPosts", v)} />
                </div>

                <p className="text-sm text-[#a0704a] italic">
                  You decide how much of yourself to share. You can change these settings at any time.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-[#e8ddd2]">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsOpen(false)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={saving || loading}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
