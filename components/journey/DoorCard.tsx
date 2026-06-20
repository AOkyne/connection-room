"use client";

import { useState } from "react";
import { Door } from "@/lib/content/first-week-journey";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface DoorCardProps {
  door: Door;
  isCompleted: boolean;
  isCurrentDoor: boolean;
  onActionClick: (actionId: string) => void;
  onComplete: () => void;
  onReflectionSave: (reflection: string) => void;
  savedReflection?: string;
}

export function DoorCard({
  door,
  isCompleted,
  isCurrentDoor,
  onActionClick,
  onComplete,
  onReflectionSave,
  savedReflection,
}: DoorCardProps) {
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState(savedReflection || "");

  const handleSaveReflection = () => {
    onReflectionSave(reflectionText);
    setShowReflection(false);
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isCompleted ? "opacity-75 bg-[#f3ede5]" : "bg-white"
      } ${isCurrentDoor ? "ring-2 ring-[#d4a574]" : ""}`}
    >
      {/* Visual door indicator */}
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-[#d4a574] to-[#8fa878] opacity-30" />

      {/* Door Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-baseline gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              isCompleted
                ? "bg-[#8fa878] text-white"
                : "bg-[#f3ede5] text-[#d4a574]"
            }`}
          >
            {door.doorNumber}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#2a2318]">
              {door.title}
            </h3>
            <p className="text-sm text-[#6b5f52] italic">{door.theme}</p>
          </div>
        </div>
        {isCompleted && (
          <span className="text-xs font-medium text-[#8fa878] px-2 py-1 bg-[#8fa878]/10 rounded">
            Completed
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-[#6b5f52] mb-4 leading-relaxed">
        {door.description}
      </p>

      {/* Invitation */}
      <div className="bg-[#f3ede5] rounded-lg p-4 mb-4">
        <p className="text-sm text-[#2a2318] leading-relaxed">
          {door.invitation}
        </p>
      </div>

      {/* Empty State Message */}
      {door.emptyStateMessage && (
        <div className="bg-[#f8f6f2] rounded-lg p-3 mb-4 border-l-2 border-[#d4a574]">
          <p className="text-xs text-[#6b5f52] leading-relaxed">
            {door.emptyStateMessage}
          </p>
        </div>
      )}

      {/* Reflection Question */}
      <div className="mb-4 pb-4 border-b border-[#e8ddd2]">
        <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
          Reflection
        </p>
        <p className="text-sm text-[#6b5f52] italic">{door.reflection}</p>
      </div>

      {/* Actions */}
      <div className="space-y-2 mb-4">
        {door.actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              if (action.type === "reflection") {
                setShowReflection(true);
              } else {
                onActionClick(action.id);
              }
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              action.type === "reflection"
                ? "bg-[#f3ede5] text-[#6b5f52] hover:bg-[#e8ddd2]"
                : "text-[#d4a574] hover:bg-[#f8f6f2]"
            }`}
          >
            <span className="font-medium">{action.label}</span>
            {action.description && (
              <p className="text-xs text-[#a0968a] mt-1">{action.description}</p>
            )}
          </button>
        ))}
      </div>

      {/* Private Reflection Box */}
      {showReflection && (
        <div className="mb-4 p-4 bg-[#f3ede5] rounded-lg">
          <label className="text-xs font-medium text-[#8fa878] uppercase tracking-wide block mb-2">
            Private Reflection - Only you can see this
          </label>
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Write your private reflection here..."
            className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-sm text-[#2a2318] bg-white"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowReflection(false)}
              className="px-3 py-1 text-sm text-[#6b5f52] hover:bg-[#e8ddd2] rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReflection}
              className="px-3 py-1 text-sm bg-[#8fa878] text-white rounded hover:bg-[#7a9067]"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Mark Complete Button */}
      {!isCompleted && (
        <Button
          variant="outline"
          size="sm"
          onClick={onComplete}
          className="w-full"
        >
          Mark This Door Complete
        </Button>
      )}
    </Card>
  );
}
