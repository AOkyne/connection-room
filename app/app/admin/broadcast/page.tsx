"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllProfilesLite, type Profile } from "@/lib/data/profiles";
import { sendBroadcastEmail } from "@/lib/admin/broadcast";
import { getAdminEvents } from "@/lib/admin/events";
import { substituteMergeTags } from "@/lib/email/render-template";
import { styleBroadcastBodyHtml } from "@/lib/email/template";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { BroadcastRichTextEditor, type BroadcastEventOption } from "@/components/BroadcastRichTextEditor";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

type RecipientMode = "all" | "select";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://community.trevorjamesla.com";

export default function AdminBroadcastPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]);
  const [adminUserId, setAdminUserId] = useState("");
  const [events, setEvents] = useState<BroadcastEventOption[]>([]);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      setAdminUserId(session.supabaseUserId || "");

      const [profiles, adminEvents] = await Promise.all([getAllProfilesLite(), getAdminEvents()]);
      // Broadcasts should never go to seeded demo profiles -- they have no
      // real inbox behind them.
      setMembers(profiles.filter((p) => !p.is_demo_profile));
      setEvents(
        adminEvents
          .filter((e) => e.status === "published")
          .map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, locationName: e.locationName }))
      );
      setMounted(true);
    };

    load();
  }, [router]);

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => m.displayName.toLowerCase().includes(term));
  }, [members, memberSearch]);

  const recipientCount = recipientMode === "all" ? members.length : selectedIds.size;

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!subject.trim() || !bodyHtml.trim() || recipientCount === 0) return;

    const confirmed = confirm(
      `Send this email to ${recipientCount} member${recipientCount === 1 ? "" : "s"}? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsSending(true);
    setSendError("");
    try {
      const recipientIds = recipientMode === "all" ? "all" : Array.from(selectedIds);
      const { sentCount, failedCount, errors } = await sendBroadcastEmail(recipientIds, subject, bodyHtml);

      if (failedCount === 0) {
        showToast(sentCount === 1 ? "Email sent" : `Email sent to ${sentCount} members`, "success");
        setSubject("");
        setBodyHtml("");
        setSelectedIds(new Set());
      } else {
        console.error("Errors sending broadcast:", errors);
        showToast(`Sent ${sentCount}, failed to send ${failedCount}. See details below.`, "error");
        setSendError(errors.join("; "));
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted) {
    return <LoadingScreen message="Loading broadcast composer" subtitle="Just a moment..." />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", href: "/app/admin" }, { label: "Broadcast Email" }]} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl text-[#1a0f0a]">Broadcast Email</h1>
          <p className="text-lg text-[#1a0f0a] mt-2">
            Announce events and news to your members by email
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-[#d4a348] hover:text-[#c9956d] transition-colors text-sm whitespace-nowrap"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[#1a0f0a]">Recipients</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setRecipientMode("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              recipientMode === "all"
                ? "bg-[#d4a348] text-white"
                : "bg-[#f3ede5] text-[#a0704a] hover:bg-[#e8ddd2]"
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            onClick={() => setRecipientMode("select")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              recipientMode === "select"
                ? "bg-[#d4a348] text-white"
                : "bg-[#f3ede5] text-[#a0704a] hover:bg-[#e8ddd2]"
            }`}
          >
            Select Members {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>

        {recipientMode === "select" && (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members..."
                className="flex-1 px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a] text-sm"
              />
              <button
                onClick={() => setSelectedIds(new Set(filteredMembers.map((m) => m.id)))}
                className="text-xs text-[#a0704a] hover:text-[#1a0f0a] whitespace-nowrap"
              >
                Select all
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-[#a0704a] hover:text-[#1a0f0a] whitespace-nowrap"
              >
                Clear
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto border border-[#e8ddd2] rounded-lg divide-y divide-[#f3ede5]">
              {filteredMembers.length === 0 ? (
                <p className="p-3 text-sm text-[#a0704a]">No members match your search</p>
              ) : (
                filteredMembers.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-2 px-3 hover:bg-[#f9f7f4] cursor-pointer text-sm text-[#1a0f0a]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                    />
                    {m.displayName}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-[#1a0f0a]">Message</h2>
        <div>
          <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Body</label>
          <BroadcastRichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Write your announcement..."
            adminUserId={adminUserId}
            events={events}
            appUrl={APP_URL}
          />
        </div>
        <p className="text-xs text-[#a0704a]">
          The Connection Room logo is added automatically at the top, and every email is signed with your
          photo and title below your message.
        </p>

        <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            disabled={!bodyHtml.trim()}
          >
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!subject.trim() || !bodyHtml.trim() || recipientCount === 0 || isSending}
          >
            {isSending ? "Sending..." : `Send to ${recipientCount} Member${recipientCount === 1 ? "" : "s"}`}
          </Button>
        </div>

        {sendError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{sendError}</div>
        )}
      </Card>

      {showPreview && bodyHtml.trim() && (
        <Card className="p-0 overflow-hidden bg-[#F7F1E3]">
          <div className="max-w-[560px] mx-auto my-8 bg-[#FFFDF8] rounded-xl overflow-hidden">
            <div className="flex justify-center pt-8 px-8 pb-2">
              <img src="/email/welcome-logo.png" alt="The Connection Room" className="max-w-[240px] h-auto" />
            </div>
            <div className="px-8 pt-2 pb-8">
              <div
                className="text-[#1a0f0a] text-base leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: styleBroadcastBodyHtml(
                    substituteMergeTags(bodyHtml, { firstName: "Alex", appUrl: APP_URL })
                  ),
                }}
              />
              <div className="flex items-center gap-4 mt-6">
                <img
                  src="/email/welcome-signature-photo.jpg"
                  alt="Trevor James"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="text-sm leading-snug text-[#1a0f0a]">
                  <div className="font-semibold">Trevor James</div>
                  <div className="text-[#a0704a]">Founder, The Connection Room</div>
                  <div className="text-[#a0704a]">Touch Therapist and Intimacy Coach</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
