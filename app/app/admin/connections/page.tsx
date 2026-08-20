"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { getConnectionsOverview, type ConnectionsOverview } from "@/lib/admin/connections";
import { Card, CardHeader } from "@/components/Card";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

const STATUS_LABELS: Record<string, string> = {
  pending_their_acceptance: "Awaiting acceptance (legacy)",
  confirmed: "Confirmed (legacy)",
  awaiting_acceptance: "Awaiting acceptance",
  accepted_by_one: "Accepted by one side",
  waiting_for_participant: "Waiting on a participant",
  active: "Active",
  extended: "Extended",
  awaiting_next_round: "Awaiting next round",
  exchange_complete: "Exchange complete",
  live_requested: "Live conversation requested",
  live_scheduled: "Live conversation scheduled",
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  ended: "Ended early",
  cancelled: "Cancelled",
  reported: "Reported",
};

function formatStatus(status: string): string {
  return STATUS_LABELS[status] || status;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminConnectionsPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<ConnectionsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      const result = await getConnectionsOverview();
      if (result.error) {
        showToast(result.error, "error");
      } else {
        setOverview(result.overview);
      }
      setLoading(false);
      setMounted(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!mounted) {
    return <LoadingScreen message="Loading Connections activity" subtitle="Just a moment..." />;
  }

  const activeStatuses = ["active", "awaiting_acceptance", "accepted_by_one", "waiting_for_participant", "extended", "awaiting_next_round"];
  const liveStatuses = ["live_requested", "live_scheduled"];
  const endedStatuses = ["completed", "declined", "expired", "ended", "cancelled"];

  const sumStatuses = (statuses: string[]) =>
    statuses.reduce((sum, s) => sum + (overview?.statusCounts[s] || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Connections Activity", isActive: true },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold text-[#1a0f0a]">Connections Activity</h1>
        <p className="text-[#a0704a] mt-1">
          Aggregate activity across every member Connection -- no round or message content is shown here by design. To
          read what was actually exchanged in a specific connection, a member has to have reported it first (see{" "}
          <a href="/app/admin/concerns" className="underline">
            Reported Concerns
          </a>
          ).
        </p>
      </div>

      {loading ? (
        <Card>
          <p className="text-[#a0704a] py-6 text-center">Loading...</p>
        </Card>
      ) : !overview ? (
        <Card>
          <p className="text-[#a0704a] py-6 text-center">Could not load Connections activity.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="text-center">
              <p className="text-3xl font-bold text-[#1a0f0a]">{overview.totalConnections}</p>
              <p className="text-sm text-[#a0704a] mt-1">Total (recent 500)</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-[#1a0f0a]">{sumStatuses(activeStatuses)}</p>
              <p className="text-sm text-[#a0704a] mt-1">In progress</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-[#1a0f0a]">{sumStatuses(liveStatuses)}</p>
              <p className="text-sm text-[#a0704a] mt-1">Live requested/scheduled</p>
            </Card>
            <Card className={`text-center ${overview.pendingReportsCount > 0 ? "border-red-300 bg-red-50" : ""}`}>
              <p className="text-3xl font-bold text-[#1a0f0a]">{overview.pendingReportsCount}</p>
              <p className="text-sm text-[#a0704a] mt-1">Pending reports</p>
            </Card>
          </div>

          <Card>
            <CardHeader title="Status breakdown" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(overview.statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <span
                    key={status}
                    className="text-sm bg-[#f3ede5] text-[#1a0f0a] px-3 py-1.5 rounded-full"
                  >
                    {formatStatus(status)}: <strong>{count}</strong>
                  </span>
                ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={`Stuck rounds (${overview.stuckRounds.length})`}
              subtitle="Open rounds whose response deadline has already passed -- a real signal a connection needs a nudge or has stalled"
            />
            {overview.stuckRounds.length === 0 ? (
              <p className="text-[#a0704a] py-4 text-center">No rounds are past their deadline right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#a0704a] border-b border-[#e8ddd2]">
                      <th className="py-2 pr-4 font-medium">Participants</th>
                      <th className="py-2 pr-4 font-medium">Round</th>
                      <th className="py-2 font-medium">Deadline missed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.stuckRounds.map((r) => (
                      <tr key={`${r.connectionId}-${r.roundNumber}`} className="border-b border-[#f3ede5] last:border-0">
                        <td className="py-2 pr-4 text-[#1a0f0a]">{r.participants.join(" & ")}</td>
                        <td className="py-2 pr-4 text-[#1a0f0a]">Round {r.roundNumber}</td>
                        <td className="py-2 text-[#a0704a]">{formatDateTime(r.deadlineMissedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Upcoming live conversations" />
            {overview.liveSessions.upcoming.length === 0 ? (
              <p className="text-[#a0704a] py-4 text-center">Nothing scheduled.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#a0704a] border-b border-[#e8ddd2]">
                      <th className="py-2 pr-4 font-medium">Participants</th>
                      <th className="py-2 font-medium">Scheduled for</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.liveSessions.upcoming.map((s) => (
                      <tr key={s.connectionId} className="border-b border-[#f3ede5] last:border-0">
                        <td className="py-2 pr-4 text-[#1a0f0a]">{s.participants.join(" & ")}</td>
                        <td className="py-2 text-[#a0704a]">{formatDateTime(s.scheduledStartAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent connections" subtitle="Most recent 50, newest first" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#a0704a] border-b border-[#e8ddd2]">
                    <th className="py-2 pr-4 font-medium">Started</th>
                    <th className="py-2 pr-4 font-medium">Participants</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Round</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recent.map((c) => (
                    <tr key={c.id} className="border-b border-[#f3ede5] last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-[#a0704a]">{formatDateTime(c.createdAt)}</td>
                      <td className="py-2 pr-4 text-[#1a0f0a]">{c.participants.join(" & ")}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            c.isReported ? "bg-red-100 text-red-800" : "bg-[#f3ede5] text-[#a0704a]"
                          }`}
                        >
                          {formatStatus(c.status)}
                          {c.isReported ? " · reported" : ""}
                        </span>
                      </td>
                      <td className="py-2 text-[#1a0f0a]">{c.currentRoundNumber || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-[#a0704a] text-center">
            ({sumStatuses(endedStatuses)} ended, completed, declined, expired, or cancelled connections not otherwise
            highlighted above)
          </p>
        </>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
