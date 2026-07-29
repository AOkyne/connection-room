"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import {
  acceptConnectionInvitation,
  declineConnectionInvitation,
  getCurrentRoundStates,
  type CurrentRoundState,
} from "@/lib/data/connectionAsync";
import type { AsyncConnection } from "@/lib/types/connection";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import { bucketForConnection, type DashboardBucket } from "@/lib/utils/connectionDashboardBuckets";

const BUCKET_LABELS: Record<DashboardBucket, string> = {
  invitations: "Invitations",
  waitingForYou: "Waiting for you",
  waitingForThem: "Waiting for them",
  readyToReveal: "Ready to reveal",
  active: "Active exchanges",
  live: "Live conversations",
  completed: "Completed",
  expiredEnded: "Expired or ended",
};

export function GuidedExchangeSection({ connections, myUserId }: { connections: AsyncConnection[]; myUserId: string }) {
  const { toasts, showToast, removeToast } = useToast();
  const [roundStates, setRoundStates] = useState<Record<string, CurrentRoundState>>({});
  const [localConnections, setLocalConnections] = useState(connections);

  useEffect(() => {
    setLocalConnections(connections);
  }, [connections]);

  useEffect(() => {
    const inProgressIds = localConnections
      .filter((c) => ["active", "extended", "awaiting_next_round"].includes(c.status))
      .map((c) => c.id);

    if (inProgressIds.length === 0) return;

    getCurrentRoundStates(inProgressIds, myUserId).then((states) => {
      const map: Record<string, CurrentRoundState> = {};
      for (const s of states) map[s.connectionId] = s;
      setRoundStates(map);
    });
  }, [localConnections, myUserId]);

  if (localConnections.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-[#1a0f0a]">You don't have an active guided connection yet. When you're ready, we'll help you begin one.</p>
      </Card>
    );
  }

  const buckets: Record<DashboardBucket, AsyncConnection[]> = {
    invitations: [],
    waitingForYou: [],
    waitingForThem: [],
    readyToReveal: [],
    active: [],
    live: [],
    completed: [],
    expiredEnded: [],
  };

  for (const c of localConnections) {
    buckets[bucketForConnection(c, roundStates[c.id])].push(c);
  }

  const handleAccept = async (connectionId: string) => {
    const status = await acceptConnectionInvitation(connectionId);
    if (status) {
      showToast("Connection accepted -- your first round is ready.", "success");
      setLocalConnections((prev) => prev.map((c) => (c.id === connectionId ? { ...c, status } : c)));
    } else {
      showToast("Could not accept this invitation. Please try again.", "error");
    }
  };

  const handleDecline = async (connectionId: string) => {
    const ok = await declineConnectionInvitation(connectionId);
    if (ok) {
      setLocalConnections((prev) => prev.map((c) => (c.id === connectionId ? { ...c, status: "declined" } : c)));
    } else {
      showToast("Could not decline this invitation. Please try again.", "error");
    }
  };

  const order: DashboardBucket[] = ["invitations", "readyToReveal", "waitingForYou", "active", "live", "waitingForThem", "completed", "expiredEnded"];

  return (
    <div className="space-y-6">
      {order
        .filter((bucket) => buckets[bucket].length > 0)
        .map((bucket) => (
          <div key={bucket} className="space-y-3">
            <h3 className="text-lg font-semibold text-[#1a0f0a]">{BUCKET_LABELS[bucket]}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {buckets[bucket].map((connection) => (
                <Card key={connection.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={connection.partnerName} photo={connection.partnerPhoto} size="lg" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1a0f0a]">{connection.partnerName}</h4>
                      <ConnectionStatusBadge status={connection.status} />
                    </div>
                  </div>
                  {connection.sharedPrompt && (
                    <p className="text-sm italic text-[#1a0f0a] line-clamp-2">"{connection.sharedPrompt}"</p>
                  )}
                  {bucket === "invitations" ? (
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => handleAccept(connection.id)}>
                        Accept connection
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDecline(connection.id)}>
                        Decline privately
                      </Button>
                    </div>
                  ) : (
                    <Link href={`/app/connections/${connection.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        {bucket === "readyToReveal" ? "View reveal" : "Open connection"}
                      </Button>
                    </Link>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
