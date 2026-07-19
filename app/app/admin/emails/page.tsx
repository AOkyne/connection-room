"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEmailTemplates, updateEmailTemplate, type EmailTemplate } from "@/lib/admin/email-templates";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

const LABELS: Record<string, string> = {
  welcome: "Welcome (sent at signup)",
  day5: "Day 5",
  day14: "Day 14",
  day30: "Day 30",
  "onboarding-incomplete-day1": "Incomplete profile: Day 1",
  "onboarding-incomplete-day3": "Incomplete profile: Day 3",
  "onboarding-incomplete-day5": "Incomplete profile: Day 5",
};

export default function AdminEmailsPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signOff, setSignOff] = useState("");
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selected = templates.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      const { templates: fetched, error } = await getEmailTemplates();
      if (error) {
        showToast(error, "error");
      } else {
        setTemplates(fetched);
        if (fetched.length > 0) {
          selectTemplate(fetched[0]);
        }
      }
      setMounted(true);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function selectTemplate(template: EmailTemplate) {
    setSelectedId(template.id);
    setSubject(template.subject);
    setBody(template.body);
    setSignOff(template.sign_off);
    setActive(template.active);
  }

  const hasChanges =
    !!selected &&
    (subject !== selected.subject ||
      body !== selected.body ||
      signOff !== selected.sign_off ||
      active !== selected.active);

  async function handleSave() {
    if (!selected) return;
    setIsSaving(true);
    try {
      const { template, error } = await updateEmailTemplate(selected.id, {
        subject,
        body,
        sign_off: signOff,
        active,
      });
      if (error || !template) {
        showToast(error || "Failed to save", "error");
        return;
      }
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
      showToast("Email template saved", "success");
    } catch (error) {
      console.error("Error saving email template:", error);
      showToast("Error saving email template", "error");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    if (selected) selectTemplate(selected);
  }

  if (!mounted) {
    return <LoadingScreen message="Loading email templates" subtitle="Just a moment..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Automated Emails", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Automated Emails</h1>
        <p className="text-[#a0704a] mt-1">
          Edit the welcome email, the 5/14/30-day follow-up sequence, and the 1/3/5-day
          incomplete-profile reminders. Changes take effect immediately — no code deploy needed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTemplate(t)}
            className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              selectedId === t.id
                ? "bg-[#d4a348] text-white"
                : "bg-[#f3ede5] text-[#1a0f0a] hover:bg-[#e8ddd2]"
            } ${!t.active ? "opacity-50" : ""}`}
          >
            {LABELS[t.key] || t.key}
            {!t.active && " (inactive)"}
          </button>
        ))}
      </div>

      {selected && (
        <Card>
          <CardHeader title={LABELS[selected.key] || selected.key} />
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a] font-mono text-sm"
              />
              <p className="text-xs text-[#a0704a] mt-1">
                Leave a blank line between paragraphs. A single line break (no blank line) stays
                within the same paragraph — useful for bullet lists. Use{" "}
                <span className="font-mono">{"{{firstName}}"}</span> and{" "}
                <span className="font-mono">{"{{appUrl}}"}</span> to insert the member's first
                name and a link to the site.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-[#1a0f0a] block mb-1">
                Sign-off (before "Trevor James / Founder, The Connection Room")
              </label>
              <input
                type="text"
                value={signOff}
                onChange={(e) => setSignOff(e.target.value)}
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[#1a0f0a]">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4"
              />
              Active{" "}
              {selected.days_after_onboarding === null && selected.days_after_signup_if_incomplete === null
                ? "(sends at signup)"
                : "(sends by the daily cron job)"}
            </label>
            {!active && (
              <p className="text-xs text-[#a0704a]">
                While inactive, this email won&rsquo;t be sent to anyone, but members already
                past this stage will still receive it once you turn it back on.
              </p>
            )}

            <div className="flex gap-2 pt-2 border-t border-[#e8ddd2]">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={!hasChanges || isSaving}>
                Cancel
              </Button>
            </div>
            {hasChanges && <p className="text-sm text-orange-600">You have unsaved changes</p>}
          </div>
        </Card>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
