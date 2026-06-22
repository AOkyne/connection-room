"use client";

import { useState } from "react";
import { Profile, updateProfile } from "@/lib/data/profiles";
import { Button } from "@/components/Button";

interface PhotoRequirementPromptProps {
  profile: Profile;
  onPhotoAdded?: () => void;
}

export function PhotoRequirementPrompt({
  profile,
  onPhotoAdded,
}: PhotoRequirementPromptProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [uploading, setUploading] = useState(false);

  if (profile.profilePhoto || profile.photo_confirmed || !isOpen) {
    return null;
  }

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        await updateProfile({
          profilePhoto: dataUrl,
          photo_confirmed: true,
          photo_confirmed_at: new Date(),
        });
        setIsOpen(false);
        onPhotoAdded?.();
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#2a2318] mb-2">
            Add Your Photo
          </h2>
          <p className="text-[#6b5f52]">
            To participate in the community, we ask that you add a real photo of yourself.
            It helps members recognize you and builds authentic connection.
          </p>
        </div>

        <div className="bg-[#f3ede5] p-4 rounded-lg">
          <p className="text-sm text-[#6b5f52]">
            Your photo helps us maintain the authentic, respectful space we've built together.
          </p>
        </div>

        <div>
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
              }}
              disabled={uploading}
              className="hidden"
              id="photo-upload"
            />
            <div className="w-full px-4 py-3 border-2 border-dashed border-[#d4a574] rounded-lg text-center cursor-pointer hover:bg-[#f3ede5] transition-colors">
              <label htmlFor="photo-upload" className="cursor-pointer">
                <span className="text-[#d4a574] font-medium">
                  {uploading ? "Uploading..." : "Click to upload your photo"}
                </span>
                <p className="text-xs text-[#a0968a] mt-1">
                  JPG, PNG, or GIF. Max 5MB.
                </p>
              </label>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsOpen(false)}
            className="flex-1"
            disabled={uploading}
          >
            Dismiss
          </Button>
        </div>

        <p className="text-xs text-[#a0968a] text-center">
          Note: You can browse and join spaces, but posting, commenting, and reacting require a photo.
        </p>
      </div>
    </div>
  );
}
