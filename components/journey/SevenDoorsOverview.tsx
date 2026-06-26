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
import { withTimeout } from "@/lib/utils/with-timeout";
import { DoorCard } from "./DoorCard";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { DoorCompletionFeedback, PrivateReflectionFeedback } from "@/components/feedback";

export function SevenDoorsOverview() {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedReflections, setSavedReflections] = useState<Record<number, string>>({});
  const [showIntentionModal, setShowIntentionModal] = useState(false);
  const [customIntention, setCustomIntention] = useState("");
  const [completedDoorFeedback, setCompletedDoorFeedback] = useState<number | null>(null);
  const [savedReflectionFeedback, setSavedReflectionFeedback] = useState<number | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      await ensureJourneyExists();
      // FAST: Load only progress (needed for current door) - critical path
      const p = await withTimeout(getJourneyProgress(), 5000, null);
      setProgress(p);
      setLoading(false); // Show page immediately with current door

      // BACKGROUND: Load reflections later (not blocking render)
      const reflectionPromises = Array.from({ length: 7 }, (_, i) =>
        withTimeout(getPrivateReflection(i + 1), 3000, null)
      );
      const reflectionsArray = await Promise.all(reflectionPromises);

      const reflections: Record<number, string> = {};
      reflectionsArray.forEach((reflection, index) => {
        if (reflection) {
          reflections[index + 1] = reflection;
        }
      });
      setSavedReflections(reflections);
    } catch (error) {
      console.warn("Error loading journey progress:", error);
      setLoading(false);
    }
  }

  async function handleCompleteDoor(doorNumber: number) {
    try {
      const updated = await completeDoor(doorNumber);
      if (updated) {
        setProgress(updated);
        setCompletedDoorFeedback(doorNumber);
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
      setSavedReflectionFeedback(doorNumber);
    } catch (error) {
      console.warn("Error saving reflection:", error);
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

  // Get current and next door info for feedback
  const completedDoor = completedDoorFeedback ? firstWeekJourney.find(d => d.doorNumber === completedDoorFeedback) : null;
  const nextDoor = completedDoor ? firstWeekJourney.find(d => d.doorNumber === completedDoor.doorNumber + 1) : null;

  return (
    <div className="space-y-8">
      {/* Reflection Saved Feedback */}
      {savedReflectionFeedback && (
        <PrivateReflectionFeedback
          onClose={() => setSavedReflectionFeedback(null)}
        />
      )}

      {/* Door Completion Feedback */}
      {completedDoorFeedback && completedDoor && (
        <DoorCompletionFeedback
          doorNumber={completedDoor.doorNumber}
          doorTitle={completedDoor.title}
          nextDoorNumber={nextDoor?.doorNumber}
          nextDoorTitle={nextDoor?.title}
          onViewNext={nextDoor ? () => setCompletedDoorFeedback(null) : undefined}
          onClose={() => setCompletedDoorFeedback(null)}
        />
      )}

      {/* Progress Header */}
      <div className="space-y-4">
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

        {/* Door Overview Grid - Show all 7 doors at a glance */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-4 bg-[#f3ede5] rounded-lg">
          {firstWeekJourney.map((door) => {
            const isCompleted = progress.completedDoors.includes(door.doorNumber);
            const isCurrent = progress.currentDoor === door.doorNumber;

            return (
              <div
                key={door.doorNumber}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all ${
                  isCompleted
                    ? "bg-[#8fa878] text-white"
                    : isCurrent
                    ? "bg-[#d4a574] text-white ring-2 ring-[#6b5f52] ring-offset-2 ring-offset-[#f3ede5]"
                    : "bg-white text-[#6b5f52] border border-[#d4a574]"
                }`}
                title={door.title}
              >
                <div className="text-base sm:text-lg font-bold">{door.doorNumber}</div>
                <div className="text-xs text-center leading-tight line-clamp-2 min-h-8">
                  {door.title.split(" ").slice(0, 2).join(" ")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Door Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-[#6b5f52]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#8fa878] rounded" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#d4a574] rounded ring-2 ring-[#6b5f52]" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-[#d4a574] rounded" />
            <span>Coming</span>
          </div>
        </div>
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

      {/* Current Door Only */}
      <div className="space-y-4">
        {firstWeekJourney.find(d => d.doorNumber === progress.currentDoor) && (
          <DoorCard
            door={firstWeekJourney.find(d => d.doorNumber === progress.currentDoor)!}
            isCompleted={progress.completedDoors.includes(progress.currentDoor)}
            isCurrentDoor={true}
            onActionClick={(action) => {
              // Handle action navigation for links
              if (action.type === "link" || action.type === "profile" || action.type === "quiz" || action.type === "connection") {
                if (action.href) {
                  window.location.href = action.href;
                }
              }
            }}
            onComplete={() => handleCompleteDoor(progress.currentDoor)}
            onReflectionSave={(reflection) =>
              handleSaveReflection(progress.currentDoor, reflection)
            }
            savedReflection={savedReflections[progress.currentDoor]}
          />
        )}
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
                    className="text-left px-3 py-2 rounded-lg text-sm text-[#6b5f52] hover:bg-[#f3ede5] transition-colors border border-[#e8ddd2]"
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
                >
                  Save Custom Intention
                </Button>
              </div>

              <button
                onClick={() => setShowIntentionModal(false)}
                className="px-3 py-2 text-sm text-[#6b5f52] hover:bg-[#f3ede5] rounded"
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
