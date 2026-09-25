"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllProfilesLite, type Profile } from "@/lib/data/profiles";
import { sendBroadcastEmail } from "@/lib/admin/broadcast";
import { getAdminEvents } from "@/lib/admin/events";
import { getAdminNewsletterQuestions } from "@/lib/admin/newsletter";
import { getSpaces } from "@/lib/data/spaces";
import { getBroadcastCampaigns, getUnsentRecipients, getBroadcastCampaignContent, type BroadcastCampaign } from "@/lib/admin/email-history";
import {
  listBroadcastDrafts,
  createBroadcastDraft,
  updateBroadcastDraft,
  deleteBroadcastDraft,
  type BroadcastDraft,
} from "@/lib/admin/broadcast-drafts";
import { substituteMergeTags } from "@/lib/email/render-template";
import { styleBroadcastBodyHtml } from "@/lib/email/template";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { BroadcastRichTextEditor, type BroadcastEventOption, type BroadcastQuestionOption, type BroadcastSpaceOption } from "@/components/BroadcastRichTextEditor";
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
  const [questions, setQuestions] = useState<BroadcastQuestionOption[]>([]);
  const [spaces, setSpaces] = useState<BroadcastSpaceOption[]>([]);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  // In-page "are you sure" step before sending. Replaces a window.confirm(),
  // which Safari was silently suppressing (returned false without ever
  // showing the dialog), so clicking Send did nothing at all.
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Sends go out in small chunks now (lib/admin/broadcast.ts) -- a big
  // "All Members" send takes a few minutes, so show real progress instead
  // of a button that just says "Sending..." the whole time.
  const [sendProgress, setSendProgress] = useState<{ processed: number; total: number } | null>(null);
  const [sendError, setSendError] = useState("");
  const [drafts, setDrafts] = useState<BroadcastDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [isLoadingUnsent, setIsLoadingUnsent] = useState(false);
  const [isLoadingReuse, setIsLoadingReuse] = useState(false);
  // In-page "this will replace what you're writing" step for Use again
  // (no window.confirm -- Safari suppresses it; see the Send button).
  const [confirmingReuse, setConfirmingReuse] = useState(false);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      setAdminUserId(session.supabaseUserId || "");

      const [profiles, adminEvents, adminQuestions, draftsResult, campaignsResult, adminSpaces] = await Promise.all([
        getAllProfilesLite(),
        getAdminEvents(),
        getAdminNewsletterQuestions(),
        listBroadcastDrafts(),
        getBroadcastCampaigns(),
        getSpaces(),
      ]);
      setSpaces(adminSpaces.map((s) => ({ id: s.id, name: s.name })));
      // Broadcasts should never go to seeded demo profiles -- they have no
      // real inbox behind them.
      setMembers(profiles.filter((p) => !p.is_demo_profile));
      setEvents(
        adminEvents
          .filter((e) => e.status === "published")
          .map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, locationName: e.locationName, imageUrl: e.imageUrl }))
      );
      setQuestions(
        adminQuestions.map((q) => ({ id: q.id, postId: q.postId, spaceId: q.spaceId, spaceName: q.spaceName, questionText: q.questionText }))
      );
      if (draftsResult.error) {
        console.error("Error loading broadcast drafts:", draftsResult.error);
      } else {
        setDrafts(draftsResult.drafts);
      }
      if (campaignsResult.error) {
        console.error("Error loading broadcast campaigns:", campaignsResult.error);
      } else {
        setCampaigns(campaignsResult.campaigns);
      }
      setMounted(true);
    };

    load();
  }, [router]);

  // The chunked send runs from this page -- closing or navigating away
  // mid-send stops it partway (whoever was already sent to stays sent;
  // "Resend to unsent recipients" finishes the rest). Warn before that
  // happens by accident.
  useEffect(() => {
    if (!isSending) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isSending]);

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

  const handleSaveDraft = async () => {
    if (!subject.trim() && !bodyHtml.trim()) {
      showToast("Nothing to save yet", "warning");
      return;
    }
    setIsSavingDraft(true);
    try {
      const params = {
        subject,
        bodyHtml,
        recipientMode,
        recipientIds: Array.from(selectedIds),
      };
      const result = currentDraftId
        ? await updateBroadcastDraft(currentDraftId, params)
        : await createBroadcastDraft(params);

      if (result.error || !result.draft) {
        showToast(result.error || "Failed to save draft", "error");
        return;
      }
      setCurrentDraftId(result.draft.id);
      setDrafts((prev) => {
        const withoutThis = prev.filter((d) => d.id !== result.draft!.id);
        return [result.draft!, ...withoutThis];
      });
      showToast("Draft saved", "success");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleLoadDraft = (draft: BroadcastDraft) => {
    if (
      (subject.trim() || bodyHtml.trim()) &&
      draft.id !== currentDraftId &&
      !confirm("Loading this draft will replace what you're currently writing. Continue?")
    ) {
      return;
    }
    setCurrentDraftId(draft.id);
    setSubject(draft.subject);
    setBodyHtml(draft.body_html);
    setRecipientMode(draft.recipient_mode);
    setSelectedIds(new Set(draft.recipient_ids));
    setShowDrafts(false);
    showToast("Draft loaded", "success");
  };

  const handleDeleteDraft = async (draft: BroadcastDraft) => {
    if (!confirm(`Delete the draft "${draft.subject || "(no subject)"}"? This can't be undone.`)) return;
    const result = await deleteBroadcastDraft(draft.id);
    if (!result.success) {
      showToast(result.error || "Failed to delete draft", "error");
      return;
    }
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    if (currentDraftId === draft.id) setCurrentDraftId(null);
    showToast("Draft deleted", "success");
  };

  // "Use again": loads a past broadcast's subject, body (when it was
  // saved) and the exact members it went to back into the composer, to
  // edit and send again. Asks first (in-page) if it would replace
  // something already being written.
  const handleUseAgain = async (confirmed = false) => {
    if (!selectedCampaignId) return;
    if (!confirmed && (subject.trim() || bodyHtml.trim())) {
      setConfirmingReuse(true);
      return;
    }
    setConfirmingReuse(false);

    setIsLoadingReuse(true);
    const { content, error } = await getBroadcastCampaignContent(selectedCampaignId);
    setIsLoadingReuse(false);
    if (error || !content) {
      showToast(error || "Couldn't load that email.", "error");
      return;
    }

    // Only members still on the list (someone who has since left can't
    // be emailed). If that's everyone, use "All Members" so the count
    // reads naturally.
    const memberIds = new Set(members.map((m) => m.id));
    const recipients = content.recipientIds.filter((id) => memberIds.has(id));
    if (recipients.length === members.length) {
      setRecipientMode("all");
      setSelectedIds(new Set());
    } else {
      setRecipientMode("select");
      setSelectedIds(new Set(recipients));
    }

    setCurrentDraftId(null);
    setSubject(content.subject);
    if (content.bodyHtml) {
      setBodyHtml(content.bodyHtml);
      showToast(
        `Loaded "${content.subject}" and its ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}. Edit anything you like, then send.`,
        "success",
        6000
      );
    } else {
      setBodyHtml("");
      showToast(
        `Loaded the subject and ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}. This email was sent before messages were saved, so write or paste the body below.`,
        "info",
        0
      );
    }
  };

  // For a broadcast that got cut short (e.g. the send route's own
  // batching hitting its serverless time limit partway through a large
  // "All Members" send) -- loads exactly the real members who don't yet
  // have a sent_emails row for that specific campaign, so a follow-up
  // send targets only whoever actually never got it, instead of
  // double-emailing everyone who already did.
  const handleLoadUnsentRecipients = async () => {
    if (!selectedCampaignId) return;
    const campaign = campaigns.find((c) => c.batchId === selectedCampaignId);
    if (!campaign) return;

    setIsLoadingUnsent(true);
    const result = await getUnsentRecipients(selectedCampaignId);
    setIsLoadingUnsent(false);

    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    if (result.unsent.length === 0) {
      showToast("Everyone from that send already received it.", "info");
      return;
    }

    // The body is filled in too when this broadcast's content was saved
    // (migration 103 -- sends from then on); older ones only have a subject.
    const { content } = await getBroadcastCampaignContent(selectedCampaignId);

    setRecipientMode("select");
    setSelectedIds(new Set(result.unsent.map((m) => m.id)));
    setSubject(content?.subject || campaign.subject);
    setCurrentDraftId(null);
    const who = `${result.unsent.length} member${result.unsent.length === 1 ? "" : "s"} who didn't get "${campaign.subject}" yet`;
    if (content?.bodyHtml) {
      setBodyHtml(content.bodyHtml);
      showToast(`Loaded ${who}, with the original message. Review it, then send.`, "info", 0);
    } else {
      showToast(
        `Loaded ${who}. The subject is filled in, but this email was sent before messages were saved -- paste the body back in below before sending.`,
        "info",
        0
      );
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !bodyHtml.trim() || recipientCount === 0) return;

    setConfirmingSend(false);
    setIsSending(true);
    setSendError("");
    try {
      // "All Members" resolves to the exact list this page already shows
      // (non-demo profiles) -- the chunked sender needs explicit ids to
      // split into small requests.
      const recipientIds = recipientMode === "all" ? members.map((m) => m.id) : Array.from(selectedIds);
      setSendProgress({ processed: 0, total: recipientIds.length });
      const { sentCount, failedCount, errors, success } = await sendBroadcastEmail(
        recipientIds,
        subject,
        bodyHtml,
        (processed, total) => setSendProgress({ processed, total })
      );

      if (success) {
        showToast(sentCount === 1 ? "Email sent" : `Email sent to ${sentCount} members`, "success");
        // A sent email is no longer a draft -- clean up the saved copy so
        // it doesn't linger in the drafts list looking unfinished.
        if (currentDraftId) {
          const idToDelete = currentDraftId;
          deleteBroadcastDraft(idToDelete).catch(() => {});
          setDrafts((prev) => prev.filter((d) => d.id !== idToDelete));
          setCurrentDraftId(null);
        }
        setSubject("");
        setBodyHtml("");
        setSelectedIds(new Set());
      } else {
        console.error("Errors sending broadcast:", errors);
        // failedCount is only meaningful once the send actually reached
        // per-recipient results -- an early failure (no session, API
        // error, network exception) can't know how many "all" recipients
        // there would have been, so it's 0 even though nothing sent.
        // Lead with sentCount/failedCount only when they're informative.
        showToast(
          sentCount > 0 || failedCount > 0
            ? `Sent ${sentCount}, failed to send ${failedCount}. See details below.`
            : "Failed to send. See details below.",
          "error"
        );
        setSendError(errors.join("; "));
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
      setSendProgress(null);
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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowDrafts((v) => !v)}>
            📝 Drafts {drafts.length > 0 && `(${drafts.length})`}
          </Button>
          <button
            onClick={() => router.back()}
            className="text-[#d4a348] hover:text-[#c9956d] transition-colors text-sm whitespace-nowrap"
            aria-label="Go back"
          >
            ← Back
          </button>
        </div>
      </div>

      {showDrafts && (
        <Card className="space-y-2">
          <h2 className="text-lg font-bold text-[#1a0f0a]">Saved Drafts</h2>
          {drafts.length === 0 ? (
            <p className="text-sm text-[#a0704a]">No saved drafts yet -- use "Save Draft" below while composing.</p>
          ) : (
            <div className="divide-y divide-[#f3ede5]">
              {drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between gap-3 py-2">
                  <button
                    onClick={() => handleLoadDraft(draft)}
                    className="flex-1 text-left hover:bg-[#f9f7f4] rounded px-2 py-1 -mx-2"
                  >
                    <div className="text-sm font-medium text-[#1a0f0a]">
                      {draft.subject || "(no subject)"}
                      {draft.id === currentDraftId && (
                        <span className="ml-2 text-xs text-[#d4a348] font-normal">currently editing</span>
                      )}
                    </div>
                    <div className="text-xs text-[#a0704a]">
                      Last saved {new Date(draft.updated_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft)}
                    className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {campaigns.length > 0 && (
        <Card className="space-y-3 bg-[#f3ede5]">
          <h2 className="text-base font-bold text-[#1a0f0a]">Past emails</h2>
          <p className="text-sm text-[#a0704a]">
            Pick a previous send. <strong>Use again</strong> loads it into the composer with the same recipients so
            you can edit and resend it. <strong>Load unsent recipients</strong> picks only the members a cut-short
            send never reached.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="flex-1 px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
            >
              <option value="">Select a previous send...</option>
              {campaigns.map((c) => (
                <option key={c.batchId} value={c.batchId}>
                  {new Date(c.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} --{" "}
                  {c.subject} ({c.totalSent} sent)
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleUseAgain()}
              disabled={!selectedCampaignId || isLoadingReuse || confirmingReuse}
            >
              {isLoadingReuse ? "Loading..." : "Use again"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadUnsentRecipients}
              disabled={!selectedCampaignId || isLoadingUnsent}
            >
              {isLoadingUnsent ? "Loading..." : "Load unsent recipients"}
            </Button>
          </div>
          {confirmingReuse && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#d4a348] bg-white p-3">
              <p className="text-sm text-[#1a0f0a] flex-1 min-w-[200px]">
                This will replace the subject, message and recipients you have in the composer now.
              </p>
              <Button variant="primary" size="sm" onClick={() => handleUseAgain(true)}>
                Replace it
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmingReuse(false)}>
                Cancel
              </Button>
            </div>
          )}
        </Card>
      )}

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
            spaces={spaces}
            questions={questions}
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
            onClick={handleSaveDraft}
            disabled={isSavingDraft || (!subject.trim() && !bodyHtml.trim())}
          >
            {isSavingDraft ? "Saving..." : currentDraftId ? "Update Draft" : "Save Draft"}
          </Button>
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
            onClick={() => setConfirmingSend(true)}
            disabled={!subject.trim() || !bodyHtml.trim() || recipientCount === 0 || isSending || confirmingSend}
          >
            {isSending
              ? sendProgress
                ? `Sending... ${sendProgress.processed} / ${sendProgress.total}`
                : "Sending..."
              : `Send to ${recipientCount} Member${recipientCount === 1 ? "" : "s"}`}
          </Button>
        </div>

        {confirmingSend && !isSending && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#d4a348] bg-[#fdfaf5] p-3">
            <p className="text-sm text-[#1a0f0a] flex-1 min-w-[200px]">
              Send &ldquo;{subject.trim()}&rdquo; to {recipientCount} member{recipientCount === 1 ? "" : "s"}? This
              can&apos;t be undone.
            </p>
            <Button variant="primary" size="sm" onClick={handleSend}>
              Yes, send it
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmingSend(false)}>
              Cancel
            </Button>
          </div>
        )}

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
