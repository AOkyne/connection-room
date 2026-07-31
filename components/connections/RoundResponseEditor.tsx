"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import type { ConnectionRound } from "@/lib/types/connection";
import { saveResponseDraft, submitRoundResponse } from "@/lib/data/connectionAsync";

function formatTimeRemaining(deadline: Date): string {
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return "This window has closed";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 24) return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"} left to respond`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} left to respond`;
  const minutes = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `${minutes} minute${minutes === 1 ? "" : "s"} left to respond`;
}

export function RoundResponseEditor({
  round,
  initialDraft,
  alreadySubmitted,
  onSubmitted,
}: {
  round: ConnectionRound;
  initialDraft: string;
  alreadySubmitted: boolean;
  onSubmitted: () => void;
}) {
  const [text, setText] = useState(initialDraft);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Flips immediately on a successful submit, without waiting for the
  // parent's onSubmitted() -> reload round-trip -- previously the only
  // way this editor ever showed a "submitted" state was via the
  // alreadySubmitted prop coming back around through a full page reload,
  // which (a) has a visible delay and (b) was also wrong whenever the
  // round was still 'open' waiting on the other participant (see the
  // parent page's own fix for that). This local flag makes the
  // transition instant and correct regardless of what the parent
  // computes.
  const [justSubmitted, setJustSubmitted] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(initialDraft);
    setJustSubmitted(false);
  }, [round.id, initialDraft]);

  if (alreadySubmitted || justSubmitted) {
    return (
      <div className="bg-white rounded-lg p-4 space-y-2">
        <p className="text-sm text-[#1a0f0a]">
          Your response has been submitted. We'll reveal both responses after your connection has answered.
        </p>
        <p className="text-xs text-[#a0704a]" role="status">
          {formatTimeRemaining(round.responseDeadlineAt)}
        </p>
      </div>
    );
  }

  const handleChange = (value: string) => {
    if (value.length > round.responseCharacterLimit) return;
    setText(value);
    setError(null);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await saveResponseDraft(round.id, value);
      setSaving(false);
    }, 800);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await submitRoundResponse(round.id, text.trim());
    setSubmitting(false);
    if (!result) {
      setError("Could not submit your response. Please try again.");
      return;
    }
    setJustSubmitted(true);
    onSubmitted();
  };

  return (
    <div className="space-y-3">
      <label htmlFor={`round-response-${round.id}`} className="sr-only">
        Your response to this round's prompt
      </label>
      <textarea
        id={`round-response-${round.id}`}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={5}
        maxLength={round.responseCharacterLimit}
        placeholder="Respond when you have space. There's no rush."
        className="w-full px-3 py-3 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-sm"
      />
      <div className="flex items-center justify-between text-xs text-[#a0704a]">
        <span aria-live="polite">{saving ? "Saving draft…" : " "}</span>
        <span>
          {text.length}/{round.responseCharacterLimit}
        </span>
      </div>
      <p className="text-xs text-[#a0704a]" role="status">
        {formatTimeRemaining(round.responseDeadlineAt)}
      </p>
      {error && (
        <p className="text-sm text-[#a02f2f]" role="alert">
          {error}
        </p>
      )}
      <Button variant="primary" onClick={handleSubmit} disabled={!text.trim() || submitting} aria-busy={submitting}>
        {submitting ? "Submitting…" : "Submit response"}
      </Button>
    </div>
  );
}
