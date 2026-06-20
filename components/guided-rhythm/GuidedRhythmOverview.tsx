"use client";

import { useEffect, useState } from "react";
import { guidedRhythm } from "@/lib/content/guided-rhythm";
import {
  getGuidedRhythmProgress,
  ensureGuidedRhythmExists,
  getCurrentMonthAndWeek,
  savePrivateReflection,
  getPrivateReflection,
  saveMonthlyIntegration,
  getMonthlyIntegration,
  setMonthlyIntention,
  getMonthlyIntention,
} from "@/lib/data/guided-rhythm";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { MonthlyThemeCard } from "./MonthlyThemeCard";
import { WeeklyPromptCard } from "./WeeklyPromptCard";
import { PrivateReflectionBox } from "./PrivateReflectionBox";
import { MonthlyIntegrationCard } from "./MonthlyIntegrationCard";
import { CommunityInvitationCard } from "./CommunityInvitationCard";

export function GuidedRhythmOverview() {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyReflection, setWeeklyReflection] = useState("");
  const [monthlyIntegrationText, setMonthlyIntegrationText] = useState("");
  const [selectedIntention, setSelectedIntention] = useState("");
  const [showIntentionModal, setShowIntentionModal] = useState(false);
  const [customIntention, setCustomIntention] = useState("");

  const { month, week } = getCurrentMonthAndWeek();
  const currentMonth = guidedRhythm.find((m) => m.monthNumber === month);
  const currentWeek = currentMonth?.weeks.find((w) => w.weekNumber === week);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      await ensureGuidedRhythmExists();
      const p = await getGuidedRhythmProgress();
      setProgress(p);

      if (currentMonth && currentWeek) {
        const reflection = await getPrivateReflection(month, week);
        setWeeklyReflection(reflection || "");

        const integration = await getMonthlyIntegration(month);
        setMonthlyIntegrationText(integration || "");

        const intention = await getMonthlyIntention(month);
        setSelectedIntention(intention || "");
      }
    } catch (error) {
      console.error("Error loading guided rhythm:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWeeklyReflection(text: string) {
    await savePrivateReflection(month, week, text);
    setWeeklyReflection(text);
  }

  async function handleSaveMonthlyIntegration(text: string) {
    await saveMonthlyIntegration(month, text);
    setMonthlyIntegrationText(text);
  }

  async function handleSetIntention(intention: string) {
    await setMonthlyIntention(month, intention);
    setSelectedIntention(intention);
    setShowIntentionModal(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6b5f52]">Loading your rhythm...</p>
      </div>
    );
  }

  if (!currentMonth || !currentWeek || !progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6b5f52]">Unable to load your rhythm</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-[#2a2318]">
          Your Guided Rhythm
        </h2>
        <p className="text-[#6b5f52]">
          This is a rhythm, not a requirement. Return when you can.
        </p>
      </div>

      {/* Monthly Theme */}
      <MonthlyThemeCard month={currentMonth} />

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

      {/* Monthly Integration */}
      <MonthlyIntegrationCard
        integration={currentMonth.integration}
        monthNumber={month}
        savedIntegration={monthlyIntegrationText}
        onSave={handleSaveMonthlyIntegration}
      />

      {/* Monthly Intention */}
      <Card className="bg-gradient-to-br from-[#8fa878]/5 to-[#d4a574]/5">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#2a2318]">
              Your Monthly Intention
            </h3>
            <p className="text-sm text-[#6b5f52] mt-2">
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
              <h3 className="text-lg font-semibold text-[#2a2318]">
                What would you like to cultivate this month?
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                <button
                  onClick={() =>
                    handleSetIntention(
                      "Continue practicing small honesty"
                    )
                  }
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b5f52] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Continue practicing small honesty
                </button>
                <button
                  onClick={() => handleSetIntention("Notice my body more")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b5f52] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Notice my body more
                </button>
                <button
                  onClick={() => handleSetIntention("Practice asking for what I need")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b5f52] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Practice asking for what I need
                </button>
                <button
                  onClick={() => handleSetIntention("Show up for my community")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b5f52] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Show up for my community
                </button>
                <button
                  onClick={() => handleSetIntention("Be gentler with myself")}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b5f52] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                >
                  Be gentler with myself
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#e8ddd2]">
                <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide">
                  Or write your own
                </p>
                <textarea
                  value={customIntention}
                  onChange={(e) => setCustomIntention(e.target.value)}
                  placeholder="Your intention..."
                  className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-sm text-[#2a2318] bg-white"
                  rows={2}
                />
                <Button
                  onClick={() =>
                    customIntention && handleSetIntention(customIntention)
                  }
                  disabled={!customIntention}
                  size="sm"
                  className="w-full"
                >
                  Save Custom Intention
                </Button>
              </div>

              <button
                onClick={() => setShowIntentionModal(false)}
                className="w-full px-3 py-2 text-sm text-[#6b5f52] hover:bg-[#f3ede5] rounded"
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
