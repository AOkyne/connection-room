"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { postTemplates } from "@/lib/content/post-templates";

interface PostTemplateSelectorProps {
  onSelect: (templateId: string) => void;
  onSkip: () => void;
}

export function PostTemplateSelector({
  onSelect,
  onSkip,
}: PostTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSkip();
        }
      }}
    >
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-[#2a2318]">
              Choose a post style (optional)
            </h3>
            <p className="text-sm text-[#6b5f52] mt-1">
              Templates can help you get started. You can edit freely before posting.
            </p>
          </div>

          {/* Templates Grid */}
          <div className="space-y-2">
            {postTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedTemplate === template.id
                    ? "border-[#d4a574] bg-[#f3ede5]"
                    : "border-[#e8ddd2] bg-white hover:border-[#d4a574]"
                }`}
              >
                <p className="font-medium text-[#2a2318]">{template.title}</p>
                <p className="text-xs text-[#8fa878] mt-1">{template.subtitle}</p>
                {template.exampleTone && (
                  <p className="text-xs text-[#a0968a] mt-2 italic">
                    Tone: {template.exampleTone}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Preview of Selected Template */}
          {selectedTemplate && (
            <div className="bg-[#f8f6f2] rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
                This template includes:
              </p>
              {postTemplates
                .find((t) => t.id === selectedTemplate)
                ?.starterPrompts.map((prompt, idx) => (
                  <p key={idx} className="text-sm text-[#6b5f52]">
                    • {prompt}
                  </p>
                ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onSkip}
              className="flex-1 px-4 py-2 text-sm text-[#6b5f52] hover:bg-[#f3ede5] rounded border border-[#e8ddd2]"
            >
              Start Blank
            </button>
            <button
              onClick={() => selectedTemplate && onSelect(selectedTemplate)}
              disabled={!selectedTemplate}
              className="flex-1 px-4 py-2 text-sm bg-[#d4a574] text-[#ffffff] rounded hover:bg-[#c09560] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Use Template
            </button>
          </div>
        </div>
      </Card>
    </dialog>
  );
}
