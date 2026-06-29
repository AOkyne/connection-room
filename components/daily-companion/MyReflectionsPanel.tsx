"use client";

import { useEffect, useState } from "react";
import { getUserReflections, UserReflection, deleteUserReflection, updateUserReflection } from "@/lib/data/daily-companion";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface MyReflectionsPanelProps {
  userId: string | null;
}

export function MyReflectionsPanel({ userId }: MyReflectionsPanelProps) {
  const [reflections, setReflections] = useState<UserReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadReflections = async () => {
      const data = await getUserReflections(userId, 5);
      setReflections(data);
      setLoading(false);
    };

    loadReflections();
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reflection?")) return;

    await deleteUserReflection(id);
    setReflections(reflections.filter((r) => r.id !== id));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;

    await updateUserReflection(id, editText);
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
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-[#1a0f0a]">Your Recent Reflections</h3>
      {reflections.map((reflection) => (
        <Card key={reflection.id} className="bg-[#f8f6f2]">
          <div className="space-y-2">
            <p className="text-xs text-[#c97a2a] font-semibold uppercase tracking-wide">
              {new Date(reflection.created_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-[#1a0f0a] italic mb-3">"{reflection.prompt_text}"</p>

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
                <p className="text-sm text-[#1a0f0a] leading-relaxed">{reflection.response}</p>
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
                    onClick={() => handleDelete(reflection.id)}
                    className="text-xs text-[#a0704a] hover:text-[#1a0f0a] font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
