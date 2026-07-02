"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { weeklyTrevorNotes } from "@/lib/seed/daily-companion-content";

interface WeeklyNote {
  week: number;
  title: string;
  body: string;
  prompt_snapshot: string;
  space_suggestion: string;
}

export function DailyCompanionEditor() {
  const [notes, setNotes] = useState<WeeklyNote[]>(weeklyTrevorNotes);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editMode, setEditMode] = useState(false);

  const currentNote = notes.find((n) => n.week === selectedWeek);

  function updateNoteField(week: number, field: string, value: string) {
    setNotes((prev) =>
      prev.map((n) => (n.week === week ? { ...n, [field]: value } : n))
    );
    setUnsavedChanges(true);
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      // Save to localStorage for now
      localStorage.setItem("connection-room:weekly-notes", JSON.stringify(notes));
      setSaveStatus("saved");
      setUnsavedChanges(false);
      setEditMode(false);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving notes:", error);
      setSaveStatus("idle");
    }
  }

  function handleReset() {
    if (window.confirm("Reset to default weekly notes? This cannot be undone.")) {
      setNotes(weeklyTrevorNotes);
      localStorage.removeItem("connection-room:weekly-notes");
      setUnsavedChanges(false);
      setEditMode(false);
    }
  }

  if (!currentNote) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#1a0f0a] mb-2">Daily Companion Content</h2>
        <p className="text-[#a0704a]">Edit weekly notes, daily themes, and daily companion messaging</p>
      </div>

      {/* Weekly Notes Editor */}
      <Card>
        <CardHeader title="Weekly Trevor Notes" />
        <div className="space-y-4">
          {/* Week Selector */}
          <div>
            <label className="text-sm font-medium text-[#1a0f0a] block mb-2">Select Week</label>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {notes.map((note) => (
                <button
                  key={note.week}
                  onClick={() => setSelectedWeek(note.week)}
                  className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                    selectedWeek === note.week
                      ? "bg-[#d4a348] text-white"
                      : "bg-[#f3ede5] text-[#1a0f0a] hover:bg-[#e8ddd2]"
                  }`}
                >
                  W{note.week}
                </button>
              ))}
            </div>
          </div>

          {/* Note Preview or Editor */}
          <div className="space-y-4">
            {!editMode ? (
              // Preview Mode
              <div className="bg-[#f3ede5] rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#1a0f0a]">{currentNote.title}</h3>
                  <p className="text-sm text-[#a0704a] mt-1">Week {currentNote.week}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[#1a0f0a]">{currentNote.body}</p>
                </div>
                <div className="border-t border-[#e8ddd2] pt-3 space-y-2">
                  <div>
                    <p className="text-xs text-[#a0704a] font-medium">REFLECTION PROMPT:</p>
                    <p className="text-[#1a0f0a]">{currentNote.prompt_snapshot}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a0704a] font-medium">SPACE SUGGESTION:</p>
                    <p className="text-[#1a0f0a] capitalize">{currentNote.space_suggestion.replace("-", " ")}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Title</label>
                  <input
                    type="text"
                    value={currentNote.title}
                    onChange={(e) => updateNoteField(currentNote.week, "title", e.target.value)}
                    className="w-full px-3 py-2 border border-[#e8ddd2] rounded bg-white text-[#1a0f0a] placeholder-[#a0704a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Main Message</label>
                  <textarea
                    value={currentNote.body}
                    onChange={(e) => updateNoteField(currentNote.week, "body", e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-[#e8ddd2] rounded bg-white text-[#1a0f0a] placeholder-[#a0704a] focus:outline-none focus:ring-2 focus:ring-[#d4a348] resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Reflection Prompt</label>
                  <input
                    type="text"
                    value={currentNote.prompt_snapshot}
                    onChange={(e) => updateNoteField(currentNote.week, "prompt_snapshot", e.target.value)}
                    className="w-full px-3 py-2 border border-[#e8ddd2] rounded bg-white text-[#1a0f0a] placeholder-[#a0704a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Space Suggestion</label>
                  <select
                    value={currentNote.space_suggestion}
                    onChange={(e) => updateNoteField(currentNote.week, "space_suggestion", e.target.value)}
                    className="w-full px-3 py-2 border border-[#e8ddd2] rounded bg-white text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
                  >
                    <option value="commons">The Commons</option>
                    <option value="start-here">Start Here</option>
                    <option value="embodiment">Embodiment Practice</option>
                    <option value="touch-affection">Touch & Affection</option>
                    <option value="intimacy-patterns">Intimacy Patterns</option>
                    <option value="dating-desire">Dating & Desire</option>
                    <option value="couples">Couples Space</option>
                    <option value="spirituality-sexuality">Spirituality & Sexuality</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            {!editMode ? (
              <Button
                onClick={() => setEditMode(true)}
                className="bg-[#d4a348] text-white hover:bg-[#c97a2a]"
              >
                Edit Week {currentNote.week}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={!unsavedChanges || saveStatus === "saving"}
                  className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setEditMode(false);
                    setNotes(weeklyTrevorNotes);
                  }}
                  className="bg-gray-400 text-white hover:bg-gray-500"
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              onClick={handleReset}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Reset All to Default
            </Button>
          </div>

          {unsavedChanges && (
            <p className="text-sm text-orange-600">You have unsaved changes</p>
          )}
        </div>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Daily Companion Features</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>✓ 16 weekly Trevor notes (rotates each week)</li>
          <li>✓ 120 daily themes (rotates daily)</li>
          <li>✓ 120 reflection prompts (rotates daily)</li>
          <li>✓ 120 body check-ins (rotates daily)</li>
          <li>✓ 120 embodiment practices (rotates daily)</li>
          <li>✓ 120 conversation invitations (rotates daily)</li>
          <li>✓ 120 daily quotes (rotates daily)</li>
        </ul>
      </Card>
    </div>
  );
}
