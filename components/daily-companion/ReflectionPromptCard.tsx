"use client";

import { useState } from "react";
import { DailyContent, saveUserReflection } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface ReflectionPromptCardProps {
  prompt: DailyContent | null;
  userId: string | null;
  onSave?: () => void;
}

export function ReflectionPromptCard({ prompt, userId, onSave }: ReflectionPromptCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!userId || !prompt || !response.trim()) return;

    setSaving(true);
    try {
      await saveUserReflection(userId, prompt.id, prompt.body, response);
      setSaved(true);
      setResponse("");
      setShowForm(false);
      onSave?.();

      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.warn("Error saving reflection:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!prompt) return null;

  return (
    <Card className="bg-[#f3ede5] border-l-4 border-[#c97a2a]">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-[#c97a2a] uppercase tracking-wide mb-2">
            Today's Reflection
          </p>
          <p className="text-lg text-[#1a0f0a] font-medium">{prompt.body}</p>
        </div>

        {!showForm ? (
          <div className="flex gap-3 items-center">
            {!userId ? (
              <p className="text-sm text-[#1a0f0a] italic">Sign in to save your reflections</p>
            ) : (
              <>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  size="sm"
                >
                  Write Your Response
                </Button>
                {saved && <span className="text-sm text-[#c97a2a] font-medium">Saved</span>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Your reflection is private. Write freely."
              className="w-full px-4 py-3 border border-[#e8ddd2] rounded-lg bg-white text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348] resize-none"
              rows={4}
            />
            <p className="text-xs text-[#1a0f0a] italic">
              This reflection is completely private. Only you can see it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-[#1a0f0a] hover:bg-[#e8ddd2] rounded font-medium"
              >
                Cancel
              </button>
              <Button
                onClick={handleSave}
                disabled={saving || !response.trim()}
                size="sm"
              >
                {saving ? "Saving..." : "Save Reflection"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
