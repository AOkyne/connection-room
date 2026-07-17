"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getSession } from "@/lib/session";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";

interface DailyContent {
  id: string;
  content_type: string;
  title: string;
  body: string;
  rotation_index: number;
  active: boolean;
  created_at: string;
}

interface WeeklyNote {
  id: string;
  week_number: number;
  title: string;
  body: string;
  rotation_index: number;
  active: boolean;
  created_at: string;
}

export default function AdminDailyCompanion() {
  const router = useRouter();
  const [dailyContent, setDailyContent] = useState<DailyContent[]>([]);
  const [weeklyNotes, setWeeklyNotes] = useState<WeeklyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "content" | "notes">("overview");
  const [contentStats, setContentStats] = useState({ total: 0, active: 0, byType: {} as Record<string, number> });

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      loadData();
    };

    checkAdminAndLoad();
  }, [router]);

  const loadData = async () => {
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const [contentRes, notesRes] = await Promise.all([
        supabase
          .from("daily_companion_content")
          .select("*")
          .order("content_type, rotation_index"),
        supabase
          .from("weekly_notes")
          .select("*")
          .order("week_number"),
      ]);

      if (contentRes.data) setDailyContent(contentRes.data);
      if (notesRes.data) setWeeklyNotes(notesRes.data);

      // Calculate stats
      const stats = { total: 0, active: 0, byType: {} as Record<string, number> };
      if (contentRes.data) {
        stats.total = contentRes.data.length;
        stats.active = contentRes.data.filter((c) => c.active).length;
        contentRes.data.forEach((c) => {
          stats.byType[c.content_type] = (stats.byType[c.content_type] || 0) + 1;
        });
      }
      setContentStats(stats);
    } catch (error) {
      console.warn("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContentActive = async (id: string, active: boolean) => {
    if (!supabase) return;

    try {
      await supabase
        .from("daily_companion_content")
        .update({ active: !active })
        .eq("id", id);

      setDailyContent(
        dailyContent.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
      );
    } catch (error) {
      console.warn("Error updating content:", error);
    }
  };

  const toggleNoteActive = async (id: string, active: boolean) => {
    if (!supabase) return;

    try {
      await supabase
        .from("weekly_notes")
        .update({ active: !active })
        .eq("id", id);

      setWeeklyNotes(
        weeklyNotes.map((n) => (n.id === id ? { ...n, active: !n.active } : n))
      );
    } catch (error) {
      console.warn("Error updating note:", error);
    }
  };

  const deleteContent = async (id: string) => {
    if (!supabase || !confirm("Delete this content?")) return;

    try {
      await supabase
        .from("daily_companion_content")
        .delete()
        .eq("id", id);

      setDailyContent(dailyContent.filter((c) => c.id !== id));
    } catch (error) {
      console.warn("Error deleting content:", error);
    }
  };

  const deleteNote = async (id: string) => {
    if (!supabase || !confirm("Delete this note?")) return;

    try {
      await supabase
        .from("weekly_notes")
        .delete()
        .eq("id", id);

      setWeeklyNotes(weeklyNotes.filter((n) => n.id !== id));
    } catch (error) {
      console.warn("Error deleting note:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Daily Companion", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-4xl font-bold text-[#1a0f0a]">Daily Companion Admin</h1>
        <p className="text-[#1a0f0a] mt-2">Manage daily content and weekly notes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#e8ddd2]">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-[#d4a348] text-[#d4a348]"
              : "border-transparent text-[#1a0f0a] hover:text-[#1a0f0a]"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
            activeTab === "content"
              ? "border-[#d4a348] text-[#d4a348]"
              : "border-transparent text-[#1a0f0a] hover:text-[#1a0f0a]"
          }`}
        >
          Daily Content
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
            activeTab === "notes"
              ? "border-[#d4a348] text-[#d4a348]"
              : "border-transparent text-[#1a0f0a] hover:text-[#1a0f0a]"
          }`}
        >
          Weekly Notes
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-[#d4a348]/10 to-transparent">
              <div className="space-y-2">
                <p className="text-sm text-[#c97a2a] font-semibold">Total Daily Content</p>
                <p className="text-4xl font-bold text-[#1a0f0a]">{contentStats.total}</p>
                <p className="text-xs text-[#1a0f0a]">{contentStats.active} active</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-[#c97a2a]/10 to-transparent">
              <div className="space-y-2">
                <p className="text-sm text-[#c97a2a] font-semibold">Weekly Notes</p>
                <p className="text-4xl font-bold text-[#1a0f0a]">{weeklyNotes.length}</p>
                <p className="text-xs text-[#1a0f0a]">
                  {weeklyNotes.filter((n) => n.active).length} active
                </p>
              </div>
            </Card>
          </div>

          {/* Content breakdown */}
          <Card>
            <CardHeader title="Content Breakdown by Type" />
            <div className="space-y-3">
              {Object.entries(contentStats.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="capitalize text-[#1a0f0a] font-medium">{type}</span>
                  <span className="text-[#d4a348] font-bold text-lg">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-[#f3ede5]">
            <div className="space-y-3">
              <h3 className="font-semibold text-[#1a0f0a]">Quick Actions</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link href="/app/admin/daily-companion/content/new">
                  <Button variant="primary">
                    Create New Content
                  </Button>
                </Link>
                <Link href="/app/admin/daily-companion/notes/new">
                  <Button variant="outline">
                    Create New Note
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Daily Content Tab */}
      {activeTab === "content" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">Daily Content</h2>
            <Link href="/app/admin/daily-companion/content/new">
              <Button>Add Content</Button>
            </Link>
          </div>

          <div className="space-y-3">
            {dailyContent.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-[#1a0f0a]">No daily content yet. Create some to get started.</p>
              </Card>
            ) : (
              dailyContent.map((content) => (
                <Card
                  key={content.id}
                  className={`${!content.active ? "opacity-60" : ""}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-[#d4a348]/20 text-[#d4a348] px-2 py-1 rounded">
                            {content.content_type}
                          </span>
                          <span className="text-xs text-[#c97a2a]">Index: {content.rotation_index}</span>
                        </div>
                        <h3 className="font-semibold text-[#1a0f0a] mt-2">{content.title}</h3>
                        <p className="text-sm text-[#1a0f0a] line-clamp-2 mt-1">{content.body}</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleContentActive(content.id, content.active)}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                            content.active
                              ? "bg-[#c97a2a]/20 text-[#c97a2a] hover:bg-[#c97a2a]/30"
                              : "bg-[#a0704a]/20 text-[#a0704a] hover:bg-[#a0704a]/30"
                          }`}
                        >
                          {content.active ? "Active" : "Inactive"}
                        </button>
                        <Link href={`/app/admin/daily-companion/content/${content.id}`}>
                          <button className="text-xs text-[#d4a348] hover:text-[#c09560] font-medium">
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => deleteContent(content.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Weekly Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-[#1a0f0a]">Weekly Notes</h2>
            <Link href="/app/admin/daily-companion/notes/new">
              <Button>Add Note</Button>
            </Link>
          </div>

          <div className="space-y-3">
            {weeklyNotes.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-[#1a0f0a]">No weekly notes yet. Create some to get started.</p>
              </Card>
            ) : (
              weeklyNotes.map((note) => (
                <Card
                  key={note.id}
                  className={`${!note.active ? "opacity-60" : ""}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-[#d4a348]/20 text-[#d4a348] px-2 py-1 rounded">
                            Week {note.week_number}
                          </span>
                          <span className="text-xs text-[#c97a2a]">Rotation: {note.rotation_index}</span>
                        </div>
                        <h3 className="font-semibold text-[#1a0f0a] mt-2">{note.title}</h3>
                        <p className="text-sm text-[#1a0f0a] line-clamp-2 mt-1">{note.body}</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleNoteActive(note.id, note.active)}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                            note.active
                              ? "bg-[#c97a2a]/20 text-[#c97a2a] hover:bg-[#c97a2a]/30"
                              : "bg-[#a0704a]/20 text-[#a0704a] hover:bg-[#a0704a]/30"
                          }`}
                        >
                          {note.active ? "Active" : "Inactive"}
                        </button>
                        <Link href={`/app/admin/daily-companion/notes/${note.id}`}>
                          <button className="text-xs text-[#d4a348] hover:text-[#c09560] font-medium">
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
