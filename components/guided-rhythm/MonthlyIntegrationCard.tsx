"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { MonthlyIntegration } from "@/lib/types/guided-rhythm";

interface MonthlyIntegrationCardProps {
  integration: MonthlyIntegration;
  monthNumber: number;
  savedIntegration?: string;
  onSave: (integration: string) => Promise<void>;
}

export function MonthlyIntegrationCard({
  integration,
  monthNumber,
  savedIntegration = "",
  onSave,
}: MonthlyIntegrationCardProps) {
  const [text, setText] = useState(savedIntegration);
  const [isSaved, setIsSaved] = useState(!!savedIntegration);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(savedIntegration);
    setIsSaved(!!savedIntegration);
  }, [savedIntegration]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      await onSave(text);
      setIsSaved(true);
    } catch (error) {
      console.error("Error saving integration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-white">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#2a2318]">
            This Month's Integration
          </h3>
          <p className="text-sm text-[#6b5f52] mt-2 leading-relaxed">
            Take a moment to reflect on what you noticed, learned, and are
            carrying forward from this month.
          </p>
        </div>

        {/* Integration Prompt */}
        <div className="bg-[#f8f6f2] rounded-lg p-4 border-l-4 border-[#d4a574]">
          <p className="text-sm text-[#6b5f52] italic">{integration.prompt}</p>
        </div>

        {/* Reflection Box */}
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Your reflection here..."
            className="w-full px-3 py-2 border border-[#e8e3db] rounded-lg focus:outline-none focus:border-[#d4a574] text-sm text-[#2a2318] bg-white"
            rows={5}
          />
          {/* Save Button - Right below reflection */}
          <div className="flex gap-2 items-center">
            <button
              onClick={handleSave}
              disabled={!text.trim() || isSaving}
              className="px-4 py-2 bg-[#d4a574] text-white rounded-lg text-sm font-medium hover:bg-[#c09560] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Integration"}
            </button>
            {isSaved && (
              <p className="text-xs text-[#8fa878] font-medium">✓ Saved</p>
            )}
          </div>
        </div>

        {/* Next Steps */}
        {integration.nextSteps && integration.nextSteps.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
              Next Step
            </p>
            <div className="flex flex-wrap gap-2">
              {integration.nextSteps.map((step) => (
                <a
                  key={step.href}
                  href={step.href}
                  style={{ color: "#ffffff" }}
                  className="inline-block px-3 py-2 bg-[#d4a574] rounded-lg text-sm font-medium hover:bg-[#c09560] transition-colors"
                >
                  {step.label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#f8f6f2] rounded-lg p-3">
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-1">
              Next Step
            </p>
            <p className="text-sm text-[#6b5f52]">{integration.suggestedNextStep}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
