"use client";

import { useState, useEffect } from "react";
import { Profile, updateProfile } from "@/lib/data/profiles";
import { Button } from "@/components/Button";

interface ProfileVisibilitySettingsProps {
  profile: Profile;
  onSave?: () => void;
}

export function ProfileVisibilitySettings({
  profile,
  onSave,
}: ProfileVisibilitySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    show_in_member_lists: profile.show_in_member_lists ?? true,
    profile_visibility: profile.profile_visibility || "space_members",
    show_general_location: profile.show_general_location ?? true,
    show_recent_posts: profile.show_recent_posts ?? true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(settings);
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
        className="text-sm text-[#d4a574] hover:text-[#c9956d] font-medium"
      >
        Privacy Settings
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-[#2a2318]">
              Profile Visibility
            </h2>

            <div className="space-y-4">
              {/* Show in member lists */}
              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f3ede5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_in_member_lists}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      show_in_member_lists: e.target.checked,
                    })
                  }
                  className="w-5 h-5 mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-[#2a2318]">
                    Show in member lists
                  </p>
                  <p className="text-sm text-[#a0968a]">
                    Allow others to see you in space directories
                  </p>
                </div>
              </label>

              {/* Visibility level */}
              <div className="border-t border-[#e8ddd2] pt-4">
                <label className="block text-sm font-medium text-[#2a2318] mb-3">
                  Who can view your full profile?
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "space_members",
                      label: "Space members only",
                      desc: "Only people in your shared spaces",
                    },
                    {
                      id: "all_authenticated_members",
                      label: "All community members",
                      desc: "Anyone logged into the community",
                    },
                    {
                      id: "limited",
                      label: "Limited profile",
                      desc: "Only your name and photo",
                    },
                  ].map((option) => (
                    <label
                      key={option.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f3ede5] cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.id}
                        checked={settings.profile_visibility === option.id}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            profile_visibility: e.target.value as 'space_members' | 'all_authenticated_members' | 'limited',
                          })
                        }
                        className="w-5 h-5 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[#2a2318]">
                          {option.label}
                        </p>
                        <p className="text-xs text-[#a0968a]">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Show location */}
              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f3ede5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_general_location}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      show_general_location: e.target.checked,
                    })
                  }
                  className="w-5 h-5 mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-[#2a2318]">
                    Show your location
                  </p>
                  <p className="text-sm text-[#a0968a]">
                    Display your city/state on your profile
                  </p>
                </div>
              </label>

              {/* Show recent posts */}
              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f3ede5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_recent_posts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      show_recent_posts: e.target.checked,
                    })
                  }
                  className="w-5 h-5 mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-[#2a2318]">
                    Show recent posts
                  </p>
                  <p className="text-sm text-[#a0968a]">
                    Display your recent posts on your profile
                  </p>
                </div>
              </label>
            </div>

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
                disabled={saving}
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
