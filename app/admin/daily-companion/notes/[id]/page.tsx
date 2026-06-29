"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { getSpaces } from "@/lib/data/spaces";

interface WeeklyNote {
  id: string;
  week_number: number;
  title: string;
  body: string;
  related_space_id?: string;
  rotation_index: number;
  active: boolean;
}

export default function EditWeeklyNote() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const [note, setNote] = useState<WeeklyNote>({
    id: "",
    week_number: 1,
    title: "",
    body: "",
    related_space_id: undefined,
    rotation_index: 0,
    active: true,
  });

  const [spaces, setSpaces] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    // Load spaces
    const s = getSpaces();
    setSpaces(s || []);

    if (isNew) return;

    const loadNote = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("weekly_notes")
          .select("*")
          .eq("id", id)
          .single();

        if (data) setNote(data);
        if (error) console.warn("Error loading note:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id, isNew]);

  const handleSave = async () => {
    if (!note.title.trim() || !note.body.trim()) {
      alert("Title and body are required");
      return;
    }

    if (note.week_number < 1 || note.week_number > 16) {
      alert("Week number must be between 1 and 16");
      return;
    }

    if (!supabase) {
      alert("Database not available");
      return;
    }

    setSaving(true);

    try {
      if (isNew) {
        const { error } = await supabase.from("weekly_notes").insert([note]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("weekly_notes")
          .update({
            ...note,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;
      }

      router.push("/admin/daily-companion");
    } catch (error) {
      console.warn("Error saving note:", error);
      alert("Error saving note. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const relatedSpace = spaces.find((s) => s.id === note.related_space_id);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-[#2a2318]">
          {isNew ? "Create New Weekly Note" : "Edit Weekly Note"}
        </h1>
        <p className="text-[#6b5f52] mt-2">
          {isNew
            ? "Add a new weekly Trevor note"
            : "Update this weekly note"}
        </p>
      </div>

      <Card className="space-y-6">
        {/* Week Number */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Week Number (1-16)
          </label>
          <input
            type="number"
            min="1"
            max="16"
            value={note.week_number}
            onChange={(e) =>
              setNote({ ...note, week_number: parseInt(e.target.value) || 1 })
            }
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          />
          <p className="text-xs text-[#6b5f52] mt-1">
            Which week in the 16-week cycle (1-16)
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Title
          </label>
          <input
            type="text"
            value={note.title}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
            placeholder="e.g., 'Week 1: Beginning Again'"
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Letter / Note
          </label>
          <textarea
            value={note.body}
            onChange={(e) => setNote({ ...note, body: e.target.value })}
            placeholder="Trevor's weekly letter..."
            rows={10}
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574] resize-none"
          />
          <p className="text-xs text-[#6b5f52] mt-1">
            {note.body.length} characters
          </p>
        </div>

        {/* Related Space */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Related Space (Optional)
          </label>
          <select
            value={note.related_space_id || ""}
            onChange={(e) =>
              setNote({
                ...note,
                related_space_id: e.target.value || undefined,
              })
            }
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          >
            <option value="">None</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#6b5f52] mt-1">
            Link to a space that relates to this week's theme
          </p>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={note.active}
              onChange={(e) => setNote({ ...note, active: e.target.checked })}
              className="w-4 h-4 rounded border border-[#d4a574]"
            />
            <span className="text-sm font-medium text-[#2a2318]">Active</span>
          </label>
          <p className="text-xs text-[#6b5f52]">
            Inactive notes won't show to members
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-[#e8ddd2]">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {note.title && note.body && (
        <Card className="bg-[#f3ede5]">
          <CardHeader title="Preview" />
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-[#8fa878] uppercase tracking-wide">
                Week {note.week_number} Note
              </p>
              <h3 className="text-lg font-semibold text-[#2a2318] mt-1">
                {note.title}
              </h3>
            </div>
            <p className="text-sm text-[#6b5f52] leading-relaxed whitespace-pre-wrap">
              {note.body}
            </p>
            {relatedSpace && (
              <p className="text-xs text-[#6b5f52] pt-2 border-t border-[#e8ddd2]">
                Related space: <span className="font-medium">{relatedSpace.name}</span>
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
