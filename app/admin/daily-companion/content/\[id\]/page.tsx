"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";

interface DailyContent {
  id: string;
  content_type: string;
  title: string;
  body: string;
  category?: string;
  rotation_index: number;
  active: boolean;
}

const CONTENT_TYPES = ["theme", "reflection", "practice", "checkin", "invitation", "quote"];

export default function EditDailyContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const [content, setContent] = useState<DailyContent>({
    id: "",
    content_type: "theme",
    title: "",
    body: "",
    category: "",
    rotation_index: 0,
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;

    const loadContent = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("daily_companion_content")
          .select("*")
          .eq("id", id)
          .single();

        if (data) setContent(data);
        if (error) console.warn("Error loading content:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [id, isNew]);

  const handleSave = async () => {
    if (!content.title.trim() || !content.body.trim()) {
      alert("Title and body are required");
      return;
    }

    if (!supabase) {
      alert("Database not available");
      return;
    }

    setSaving(true);

    try {
      if (isNew) {
        const { error } = await supabase
          .from("daily_companion_content")
          .insert([content]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_companion_content")
          .update({
            ...content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;
      }

      router.push("/admin/daily-companion");
    } catch (error) {
      console.warn("Error saving content:", error);
      alert("Error saving content. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-[#2a2318]">
          {isNew ? "Create New Content" : "Edit Content"}
        </h1>
        <p className="text-[#6b5f52] mt-2">
          {isNew ? "Add a new piece of daily content" : "Update this content"}
        </p>
      </div>

      <Card className="space-y-6">
        {/* Content Type */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Content Type
          </label>
          <select
            value={content.content_type}
            onChange={(e) => setContent({ ...content, content_type: e.target.value })}
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#6b5f52] mt-1">
            Choose what type of content this is
          </p>
        </div>

        {/* Rotation Index */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Rotation Index (0-119)
          </label>
          <input
            type="number"
            min="0"
            max="119"
            value={content.rotation_index}
            onChange={(e) =>
              setContent({ ...content, rotation_index: parseInt(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          />
          <p className="text-xs text-[#6b5f52] mt-1">
            Which day in the 120-day cycle (0-119). All content of this type at this index will appear on the same day.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Title
          </label>
          <input
            type="text"
            value={content.title}
            onChange={(e) => setContent({ ...content, title: e.target.value })}
            placeholder="e.g., 'Receiving Without Defending'"
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          />
        </div>

        {/* Category (optional) */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Category (Optional)
          </label>
          <input
            type="text"
            value={content.category || ""}
            onChange={(e) => setContent({ ...content, category: e.target.value })}
            placeholder="e.g., 'connection', 'embodiment'"
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574]"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-semibold text-[#2a2318] mb-2">
            Content
          </label>
          <textarea
            value={content.body}
            onChange={(e) => setContent({ ...content, body: e.target.value })}
            placeholder="The actual content for this piece"
            rows={8}
            className="w-full px-4 py-2 border border-[#e8ddd2] rounded-lg text-[#2a2318] focus:outline-none focus:ring-2 focus:ring-[#d4a574] font-mono text-sm"
          />
          <p className="text-xs text-[#6b5f52] mt-1">
            {content.body.length} characters
          </p>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={content.active}
              onChange={(e) => setContent({ ...content, active: e.target.checked })}
              className="w-4 h-4 rounded border border-[#d4a574]"
            />
            <span className="text-sm font-medium text-[#2a2318]">Active</span>
          </label>
          <p className="text-xs text-[#6b5f52]">
            Inactive content won't show to members
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
            {saving ? "Saving..." : "Save Content"}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {content.title && content.body && (
        <Card className="bg-[#f3ede5]">
          <CardHeader title="Preview" />
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-[#8fa878] uppercase tracking-wide">
                {content.content_type}
              </p>
              <h3 className="text-lg font-semibold text-[#2a2318] mt-1">
                {content.title}
              </h3>
            </div>
            <p className="text-sm text-[#6b5f52] leading-relaxed whitespace-pre-wrap">
              {content.body}
            </p>
            {content.category && (
              <p className="text-xs text-[#6b5f52]">
                Category: <span className="font-medium">{content.category}</span>
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
