"use client";

import { useState, useEffect } from "react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/data/profiles";
import { Button } from "@/components/Button";

const FREQUENCY_OPTIONS: Array<{
  id: NotificationPreferences["frequency"];
  label: string;
  desc: string;
}> = [
  {
    id: "immediate",
    label: "Right away",
    desc: "An email as soon as someone posts in one of your spaces",
  },
  {
    id: "daily",
    label: "Daily digest",
    desc: "One email a day, only if there's something new",
  },
  {
    id: "weekly",
    label: "Weekly digest",
    desc: "One email a week summarizing new posts across your spaces",
  },
  {
    id: "off",
    label: "Don't email me",
    desc: "You'll still see new posts in the app, just no email",
  },
];

interface NotificationPreferencesSettingsProps {
  onSave?: () => void;
}

// How often a member hears about new space activity by email. Mirrors
// ProfileVisibilitySettings.tsx's modal/save-cancel skeleton -- reads/
// writes via getNotificationPreferences/updateNotificationPreferences,
// which target `profiles` directly (this setting has no visibility
// dimension, unlike the show_*/profile_visibility flags on public_profiles).
export function NotificationPreferencesSettings({ onSave }: NotificationPreferencesSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState<NotificationPreferences["frequency"]>("daily");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getNotificationPreferences().then((prefs) => {
      if (prefs) setFrequency(prefs.frequency);
      setLoading(false);
    });
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences({ frequency });
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
        Notification Preferences
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">
              How often should we email you?
            </h2>

            {loading ? (
              <p className="text-sm text-[#a0704a]">Loading your settings...</p>
            ) : (
              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f3ede5] cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="notificationFrequency"
                      value={option.id}
                      checked={frequency === option.id}
                      onChange={() => setFrequency(option.id)}
                      className="w-5 h-5 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[#1a0f0a]">{option.label}</p>
                      <p className="text-xs text-[#a0704a]">{option.desc}</p>
                    </div>
                  </label>
                ))}
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
