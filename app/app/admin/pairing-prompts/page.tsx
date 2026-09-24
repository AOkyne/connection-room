"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  listPairingPrompts,
  createPairingPrompt,
  updatePairingPrompt,
  PAIRING_PROMPT_CATEGORIES,
  type PairingPrompt,
  type PairingPromptCategory,
} from "@/lib/admin/pairing-prompts";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

const CATEGORY_LABELS: Record<PairingPromptCategory, string> = {
  thoughtful: "Thoughtful",
  funny: "Funny",
  controversial: "Controversial",
  playful: "Playful",
  deep: "Deep",
};

// The icebreaker list the weekly pairing job draws from
// (app/api/cron/weekly-pairings). Each new pair gets a random active
// prompt neither member has had before. Switching a prompt off (rather
// than deleting it) keeps past pairings pointing at the prompt they got.
export default function AdminPairingPromptsPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [prompts, setPrompts] = useState<PairingPrompt[]>([]);
  const [newCategory, setNewCategory] = useState<PairingPromptCategory>("thoughtful");
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      const result = await listPairingPrompts();
      if (result.error) showToast(result.error, "error");
      setPrompts(result.prompts);
      setMounted(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    const result = await createPairingPrompt(newCategory, newText.trim());
    setSaving(false);
    if (result.error || !result.prompt) {
      showToast(result.error || "Could not add this prompt.", "error");
      return;
    }
    setPrompts((prev) => [...prev, result.prompt!]);
    setNewText("");
    showToast("Prompt added", "success");
  };

  const handleToggle = async (prompt: PairingPrompt) => {
    const result = await updatePairingPrompt(prompt.id, { isActive: !prompt.is_active });
    if (result.error || !result.prompt) {
      showToast(result.error || "Could not update this prompt.", "error");
      return;
    }
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? result.prompt! : p)));
  };

  const handleEdit = async (prompt: PairingPrompt) => {
    const text = window.prompt("Edit prompt:", prompt.prompt_text);
    if (!text || text.trim() === prompt.prompt_text) return;
    const result = await updatePairingPrompt(prompt.id, { promptText: text.trim() });
    if (result.error || !result.prompt) {
      showToast(result.error || "Could not update this prompt.", "error");
      return;
    }
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? result.prompt! : p)));
  };

  if (!mounted) {
    return <LoadingScreen message="Loading pairing prompts" subtitle="Just a moment..." />;
  }

  const activeCount = prompts.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Weekly Pairing Prompts", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Weekly Pairing Prompts</h1>
        <p className="text-[#a0704a] mt-1">
          Each new weekly pair gets one of these as an icebreaker, picked at random from the active ones and never
          repeated for the same member when avoidable. {activeCount} active.
        </p>
      </div>

      <Card>
        <CardHeader title="Add a prompt" />
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as PairingPromptCategory)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          >
            {PAIRING_PROMPT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Write a question..."
            className="flex-1 px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          />
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !newText.trim()}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </div>
      </Card>

      {PAIRING_PROMPT_CATEGORIES.map((category) => {
        const inCategory = prompts.filter((p) => p.category === category);
        if (inCategory.length === 0) return null;
        return (
          <Card key={category}>
            <CardHeader title={CATEGORY_LABELS[category]} subtitle={`${inCategory.filter((p) => p.is_active).length} of ${inCategory.length} active`} />
            <div className="divide-y divide-[#f3ede5]">
              {inCategory.map((prompt) => (
                <div key={prompt.id} className="flex items-start justify-between gap-3 py-2">
                  <p className={`text-sm flex-1 ${prompt.is_active ? "text-[#1a0f0a]" : "text-[#a0704a] line-through"}`}>
                    {prompt.prompt_text}
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleEdit(prompt)} className="text-xs text-[#a0704a] hover:text-[#1a0f0a]">
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(prompt)}
                      className={`text-xs px-2 py-1 rounded ${
                        prompt.is_active ? "bg-green-100 text-green-800" : "bg-[#f3ede5] text-[#a0704a]"
                      }`}
                    >
                      {prompt.is_active ? "On" : "Off"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
