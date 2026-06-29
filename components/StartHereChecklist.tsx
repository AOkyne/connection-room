"use client";

import { useState, useEffect } from "react";
import { getChecklist, toggleChecklistItem, getChecklistProgress, getCompletedCount, type ChecklistItem } from "@/lib/data/checklist";
import { Card, CardHeader } from "@/components/Card";

export function StartHereChecklist() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const items = getChecklist();
    setChecklist(items);
    setProgress(getChecklistProgress());
    setMounted(true);
  }, []);

  const handleToggle = (itemId: string) => {
    toggleChecklistItem(itemId);
    const updated = getChecklist();
    setChecklist(updated);
    setProgress(getChecklistProgress());
  };

  if (!mounted) {
    return null;
  }

  const completed = getCompletedCount();

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7]">
      <CardHeader
        title="How To Begin"
        subtitle={`${completed} of ${checklist.length} complete`}
      />

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#1a0f0a]">Your Progress</span>
          <span className="text-sm font-medium text-[#c97a2a]">{progress}%</span>
        </div>
        <div className="w-full bg-[#e8ddd2] rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#c97a2a] to-[#d4a348] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklist.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-white hover:bg-[#faf7f2] cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleToggle(item.id)}
              className="w-5 h-5 mt-0.5 accent-[#c97a2a] cursor-pointer"
            />
            <div className="flex-1">
              <p className={`font-medium ${item.completed ? "line-through text-[#a0704a]" : "text-[#1a0f0a]"}`}>
                {item.title}
              </p>
              <p className="text-sm text-[#1a0f0a] mt-1">
                {item.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      {completed === checklist.length && (
        <div className="mt-4 p-3 bg-[#c97a2a]/10 border border-[#c97a2a]/30 rounded-lg">
          <p className="text-sm font-medium text-[#c97a2a]">
            ✓ You've completed all the onboarding steps! You can now leave Start Here anytime.
          </p>
        </div>
      )}
    </Card>
  );
}
