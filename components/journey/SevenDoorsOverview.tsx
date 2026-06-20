"use client";

import { useEffect, useState } from "react";
import { firstWeekJourney, firstMonthIntentions, journeyCompletionMessage } from "@/lib/content/first-week-journey";
import {
  getJourneyProgress,
  completeDoor,
  savePrivateReflection,
  getPrivateReflection,
  setFirstMonthIntention,
  ensureJourneyExists,
} from "@/lib/data/first-week-journey";
import { DoorCard } from "./DoorCard";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export function SevenDoorsOverview() {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedReflections, setSavedReflections] = useState<Record<number, string>>({});
  const [showIntentionModal, setShowIntentionModal] = useState(false);
  const [customIntention, setCustomIntention] = useState("");

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      await ensureJourneyExists();
      const p = await getJourneyProgress();
      setProgress(p);

      // Load saved reflections for all doors
      const reflections: Record<number, string> = {};
      for (let i = 1; i <= 7; i++) {
        const reflection = await getPrivateReflection(i);
        if (reflection) {
          reflections[i] = reflection;
        }
      }
      setSavedReflections(reflections);
    } catch (error) {
      console.error("Error loading journey progress:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteDoor(doorNumber: number) {
    try {
      const updated = await completeDoor(doorNumber);
      if (updated) {
        setProgress(updated);
      }
    } catch (error) {
      console.error("Error completing door:", error);
    }
  }

  async function handleSaveReflection(doorNumber: number, reflection: string) {
    try {
      await savePrivateReflection(doorNumber, reflection);
      setSavedReflections((prev) => ({
        ...prev,
        [doorNumber]: reflection,
      }));
    } catch (error) {
      console.error("Error saving reflection:", error);
    }
  }

  async function handleSetIntention(intention: string) {
    try {
      await setFirstMonthIntention(intention);
      const updated = await getJourneyProgress();
      if (updated) {
        setProgress(updated);
      }
      setShowIntentionModal(false);
    } catch (error) {
      console.error("Error setting intention:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6b5f52]">Loading your journey...</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6b5f52]">Unable to load your journey</p>
      </div>
    );
  }

  const isComplete = progress.completedDoors.length === 7;

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#2a2318]">
            The Seven Doors of Connection
          </h2>
          <div className="text-right">
            <p className="text-sm text-[#6b5f52]">
              {progress.completedDoors.length} of 7 doors completed
            </p>
            <div className="w-32 h-2 bg-[#e8ddd2] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-[#d4a574] to-[#8fa878] transition-all"
                style={{
                  width: `${(progress.completedDoors.length / 7) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-[#6b5f52] leading-relaxed">
          A guided first week in The Connection Room. Each door is an invitation
          to a different aspect of authentic connection.
        </p>
      </div>

      {/* Completion Message */}
      {isComplete && (
        <Card className="bg-gradient-to-br from-[#f3ede5] to-[#f8f6f2] border-l-4 border-[#8fa878]">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#2a2318]">
              {journeyCompletionMessage.title}
            </h3>
            <p className="text-sm text-[#6b5f52] leading-relaxed">
              {journeyCompletionMessage.message}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {journeyCompletionMessage.nextSteps.map((step) => (
                <a
                  key={step.href}
                  href={step.href}
                  className="text-sm text-[#d4a574] hover:text-[#8fa878] font-medium"
                >
                  {step.title} →
                </a>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Doors Grid */}
      <div className="space-y-4">
        {firstWeekJourney.map((door) => (
          <DoorCard
            key={door.doorNumber}
            door={door}
            isCompleted={progress.completedDoors.includes(door.doorNumber)}
            isCurrentDoor={progress.currentDoor === door.doorNumber}
            onActionClick={(actionId) => {
              // Handle action navigation
              const action = door.actions.find((a) => a.id === actionId);
              if (action?.href) {
                window.location.href = action.href;
              }
            }}
            onComplete={() => handleCompleteDoor(door.doorNumber)}
            onReflectionSave={(reflection) =>
              handleSaveReflection(door.doorNumber, reflection)
            }
            savedReflection={savedReflections[door.doorNumber]}
          />
        ))}
      </div>

      {/* Intention Selection */}
      {progress.completedDoors.includes(7) && !isComplete && (
        <Card className="bg-[#f3ede5] border-l-4 border-[#d4a574]">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#2a2318]">
              Choose Your First Month Intention
            </h3>
            <p className="text-sm text-[#6b5f52]">
              {progress.selectedIntention
                ? `Your intention: ${progress.selectedIntention}`
                : "Select an intention for your first month in The Connection Room"}
            </p>
            <Button
              onClick={() => setShowIntentionModal(true)}
              variant="outline"
              size="sm"
            >
              {progress.selectedIntention ? "Change Intention" : "Choose Intention"}
            </Button>
          </div>
        </Card>
      )}

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
                Choose Your First Month Intention
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {firstMonthIntentions.map((intention) => (
                  <button
                    key={intention}
                    onClick={() => handleSetIntention(intention)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6b5f52] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
                  >
                    {intention}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide">
                  Or write your own
                </p>
                <textarea
                  value={customIntention}
                  onChange={(e) => setCustomIntention(e.target.value)}
                  placeholder="Write a custom intention..."
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
