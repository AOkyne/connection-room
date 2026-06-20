"use client";

import { useState } from "react";
import { Door, DoorAction } from "@/lib/content/first-week-journey";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface DoorCardProps {
  door: Door;
  isCompleted: boolean;
  isCurrentDoor: boolean;
  onActionClick: (action: DoorAction) => void;
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
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState("");

  const handleSaveReflection = () => {
    onReflectionSave(reflectionText);
    setShowReflection(false);
  };

  const handlePostAction = (action: DoorAction) => {
    setShowPostModal(true);
  };

  const handleSubmitPost = () => {
    if (postContent.trim()) {
      onActionClick({ ...door.actions.find(a => a.type === "post")!, id: "door-post" });
      setPostContent("");
      setShowPostModal(false);
    }
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
                ? "bg-[#d4a574] text-white"
                : "bg-[#f3ede5] text-[#d4a574]"
            }`}
          >
            {door.doorNumber}
          </div>
          <h3 className="text-lg font-semibold text-[#2a2318]">
            {door.title}
          </h3>
        </div>
        {isCompleted && (
          <span className="text-xs font-medium text-[#8fa878] px-2 py-1 bg-[#d4a574]/10 rounded">
            Completed
          </span>
        )}
      </div>

      {/* Theme Tagline - Prominent */}
      <p className="text-base font-semibold text-[#6b5f52] mb-3 italic">
        {door.theme}
      </p>

      {/* Description */}
      <p className="text-sm text-[#6b5f52] mb-4 leading-relaxed">
        {door.description}
      </p>

      {/* Invitation / Instruction */}
      <p className="text-sm text-[#2a2318] mb-4 leading-relaxed">
        {door.invitation}
      </p>

      {/* Actions - Grouped by Type */}
      <div className="space-y-4 mb-4">
        {/* Non-reflection actions */}
        <div className="space-y-2">
          {door.actions.filter(a => a.type !== "reflection").map((action) => (
            <button
              key={action.id}
              onClick={() => {
                if (action.type === "post") {
                  handlePostAction(action);
                } else {
                  onActionClick(action);
                }
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                action.type === "post"
                  ? "bg-[#d4a574] text-white hover:bg-[#c09560]"
                  : "border-2 border-[#d4a574] text-[#d4a574] hover:bg-[#f3ede5]"
              }`}
            >
              {action.label}
              {action.description && (
                <p className="text-xs opacity-90 mt-1 font-normal">{action.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* Reflection Prompt + Button + Textarea - Grouped Together */}
        <div className="bg-[#f3ede5] rounded-lg p-4 space-y-3 border-l-4 border-[#d4a574]">
          <div>
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-1">
              Reflection
            </p>
            <p className="text-sm text-[#6b5f52] italic">{door.reflection}</p>
          </div>
          <button
            onClick={() => setShowReflection(true)}
            className="w-full bg-[#d4a574] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#c09560] transition-all"
          >
            Write Private Reflection
          </button>
        </div>
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
              className="px-3 py-1 text-sm bg-[#d4a574] text-white rounded hover:bg-[#c09560]"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPostModal(false);
            }
          }}
        >
          <Card className="w-full max-w-2xl mx-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#2a2318]">
                  {door.postTemplate?.title || "Share Your Thoughts"}
                </h3>
                <p className="text-sm text-[#6b5f52] mt-1">
                  {door.postTemplate?.bodyStarter && "Use this as a starting point:"}
                </p>
              </div>

              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={door.postTemplate?.bodyStarter || "Share your thoughts..."}
                className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-sm text-[#2a2318] bg-white"
                rows={6}
              />

              <p className="text-xs text-[#8fa878]">A sentence or two is enough. No need to write a memoir unless the memoir insists.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 px-4 py-2 text-sm text-[#6b5f52] hover:bg-[#f3ede5] rounded border border-[#e8ddd2]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPost}
                  disabled={!postContent.trim()}
                  className="flex-1 px-4 py-2 text-sm bg-[#d4a574] text-white rounded hover:bg-[#c09560] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post to The Commons
                </button>
              </div>
            </div>
          </Card>
        </dialog>
      )}

      {/* Mark Complete Button */}
      {!isCompleted && (
        <Button
          variant="outline"
          size="sm"
          onClick={onComplete}
          className="w-full mt-4"
        >
          Mark This Door Complete
        </Button>
      )}
    </Card>
  );
}
