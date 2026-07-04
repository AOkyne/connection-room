"use client";

import { useEffect, useState } from "react";
import { withTimeout } from "@/lib/utils/with-timeout";
import {
  getGuidedRhythmProgress,
  ensureGuidedRhythmExists,
  getCurrentMonthAndWeek,
  savePrivateReflection,
  getPrivateReflection,
  setMonthlyIntention,
  getMonthlyIntention,
  getRhythmContent,
} from "@/lib/data/guided-rhythm";
import { Month } from "@/lib/types/guided-rhythm";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { MonthlyThemeCard } from "./MonthlyThemeCard";
import { WeeklyPromptCard } from "./WeeklyPromptCard";
import { PrivateReflectionBox } from "./PrivateReflectionBox";
import { CommunityInvitationCard } from "./CommunityInvitationCard";
import { PrivateReflectionFeedback } from "@/components/feedback";

export function GuidedRhythmOverview() {
  const [progress, setProgress] = useState<any>(null);
  const [rhythmContent, setRhythmContent] = useState<Month[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyReflection, setWeeklyReflection] = useState("");
  const [selectedIntention, setSelectedIntention] = useState("");
  const [showIntentionModal, setShowIntentionModal] = useState(false);
  const [customIntention, setCustomIntention] = useState("");
  const [reflectionSavedFeedback, setReflectionSavedFeedback] = useState(false);

  const { month, week } = getCurrentMonthAndWeek();
  const currentMonth = rhythmContent.find((m) => m.monthNumber === month);
  const currentWeek = currentMonth?.weeks.find((w) => w.weekNumber === week);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      await ensureGuidedRhythmExists();
      // FAST: Load only progress and content structure (needed for month/week display)
      const [p, content] = await Promise.all([
        withTimeout(getGuidedRhythmProgress(), 5000, null),
        withTimeout(getRhythmContent(), 5000, [])
      ]);

      setProgress(p);
      setRhythmContent(content);
      setLoading(false); // Show page immediately with current month/week

      // BACKGROUND: Load reflections and intention (non-blocking)
      const currentMon = content.find((m) => m.monthNumber === month);
      if (currentMon) {
        const [reflection, intention] = await Promise.all([
          withTimeout(getPrivateReflection(month, week), 3000, null),
          withTimeout(getMonthlyIntention(month), 3000, null),
        ]);

        setWeeklyReflection(reflection || "");
        setSelectedIntention(intention || "");
      }
    } catch (error) {
      console.warn("Error loading guided rhythm:", error);
      setLoading(false);
    }
  }

  async function handleSaveWeeklyReflection(text: string) {
    try {
      await savePrivateReflection(month, week, text);
      setWeeklyReflection(text);
      setReflectionSavedFeedback(true);
    } catch (error) {
      console.warn("Error saving weekly reflection:", error);
    }
  }

  async function handleSetIntention(intention: string) {
    await setMonthlyIntention(month, intention);
    setSelectedIntention(intention);
    setShowIntentionModal(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#1a0f0a]">Loading your rhythm...</p>
      </div>
    );
  }

  if (!currentMonth || !currentWeek || !progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#1a0f0a]">Unable to load your rhythm</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Reflection Saved Feedback */}
      {reflectionSavedFeedback && (
        <PrivateReflectionFeedback
          onClose={() => setReflectionSavedFeedback(false)}
        />
      )}

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-[#1a0f0a]">
          Your Guided Rhythm
        </h2>
        <p className="text-[#1a0f0a]">
          This is a rhythm, not a requirement. Return when you can.
        </p>
      </div>

      {/* Monthly Theme */}
      <MonthlyThemeCard
        month={currentMonth}
        onSelectRitualOption={handleSetIntention}
      />

      {/* Monthly Intention */}
      <Card className="bg-gradient-to-br from-[#c97a2a]/5 to-[#d4a348]/5">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1a0f0a]">
              Your Monthly Intention
            </h3>
            <p className="text-sm text-[#1a0f0a] mt-2">
              {selectedIntention
                ? `Your intention: ${selectedIntention}`
                : "Choose or write an intention for this month"}
            </p>
          </div>

          <Button
            onClick={() => setShowIntentionModal(true)}
            variant="outline"
            size="sm"
          >
            {selectedIntention ? "Change Intention" : "Set Intention"}
          </Button>
        </div>
      </Card>

      {/* Weekly Prompt */}
      <WeeklyPromptCard week={currentWeek} isCurrentWeek />

      {/* Private Reflection */}
      <PrivateReflectionBox
        prompt={currentWeek.privateReflection}
        savedReflection={weeklyReflection}
        onSave={handleSaveWeeklyReflection}
      />

      {/* Community Invitation */}
      <CommunityInvitationCard
        title={currentWeek.title}
        invitation={currentWeek.communityInvitation}
        onShare={() => {
          // This will be handled by the parent component or through navigation
          window.location.href = "/app/spaces/commons";
        }}
      />

      {/* Intention Modal */}
      {showIntentionModal && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowIntentionModal(false);
            }
          }}
        >
          <Card className="w-full max-w-md mx-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#1a0f0a]">
                What would you like to cultivate this month?
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                <button
                  onClick={() =>
                    handleSetIntention(
                      "Continue practicing small honesty"
                    )
                  }
                  className="text-left px-3 py-2 rounded-lg text-sm text-[#1a0f0a] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Continue practicing small honesty
                </button>
                <button
                  onClick={() => handleSetIntention("Notice my body more")}
                  className="text-left px-3 py-2 rounded-lg text-sm text-[#1a0f0a] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Notice my body more
                </button>
                <button
                  onClick={() => handleSetIntention("Practice asking for what I need")}
                  className="text-left px-3 py-2 rounded-lg text-sm text-[#1a0f0a] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Practice asking for what I need
                </button>
                <button
                  onClick={() => handleSetIntention("Show up for my community")}
                  className="text-left px-3 py-2 rounded-lg text-sm text-[#1a0f0a] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Show up for my community
                </button>
                <button
                  onClick={() => handleSetIntention("Be gentler with myself")}
                  className="text-left px-3 py-2 rounded-lg text-sm text-[#1a0f0a] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Be gentler with myself
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#e8ddd2]">
                <p className="text-xs text-[#c97a2a] font-medium uppercase tracking-wide">
                  Or write your own
                </p>
                <textarea
                  value={customIntention}
                  onChange={(e) => setCustomIntention(e.target.value)}
                  placeholder="Your intention..."
                  className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm text-[#1a0f0a] bg-white"
                  rows={2}
                />
                <Button
                  onClick={() =>
                    customIntention && handleSetIntention(customIntention)
                  }
                  disabled={!customIntention}
                  size="sm"
                >
                  Save Custom Intention
                </Button>
              </div>

              <button
                onClick={() => setShowIntentionModal(false)}
                className="px-3 py-2 text-sm text-[#1a0f0a] hover:bg-[#f3ede5] rounded"
              >
                Close
              </button>
            </div>
          </Card>
        </dialog>
      )}
    </div>
  );
}
