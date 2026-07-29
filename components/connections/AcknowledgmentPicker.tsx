"use client";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ACKNOWLEDGMENT_TYPES, ACKNOWLEDGMENT_LABELS, type AcknowledgmentType } from "@/lib/types/connection";
import { submitAcknowledgment, advanceRound } from "@/lib/data/connectionAsync";

const CUSTOM_TEXT_LIMIT = 280;

export function AcknowledgmentPicker({
  roundId,
  alreadySubmitted,
  onAdvanced,
}: {
  roundId: string;
  alreadySubmitted: boolean;
  onAdvanced: (result: "waiting_for_participant" | "exchange_complete" | "next_round_open") => void;
}) {
  const [selected, setSelected] = useState<AcknowledgmentType | null>(null);
  const [customText, setCustomText] = useState("");
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [advancing, setAdvancing] = useState(false);

  const handleSubmitAcknowledgment = async () => {
    if (!selected) return;
    const ok = await submitAcknowledgment(roundId, selected, selected === "custom" ? customText.trim() : undefined);
    if (ok) setSubmitted(true);
  };

  const handleContinue = async () => {
    setAdvancing(true);
    const result = await advanceRound(roundId);
    setAdvancing(false);
    if (result) onAdvanced(result);
  };

  return (
    <div className="space-y-4 border-t border-[#e8ddd2] pt-4">
      <p className="text-sm font-medium text-[#1a0f0a]">Want to acknowledge what they shared? (optional)</p>

      {!submitted ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            {ACKNOWLEDGMENT_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-3 p-2 rounded hover:bg-[#f3ede5] cursor-pointer text-sm text-[#1a0f0a]"
              >
                <input
                  type="radio"
                  name={`ack-${roundId}`}
                  checked={selected === type}
                  onChange={() => setSelected(type)}
                  className="w-4 h-4"
                />
                {ACKNOWLEDGMENT_LABELS[type]}
              </label>
            ))}
          </div>
          {selected === "custom" && (
            <div>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value.slice(0, CUSTOM_TEXT_LIMIT))}
                rows={2}
                maxLength={CUSTOM_TEXT_LIMIT}
                placeholder="A short note (optional)"
                className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a348]"
              />
              <p className="text-xs text-[#a0704a] text-right">{customText.length}/{CUSTOM_TEXT_LIMIT}</p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSubmitAcknowledgment}
            disabled={!selected || (selected === "custom" && !customText.trim())}
          >
            Send acknowledgment
          </Button>
        </div>
      ) : (
        <p className="text-sm text-[#2f6b45]">Acknowledgment sent.</p>
      )}

      <Button variant="primary" onClick={handleContinue} disabled={advancing} aria-busy={advancing}>
        {advancing ? "Continuing…" : "Continue"}
      </Button>
      <p className="text-xs text-[#a0704a]">
        You can continue whenever you&rsquo;re ready -- your connection doesn&rsquo;t need to click continue at the same time.
      </p>
    </div>
  );
}
