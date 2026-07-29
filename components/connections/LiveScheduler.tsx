"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import {
  submitLiveAvailability,
  getConnectionAvailability,
  confirmLiveSlot,
  getLiveSession,
  joinLiveSession,
  markLiveReady,
  getLiveSessionParticipants,
} from "@/lib/data/connectionAsync";
import { calculateOverlappingSlots, type LiveSlot } from "@/lib/utils/availabilityOverlap";
import type { LiveSession } from "@/lib/types/connection";

const myTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function LiveScheduler({
  connectionId,
  myParticipantId,
}: {
  connectionId: string;
  myParticipantId: string;
}) {
  const [availability, setAvailability] = useState<Array<{ participantId: string; startsAt: Date; endsAt: Date }>>([]);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [ready, setReady] = useState(false);
  const [bothReady, setBothReady] = useState(false);

  const load = async () => {
    const [avail, liveSession] = await Promise.all([
      getConnectionAvailability(connectionId),
      getLiveSession(connectionId),
    ]);
    setAvailability(avail);
    setSession(liveSession);

    if (liveSession && liveSession.status === "scheduled") {
      const participants = await getLiveSessionParticipants(liveSession.id);
      const mine = participants.find((p) => p.participantId === myParticipantId);
      setReady(!!mine?.readyAt);
      setBothReady(participants.filter((p) => p.readyAt).length === 2);
    }
  };

  useEffect(() => {
    load();
  }, [connectionId]);

  const mySlots = availability.filter((a) => a.participantId === myParticipantId);
  const theirSlots = availability.filter((a) => a.participantId !== myParticipantId);
  const overlapping: LiveSlot[] = calculateOverlappingSlots(mySlots, theirSlots, 20);

  const handleSubmitAvailability = async () => {
    if (!windowStart || !windowEnd) return;
    const startsAt = new Date(windowStart);
    const endsAt = new Date(windowEnd);
    if (endsAt <= startsAt) return;
    await submitLiveAvailability(connectionId, startsAt, endsAt, myTimezone);
    setWindowStart("");
    setWindowEnd("");
    await load();
  };

  const handleConfirmSlot = async (slot: LiveSlot) => {
    await confirmLiveSlot(connectionId, slot.startsAt);
    await load();
  };

  const handleJoinAndReady = async () => {
    if (!session) return;
    await joinLiveSession(session.id);
    const result = await markLiveReady(session.id);
    setReady(true);
    if (result === "started") setBothReady(true);
    await load();
  };

  if (session?.status === "active") {
    return (
      <div className="bg-[#e5f3ea] rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-[#2f6b45]">Your live conversation has started.</p>
        <p className="text-xs text-[#2f6b45]">The 20-minute timer began the moment you both confirmed you were ready.</p>
      </div>
    );
  }

  if (session?.status === "scheduled" && session.scheduledStartAt) {
    return (
      <div className="bg-white rounded-lg p-4 space-y-3 border border-[#e8ddd2]">
        <p className="text-sm font-medium text-[#1a0f0a]">
          Scheduled for {session.scheduledStartAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}{" "}
          ({myTimezone})
        </p>
        {!ready ? (
          <Button variant="primary" size="sm" onClick={handleJoinAndReady}>
            I'm here and ready
          </Button>
        ) : bothReady ? (
          <p className="text-sm text-[#2f6b45]">Both of you are ready -- starting now.</p>
        ) : (
          <p className="text-sm text-[#a0704a]" role="status">
            Waiting for the other member to confirm they're ready. The timer won't start until you're both here.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#1a0f0a]">Share a few times you're free (20 minutes minimum)</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="datetime-local"
            value={windowStart}
            onChange={(e) => setWindowStart(e.target.value)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm"
            aria-label="Availability start"
          />
          <span className="text-sm text-[#a0704a]">to</span>
          <input
            type="datetime-local"
            value={windowEnd}
            onChange={(e) => setWindowEnd(e.target.value)}
            className="px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm"
            aria-label="Availability end"
          />
          <Button variant="outline" size="sm" onClick={handleSubmitAvailability} disabled={!windowStart || !windowEnd}>
            Add
          </Button>
        </div>
        <p className="text-xs text-[#a0704a]">Times shown in your local timezone ({myTimezone}).</p>
      </div>

      {overlapping.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#1a0f0a]">Times that work for both of you</p>
          <div className="flex flex-wrap gap-2">
            {overlapping.slice(0, 6).map((slot) => (
              <button
                key={slot.startsAt.toISOString()}
                onClick={() => handleConfirmSlot(slot)}
                className="px-3 py-2 rounded-lg text-sm border border-[#d4a348] text-[#1a0f0a] hover:bg-[#f3ede5]"
              >
                {slot.startsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </button>
            ))}
          </div>
        </div>
      ) : (
        theirSlots.length > 0 && (
          <p className="text-sm text-[#a0704a]" role="status">
            No overlapping times yet -- try adding another window.
          </p>
        )
      )}
    </div>
  );
}
