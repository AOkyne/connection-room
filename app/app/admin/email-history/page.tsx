"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEmailHistory, getBroadcastCampaigns, type SentEmail, type BroadcastCampaign } from "@/lib/admin/email-history";
import { Card, CardHeader } from "@/components/Card";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/Button";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

const CATEGORY_LABELS: Record<string, string> = {
  welcome: "Welcome",
  drip_onboarding: "Reminder (finish profile)",
  drip_incomplete_onboarding: "Reminder (incomplete signup)",
  digest: "Digest",
  post_notification: "New post notification",
  broadcast: "Broadcast",
  admin_direct: "Direct message",
};

function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

export default function AdminEmailHistoryPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const load = async (targetPage: number, targetCategory: string, targetSearch: string) => {
    setLoading(true);
    const result = await getEmailHistory({ page: targetPage, category: targetCategory, search: targetSearch });
    if (result.error) {
      showToast(result.error, "error");
    } else {
      setEmails(result.emails);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }
      await load(1, "", "");
      setMounted(true);

      setCampaignsLoading(true);
      const campaignResult = await getBroadcastCampaigns();
      if (campaignResult.error) {
        showToast(campaignResult.error, "error");
      } else {
        setCampaigns(campaignResult.campaigns);
      }
      setCampaignsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleFilterChange = (nextCategory: string, nextSearch: string) => {
    setCategory(nextCategory);
    setSearch(nextSearch);
    load(1, nextCategory, nextSearch);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!mounted) {
    return <LoadingScreen message="Loading email history" subtitle="Just a moment..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Email History", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Email History</h1>
        <p className="text-[#a0704a] mt-1">Every email the app has sent, when, and to whom</p>
      </div>

      <Card>
        <CardHeader
          title="Broadcast performance"
          subtitle="Open and click rates per broadcast, most recent first"
        />
        {campaignsLoading ? (
          <p className="text-[#a0704a] py-6 text-center">Loading...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-[#a0704a] py-6 text-center">
            No broadcast tracking data yet -- this fills in once you send a broadcast.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#a0704a] border-b border-[#e8ddd2]">
                  <th className="py-2 pr-4 font-medium">Sent</th>
                  <th className="py-2 pr-4 font-medium">Subject</th>
                  <th className="py-2 pr-4 font-medium text-right">Recipients</th>
                  <th className="py-2 pr-4 font-medium text-right">Opened</th>
                  <th className="py-2 font-medium text-right">Clicked</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.batchId} className="border-b border-[#f3ede5] last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-[#a0704a]">
                      {new Date(c.sentAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2 pr-4 text-[#1a0f0a]">{c.subject}</td>
                    <td className="py-2 pr-4 text-right text-[#1a0f0a]">{c.totalSent}</td>
                    <td className="py-2 pr-4 text-right text-[#1a0f0a]">
                      {c.uniqueOpens} <span className="text-[#a0704a]">({Math.round(c.openRate * 100)}%)</span>
                    </td>
                    <td className="py-2 text-right text-[#1a0f0a]">
                      {c.uniqueClicks} <span className="text-[#a0704a]">({Math.round(c.clickRate * 100)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-[#a0704a] pt-3">
              Open counts include automatic loads from Apple Mail Privacy Protection, which inflates them for some
              recipients -- click rates are the more trustworthy signal.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={search}
            onChange={(e) => handleFilterChange(category, e.target.value)}
            className="flex-1 px-4 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a]"
          />
          <select
            value={category}
            onChange={(e) => handleFilterChange(e.target.value, search)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm text-[#1a0f0a] focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
          >
            <option value="">All types</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <CardHeader title={`${total} email${total === 1 ? "" : "s"} sent`} />
        {loading ? (
          <p className="text-[#a0704a] py-6 text-center">Loading...</p>
        ) : emails.length === 0 ? (
          <p className="text-[#a0704a] py-6 text-center">No emails found matching your filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#a0704a] border-b border-[#e8ddd2]">
                    <th className="py-2 pr-4 font-medium">Sent</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">To</th>
                    <th className="py-2 font-medium">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr key={email.id} className="border-b border-[#f3ede5] last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-[#a0704a]">
                        {new Date(email.sent_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <span className="text-xs bg-[#f3ede5] text-[#a0704a] px-2 py-1 rounded">
                          {formatCategory(email.category)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-[#1a0f0a]">
                        {email.to_email}
                        {email.cc_email && (
                          <span className="text-[#a0704a]"> (cc: {email.cc_email})</span>
                        )}
                      </td>
                      <td className="py-2 text-[#1a0f0a]">{email.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#e8ddd2]">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => load(page - 1, category, search)}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-[#a0704a]">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => load(page + 1, category, search)}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
