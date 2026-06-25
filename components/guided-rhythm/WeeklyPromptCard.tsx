"use client";

import { useState, useEffect } from "react";
import { WeeklyPrompt } from "@/lib/types/guided-rhythm";
import { Card } from "@/components/Card";
import { getProfile, saveProfile } from "@/lib/data/profiles";

const PAIRING_FORMATS = [
  { id: "text", label: "Text-only", description: "Written messages" },
  { id: "audio", label: "Audio call", description: "Phone/voice call" },
  { id: "video", label: "Video call", description: "Face-to-face video" },
  { id: "in-person", label: "In-person meeting", description: "Face-to-face in person" },
];

interface WeeklyPromptCardProps {
  week: WeeklyPrompt;
  isCurrentWeek?: boolean;
}

export function WeeklyPromptCard({
  week,
  isCurrentWeek = false,
}: WeeklyPromptCardProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [selectedPairingFormat, setSelectedPairingFormat] = useState<string | null>(null);

  useEffect(() => {
    const loadPairingPreference = async () => {
      const profile = await getProfile();
      if (profile?.pairingComfortLevel) {
        setSelectedPairingFormat(profile.pairingComfortLevel);
      }
    };
    loadPairingPreference();
  }, []);

  const handleShare = async () => {
    if (!shareContent.trim()) return;
    setIsSharing(true);
    try {
      // TODO: Implement actual sharing to The Commons
      console.log("Sharing to The Commons:", shareContent);
      setShareContent("");
      setShowShareModal(false);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSelectPairingFormat = async (formatId: string) => {
    setSelectedPairingFormat(formatId);
    try {
      const profile = await getProfile();
      if (profile) {
        await saveProfile({
          ...profile,
          pairingComfortLevel: formatId,
        });
      }
    } catch (error) {
      console.error("Error saving pairing preference:", error);
    }
  };
  return (
    <Card
      className={`${
        isCurrentWeek
          ? "ring-2 ring-[#d4a574] bg-white"
          : "bg-[#f8f6f2]"
      }`}
    >
      <div className="space-y-4">
        {/* Week Header */}
        <div className="flex items-baseline gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#f3ede5]">
            <span className="text-[#d4a574] font-bold">W{week.weekNumber}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#2a2318]">
              {week.title}
            </h3>
            {isCurrentWeek && (
              <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide mt-1">
                This Week
              </p>
            )}
          </div>
        </div>

        {/* Dashboard Prompt */}
        <div className="bg-gradient-to-r from-[#f3ede5] to-white rounded-lg p-4 border-l-4 border-[#d4a574]">
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            Today's Invitation
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed italic">
            {week.dashboardPrompt}
          </p>
        </div>

        {/* Private Reflection */}
        <div>
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            Private Reflection
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed">
            {week.privateReflection}
          </p>
        </div>

        {/* Community Invitation */}
        <div className="bg-[#f3ede5] rounded-lg p-4">
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            If You Want to Share
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed mb-3">
            {week.communityInvitation}
          </p>
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 bg-[#d4a574] text-[#ffffff] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
          >
            Share to The Commons
          </button>
        </div>

        {/* Pairing Format Selection */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
              For Connections
            </p>
            <p className="text-sm text-[#6b5f52] leading-relaxed mb-3">
              {week.pairingPrompt}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
              Your Preferred Format
            </p>
            <div className="flex flex-wrap gap-3">
              {PAIRING_FORMATS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => handleSelectPairingFormat(format.id)}
                  className={`px-3 py-2 rounded-lg transition-colors text-xs ${
                    selectedPairingFormat === format.id
                      ? "bg-[#d4a574] text-[#ffffff] border border-[#d4a574]"
                      : "bg-[#f3ede5] text-[#2a2318] border border-[#e8ddd2] hover:border-[#d4a574]"
                  }`}
                  title={format.description}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Microcopy */}
        <div className="pt-3 border-t border-[#e8ddd2]">
          <p className="text-xs text-[#a0968a] italic">
            Use what speaks to you. Leave what does not. A small honest
            reflection is enough.
          </p>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShareModal(false);
            }
          }}
        >
          <Card className="w-full max-w-2xl mx-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#2a2318]">
                  Share to The Commons
                </h3>
                <p className="text-sm text-[#6b5f52] mt-1">
                  {week.communityInvitation}
                </p>
              </div>

              <textarea
                value={shareContent}
                onChange={(e) => setShareContent(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-sm text-[#2a2318] bg-white"
                rows={6}
              />

              <p className="text-xs text-[#8fa878]">A sentence or two is enough. No need to write a memoir unless the memoir insists.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 text-sm text-[#6b5f52] hover:bg-[#f3ede5] rounded border border-[#e8ddd2]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={!shareContent.trim() || isSharing}
                  className="flex-1 px-4 py-2 text-sm bg-[#d4a574] text-[#ffffff] rounded hover:bg-[#c09560] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSharing ? "Sharing..." : "Post to The Commons"}
                </button>
              </div>
            </div>
          </Card>
        </dialog>
      )}
    </Card>
  );
}
