"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";

interface PrivateReflectionBoxProps {
  prompt: string;
  savedReflection?: string;
  onSave: (reflection: string) => Promise<void>;
  subtitle?: string;
}

export function PrivateReflectionBox({
  prompt,
  savedReflection = "",
  onSave,
  subtitle = "Only you see this",
}: PrivateReflectionBoxProps) {
  const [text, setText] = useState(savedReflection);
  const [isSaved, setIsSaved] = useState(!savedReflection);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(savedReflection);
    setIsSaved(!!savedReflection);
  }, [savedReflection]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      await onSave(text);
      setIsSaved(true);
    } catch (error) {
      console.error("Error saving reflection:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-[#f8f6f2] border-l-4 border-[#8fa878]">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
            Private Reflection
          </p>
          <p className="text-xs text-[#a0968a] mt-1">{subtitle}</p>
        </div>

        <p className="text-sm text-[#6b5f52] italic">{prompt}</p>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setIsSaved(false);
          }}
          placeholder="Your reflection here... A sentence or two is enough."
          className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#8fa878] text-sm text-[#2a2318] bg-white"
          rows={4}
        />

        <div className="flex gap-2 items-center">
          <button
            onClick={handleSave}
            disabled={!text.trim() || isSaving}
            className="px-4 py-2 bg-[#8fa878] text-white rounded-lg text-sm font-medium hover:bg-[#7a9067] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          {isSaved && (
            <p className="text-xs text-[#8fa878] font-medium">✓ Saved</p>
          )}
        </div>

        <p className="text-xs text-[#a0968a] italic">
          Your reflection is private and only you can see it.
        </p>
      </div>
    </Card>
  );
}
