"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { setLiveAvailabilityNow, clearLiveAvailabilityNow, getMyLiveAvailability } from "@/lib/data/connectionAsync";

const DURATIONS: Array<15 | 30 | 60> = [15, 30, 60];

// "I'm available for a live connection" -- a temporary, explicit,
// self-expiring toggle. Never inferred from browser/session presence (see
// migration 078's connection_live_availability table comment) -- this
// component is the only thing that ever writes it.
export function LiveAvailabilityToggle({ userId }: { userId: string }) {
  const [availableUntil, setAvailableUntil] = useState<Date | null>(null);
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLiveAvailability(userId).then((a) => {
      setAvailableUntil(a?.availableUntil || null);
      setLoading(false);
    });
  }, [userId]);

  const handleEnable = async () => {
    setLoading(true);
    const ok = await setLiveAvailabilityNow(duration);
    if (ok) setAvailableUntil(new Date(Date.now() + duration * 60 * 1000));
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    await clearLiveAvailabilityNow();
    setAvailableUntil(null);
    setLoading(false);
  };

  if (loading) return null;

  if (availableUntil && availableUntil.getTime() > Date.now()) {
    return (
      <div className="bg-[#e5f3ea] rounded-lg p-4 space-y-2">
        <p className="text-sm text-[#2f6b45] font-medium">You're available for a live connection right now.</p>
        <p className="text-xs text-[#2f6b45]">This will automatically turn off at {availableUntil.toLocaleTimeString()}.</p>
        <Button variant="ghost" size="sm" onClick={handleDisable}>
          Turn off
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#f3ede5] rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-[#1a0f0a]">I'm available for a live connection</p>
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              duration === d ? "bg-[#6b5a45] text-white border-[#6b5a45]" : "border-[#e8ddd2] text-[#1a0f0a]"
            }`}
          >
            {d} min
          </button>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={handleEnable}>
        Go available now
      </Button>
    </div>
  );
}
