"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserReflections, UserReflection, deleteUserReflection, updateUserReflection } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface MyReflectionsPanelProps {
  userId: string | null;
  /** How many to show (newest first). */
  limit?: number;
  title?: string;
  /** Show a link to the page with all of a member's private reflections. */
  showAllLink?: boolean;
  /** Shown when there are none; when omitted the panel hides itself. */
  emptyText?: string;
}

// A member's private daily reflections (the reflection prompt on Home), with
// edit and delete. Used on Home (recent five) and on My Private Reflections.
export function MyReflectionsPanel({
  userId,
  limit = 5,
  title = "Your Recent Reflections",
  showAllLink = false,
  emptyText,
}: MyReflectionsPanelProps) {
  const [reflections, setReflections] = useState<UserReflection[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    const loadReflections = async () => {
      const data = await getUserReflections(userId, limit);
      setReflections(data);
      setLoading(false);
    };

    loadReflections();
  }, [userId, limit]);

  const handleDelete = async (id: string) => {
    setError("");
    const ok = await deleteUserReflection(id);
    setConfirmingId(null);
    if (!ok) return setError("That reflection couldn’t be deleted. Please try again.");
    setReflections(reflections.filter((r) => r.id !== id));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    setError("");
    const saved = await updateUserReflection(id, editText);
    if (!saved) return setError("Your changes didn’t save. Please try again.");
    setReflections(
      reflections.map((r) => (r.id === id ? { ...r, response: editText, updated_at: new Date().toISOString() } : r))
    );
    setEditingId(null);
    setEditText("");
  };

  if (!userId || loading) {
    return null;
  }

  if (reflections.length === 0) {
    return emptyText ? <p className="text-sm text-[#6b6460]">{emptyText}</p> : null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-[#1a0f0a]">{title}</h3>
        {showAllLink && (
          <Link href="/app/reflections" className="text-sm font-medium text-[#8b6f47] underline">
            See all your private reflections
          </Link>
        )}
      </div>
      {error && <p className="text-sm text-[#7a2e1f]">{error}</p>}
      {reflections.map((reflection) => (
        <Card key={reflection.id} className="bg-[#f8f6f2]">
          <div className="space-y-2">
            <p className="text-xs text-[#c97a2a] font-semibold uppercase tracking-wide">
              {new Date(reflection.created_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-[#1a0f0a] italic mb-3">&ldquo;{reflection.prompt_text}&rdquo;</p>

            {editingId === reflection.id ? (
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a348] bg-white"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-sm text-[#1a0f0a] hover:bg-[#e8ddd2] rounded"
                  >
                    Cancel
                  </button>
                  <Button onClick={() => handleSaveEdit(reflection.id)} size="sm">
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#1a0f0a] leading-relaxed whitespace-pre-line">{reflection.response}</p>
                {confirmingId === reflection.id ? (
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e8ddd2]">
                    <span className="text-xs text-[#1a0f0a]">Delete this reflection? This can’t be undone.</span>
                    <button
                      onClick={() => handleDelete(reflection.id)}
                      className="text-xs font-semibold text-white bg-[#a0472f] rounded-full px-3 py-1"
                    >
                      Delete
                    </button>
                    <button onClick={() => setConfirmingId(null)} className="text-xs text-[#6b6460] underline">
                      Keep it
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
                    <button
                      onClick={() => {
                        setEditingId(reflection.id);
                        setEditText(reflection.response);
                      }}
                      className="text-xs text-[#d4a348] hover:text-[#c09560] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmingId(reflection.id)}
                      className="text-xs text-[#a0704a] hover:text-[#1a0f0a] font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
