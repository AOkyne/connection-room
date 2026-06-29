"use client";

import { useEffect, useState } from "react";
import { guidedRhythm } from "@/lib/content/guided-rhythm";
import { Month, WeeklyPrompt } from "@/lib/types/guided-rhythm";
import {
  saveCustomRhythmContent,
  loadCustomRhythmContent,
  clearCustomRhythmContent,
} from "@/lib/data/custom-rhythm-content";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export function RhythmContentEditor() {
  const [months, setMonths] = useState<Month[]>(guidedRhythm);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [loading, setLoading] = useState(true);

  const currentMonth = months.find((m) => m.monthNumber === selectedMonth);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    const custom = await loadCustomRhythmContent();
    if (custom) {
      setMonths(custom);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaveStatus("saving");
    const success = await saveCustomRhythmContent(months);
    if (success) {
      setSaveStatus("saved");
      setUnsavedChanges(false);
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

  function handleReset() {
    if (window.confirm("Reset to default content? This cannot be undone.")) {
      clearCustomRhythmContent();
      setMonths(guidedRhythm);
      setUnsavedChanges(false);
    }
  }

  function updateMonthField(
    monthNumber: number,
    field: string,
    value: string
  ) {
    setMonths((prev) =>
      prev.map((m) =>
        m.monthNumber === monthNumber ? { ...m, [field]: value } : m
      )
    );
    setUnsavedChanges(true);
  }

  function updateWeekField(
    monthNumber: number,
    weekNumber: number,
    field: string,
    value: string
  ) {
    setMonths((prev) =>
      prev.map((m) =>
        m.monthNumber === monthNumber
          ? {
              ...m,
              weeks: m.weeks.map((w) =>
                w.weekNumber === weekNumber ? { ...w, [field]: value } : w
              ),
            }
          : m
      )
    );
    setUnsavedChanges(true);
  }

  function updateIntegrationField(
    monthNumber: number,
    field: string,
    value: string
  ) {
    setMonths((prev) =>
      prev.map((m) =>
        m.monthNumber === monthNumber
          ? {
              ...m,
              integration: { ...m.integration, [field]: value },
            }
          : m
      )
    );
    setUnsavedChanges(true);
  }

  if (loading) {
    return <div className="text-[#1a0f0a]">Loading content editor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-[#1a0f0a]">
          Guided Rhythm Content Editor
        </h2>
        <p className="text-sm text-[#1a0f0a]">
          Edit monthly themes, weekly prompts, and integration questions. Changes
          save to your account.
        </p>
      </div>

      {/* Save Status */}
      {unsavedChanges && (
        <Card className="bg-[#d4a348]/10 border-l-4 border-[#d4a348]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#d4a348] font-medium">
              ⚠ You have unsaved changes
            </p>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="px-4 py-2 bg-[#d4a348] text-white rounded-lg text-sm font-medium hover:bg-[#c09560] disabled:opacity-50"
            >
              {saveStatus === "saving" ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Card>
      )}

      {saveStatus === "saved" && (
        <Card className="bg-[#c97a2a]/10 border-l-4 border-[#c97a2a]">
          <p className="text-sm text-[#c97a2a] font-medium">✓ Content saved</p>
        </Card>
      )}

      {/* Month Selector */}
      <Card>
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#1a0f0a]">Select Month</p>
          <div className="grid grid-cols-2 gap-2">
            {months.map((month) => (
              <button
                key={month.monthNumber}
                onClick={() => setSelectedMonth(month.monthNumber)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedMonth === month.monthNumber
                    ? "bg-[#d4a348] text-white"
                    : "bg-[#f3ede5] text-[#1a0f0a] hover:bg-[#e8ddd2]"
                }`}
              >
                Month {month.monthNumber}: {month.title}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {currentMonth && (
        <>
          {/* Month-Level Fields */}
          <Card className="space-y-4">
            <h3 className="text-lg font-semibold text-[#1a0f0a]">
              Month {currentMonth.monthNumber}: {currentMonth.title}
            </h3>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Month Title
              </label>
              <input
                type="text"
                value={currentMonth.title}
                onChange={(e) =>
                  updateMonthField(
                    currentMonth.monthNumber,
                    "title",
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
              />
            </div>

            {/* Monthly Theme */}
            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Monthly Theme
              </label>
              <textarea
                value={currentMonth.monthlyTheme}
                onChange={(e) =>
                  updateMonthField(
                    currentMonth.monthNumber,
                    "monthlyTheme",
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                rows={3}
              />
            </div>

            {/* Monthly Reflection */}
            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Monthly Reflection Question
              </label>
              <textarea
                value={currentMonth.monthlyReflection}
                onChange={(e) =>
                  updateMonthField(
                    currentMonth.monthNumber,
                    "monthlyReflection",
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                rows={2}
              />
            </div>

            {/* Trevor Note */}
            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Trevor Note
              </label>
              <textarea
                value={currentMonth.trevorNote}
                onChange={(e) =>
                  updateMonthField(
                    currentMonth.monthNumber,
                    "trevorNote",
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                rows={4}
              />
            </div>

            {/* Ritual Title */}
            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Monthly Ritual Title
              </label>
              <input
                type="text"
                value={currentMonth.ritual.title}
                onChange={(e) => {
                  setMonths((prev) =>
                    prev.map((m) =>
                      m.monthNumber === currentMonth.monthNumber
                        ? {
                            ...m,
                            ritual: {
                              ...m.ritual,
                              title: e.target.value,
                            },
                          }
                        : m
                    )
                  );
                  setUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
              />
            </div>

            {/* Ritual Description */}
            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Ritual Description
              </label>
              <textarea
                value={currentMonth.ritual.description}
                onChange={(e) => {
                  setMonths((prev) =>
                    prev.map((m) =>
                      m.monthNumber === currentMonth.monthNumber
                        ? {
                            ...m,
                            ritual: {
                              ...m.ritual,
                              description: e.target.value,
                            },
                          }
                        : m
                    )
                  );
                  setUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                rows={2}
              />
            </div>
          </Card>

          {/* Weekly Prompts */}
          {currentMonth.weeks.map((week) => (
            <Card key={week.weekNumber} className="space-y-4">
              <h4 className="text-lg font-semibold text-[#1a0f0a]">
                Week {week.weekNumber}: {week.title}
              </h4>

              <div>
                <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                  Week Title
                </label>
                <input
                  type="text"
                  value={week.title}
                  onChange={(e) =>
                    updateWeekField(
                      currentMonth.monthNumber,
                      week.weekNumber,
                      "title",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                  Dashboard Prompt
                </label>
                <textarea
                  value={week.dashboardPrompt}
                  onChange={(e) =>
                    updateWeekField(
                      currentMonth.monthNumber,
                      week.weekNumber,
                      "dashboardPrompt",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                  Private Reflection Prompt
                </label>
                <textarea
                  value={week.privateReflection}
                  onChange={(e) =>
                    updateWeekField(
                      currentMonth.monthNumber,
                      week.weekNumber,
                      "privateReflection",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                  Community Invitation
                </label>
                <textarea
                  value={week.communityInvitation}
                  onChange={(e) =>
                    updateWeekField(
                      currentMonth.monthNumber,
                      week.weekNumber,
                      "communityInvitation",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                  Connection Prompt
                </label>
                <textarea
                  value={week.connectionPrompt}
                  onChange={(e) =>
                    updateWeekField(
                      currentMonth.monthNumber,
                      week.weekNumber,
                      "connectionPrompt",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                  rows={2}
                />
              </div>
            </Card>
          ))}

          {/* Monthly Integration */}
          <Card className="space-y-4">
            <h4 className="text-lg font-semibold text-[#1a0f0a]">
              Integration
            </h4>

            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Integration Prompt
              </label>
              <textarea
                value={currentMonth.integration.prompt}
                onChange={(e) =>
                  updateIntegrationField(
                    currentMonth.monthNumber,
                    "prompt",
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c97a2a] uppercase tracking-wide mb-1">
                Suggested Next Step
              </label>
              <textarea
                value={currentMonth.integration.suggestedNextStep}
                onChange={(e) =>
                  updateIntegrationField(
                    currentMonth.monthNumber,
                    "suggestedNextStep",
                    e.target.value
                  )
                }
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:border-[#d4a348] text-sm"
                rows={2}
              />
            </div>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!unsavedChanges}
          className="flex-1"
        >
          Save All Changes
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset to Default
        </Button>
      </div>

      {/* Info */}
      <Card className="bg-[#f3ede5]">
        <p className="text-xs text-[#1a0f0a] leading-relaxed">
          <strong>Tip:</strong> Changes are automatically saved to your account.
          If you edit the code file directly ({"{"}lib/content/guided-rhythm.ts{"}"}),
          those changes will override these edits. Use either the editor or code
          edits, not both.
        </p>
      </Card>
    </div>
  );
}
