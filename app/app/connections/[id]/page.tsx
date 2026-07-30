"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/data/profiles";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ConnectionStatusBadge } from "@/components/connections/ConnectionStatusBadge";
import { RoundResponseEditor } from "@/components/connections/RoundResponseEditor";
import { RevealPanel } from "@/components/connections/RevealPanel";
import { AcknowledgmentPicker } from "@/components/connections/AcknowledgmentPicker";
import { LiveScheduler } from "@/components/connections/LiveScheduler";
import { useToast } from "@/lib/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import {
  getAsyncConnection,
  getConnectionRounds,
  getCurrentRound,
  getMyDraft,
  getRoundResponses,
  extendConnectionDeadline,
  endAsyncConnection,
  reportAsyncConnection,
  requestLiveConversation,
  respondToLiveRequest,
} from "@/lib/data/connectionAsync";
import type { AsyncConnection, ConnectionRound, RoundResponseView } from "@/lib/types/connection";

export default function ConnectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params?.id as string;
  const { toasts, showToast, removeToast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [connection, setConnection] = useState<AsyncConnection | null>(null);
  const [rounds, setRounds] = useState<ConnectionRound[]>([]);
  const [currentRound, setCurrentRound] = useState<ConnectionRound | null>(null);
  const [myDraft, setMyDraft] = useState("");
  const [responses, setResponses] = useState<RoundResponseView[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const load = async () => {
    const profile = await getProfile();
    if (!profile) {
      setMounted(true);
      return;
    }
    setUserId(profile.id);

    const conn = await getAsyncConnection(connectionId, profile.id);
    setConnection(conn);
    if (!conn) {
      setMounted(true);
      return;
    }

    const roundList = await getConnectionRounds(connectionId);
    setRounds(roundList);

    if (conn.currentRoundNumber > 0) {
      const round = await getCurrentRound(connectionId, conn.currentRoundNumber);
      setCurrentRound(round);

      if (round) {
        if (round.status === "open") {
          const draft = await getMyDraft(round.id, conn.myParticipantId);
          setMyDraft(draft);
        } else if (round.status === "revealed") {
          const roundResponses = await getRoundResponses(round.id);
          setResponses(roundResponses);
        }
      }
    }

    setMounted(true);
  };

  useEffect(() => {
    if (connectionId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  if (!mounted) {
    return <LoadingScreen message="Loading your connection" subtitle="Just a moment..." />;
  }

  if (!connection || !userId) {
    return (
      <div className="space-y-4">
        <p className="text-[#1a0f0a]">This connection could not be found, or you don't have access to it.</p>
        <Link href="/app/connections">
          <Button variant="outline">Back to Connections</Button>
        </Link>
      </div>
    );
  }

  const myResponse = responses.find((r) => r.isMine);
  const iHaveSubmitted = currentRound?.status === "revealed" || !!myResponse?.submittedAt;

  const handleExtend = async () => {
    const ok = await extendConnectionDeadline(connection.id);
    if (ok) {
      showToast("Your connection window has been extended so there is more time to respond.", "success");
      await load();
    } else {
      showToast("Could not extend this connection -- an extension may already have been used.", "error");
    }
  };

  const handleEnd = async () => {
    const ok = await endAsyncConnection(connection.id);
    if (ok) {
      showToast("This connection has ended.", "success");
      router.push("/app/connections");
    } else {
      showToast("Could not end this connection. Please try again.", "error");
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    const ok = await reportAsyncConnection(connection.id, reportReason.trim());
    if (ok) {
      showToast("Concern reported. An admin will review it.", "success");
      setShowReportForm(false);
      setReportReason("");
    } else {
      showToast("Could not submit your report. Please try again.", "error");
    }
  };

  const handleRequestLive = async () => {
    const ok = await requestLiveConversation(connection.id);
    if (ok) {
      showToast("Live conversation requested.", "success");
      await load();
    }
  };

  // Per spec, the live-conversation upsell only appears once at least one
  // round has actually been COMPLETED (both sides revealed and advanced),
  // not merely opened. current_round_number is set to 1 the instant a
  // connection activates -- before either side has answered anything --
  // so checking `currentRoundNumber >= 1` here made this card (with its
  // 20-minute framing) appear immediately alongside the very first
  // prompt on every new connection, crowding out the async round
  // experience it's supposed to be optional next-step after.
  const hasCompletedARound = rounds.some((r) => r.status === "completed");
  const canOfferLive = hasCompletedARound && !["live_requested", "live_scheduled", "completed", "ended", "expired", "declined", "cancelled", "reported"].includes(connection.status);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/app/connections" className="text-sm text-[#d4a348] hover:text-[#c9956d]">
            ← Back to Connections
          </Link>
          <h1 className="text-3xl text-[#1a0f0a] mt-2">Guided Connection</h1>
        </div>
        <ConnectionStatusBadge status={connection.status} />
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={connection.partnerName} photo={connection.partnerPhoto} size="xl" />
          <div>
            <h2 className="text-xl font-semibold text-[#1a0f0a]">{connection.partnerName}</h2>
            {rounds.length > 0 && (
              <p className="text-sm text-[#a0704a]">
                Round {connection.currentRoundNumber} of {rounds.length}
              </p>
            )}
          </div>
        </div>
      </Card>

      {["awaiting_acceptance", "declined", "expired", "ended", "cancelled"].includes(connection.status) && (
        <Card className="text-center py-8">
          {connection.status === "awaiting_acceptance" && (
            <p className="text-[#1a0f0a]">Waiting for your connection to respond to the invitation.</p>
          )}
          {connection.status === "declined" && (
            <p className="text-[#1a0f0a]">This connection was not confirmed. We'll help you find another opportunity.</p>
          )}
          {connection.status === "expired" && (
            <p className="text-[#1a0f0a]">This connection window has closed. You can reflect on what you shared or request another guided connection.</p>
          )}
          {connection.status === "ended" && <p className="text-[#1a0f0a]">This connection has ended.</p>}
          {connection.status === "cancelled" && <p className="text-[#1a0f0a]">This connection was cancelled.</p>}
        </Card>
      )}

      {currentRound && currentRound.status === "open" && (
        <Card>
          <CardHeader title={`Round ${currentRound.roundNumber}`} />
          <div className="space-y-4">
            <p className="text-[#1a0f0a] italic">"{currentRound.promptText}"</p>
            <RoundResponseEditor
              round={currentRound}
              initialDraft={myDraft}
              alreadySubmitted={iHaveSubmitted}
              onSubmitted={load}
            />
          </div>
        </Card>
      )}

      {currentRound && currentRound.status === "revealed" && (
        <Card>
          <CardHeader title={`Round ${currentRound.roundNumber} -- Revealed`} />
          <div className="space-y-4">
            <p className="text-[#1a0f0a] italic">"{currentRound.promptText}"</p>
            <RevealPanel roundId={currentRound.id} responses={responses} partnerName={connection.partnerName} />
            <AcknowledgmentPicker
              roundId={currentRound.id}
              alreadySubmitted={!!myResponse?.advancedAt}
              onAdvanced={(result) => {
                if (result === "exchange_complete") showToast("Guided exchange complete!", "success");
                load();
              }}
            />
          </div>
        </Card>
      )}

      {connection.status === "exchange_complete" && (
        <Card className="text-center py-6 space-y-2">
          <p className="text-[#1a0f0a]">
            You completed this guided exchange. You can revisit the reflections or decide whether you would like to stay connected.
          </p>
        </Card>
      )}

      {currentRound && !["revealed"].includes(currentRound.status) && !connection.extensionUsedAt && currentRound.status === "open" && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleExtend}>
            I need more time
          </Button>
        </div>
      )}

      {(connection.status === "live_requested" || connection.status === "live_scheduled") && (
        <Card>
          <CardHeader title="Live conversation" />
          <LiveScheduler connectionId={connection.id} myParticipantId={connection.myParticipantId} />
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => respondToLiveRequest(connection.id, "continue_async").then(load)}>
              Continue asynchronously instead
            </Button>
          </div>
        </Card>
      )}

      {canOfferLive && (
        <Card className="bg-[#f3ede5]">
          <CardHeader title="Would you like a live conversation?" />
          <p className="text-sm text-[#1a0f0a] mb-3">
            You can request a 20-minute live conversation, or keep using the guided exchange.
          </p>
          <Button variant="secondary" size="sm" onClick={handleRequestLive}>
            Invite them to a live conversation
          </Button>
        </Card>
      )}

      <Card className="space-y-3">
        <p className="text-sm text-[#1a0f0a]">It's okay to end a connection that no longer feels right.</p>
        <div className="flex gap-2">
          {!showEndConfirm ? (
            <Button variant="outline" size="sm" onClick={() => setShowEndConfirm(true)}>
              End connection
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" onClick={handleEnd} className="bg-[#a84a2a] hover:bg-[#a85947]">
                Confirm end
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowEndConfirm(false)}>
                Cancel
              </Button>
            </>
          )}
          {!showReportForm ? (
            <Button variant="ghost" size="sm" onClick={() => setShowReportForm(true)} className="text-[#a84a2a]">
              Report a concern
            </Button>
          ) : null}
        </div>
        {showReportForm && (
          <div className="space-y-2">
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe your concern (all reports are reviewed)..."
              rows={3}
              className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a84a2a]"
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleReport} disabled={!reportReason.trim()} className="bg-[#a84a2a] hover:bg-[#a85947]">
                Submit report
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowReportForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
