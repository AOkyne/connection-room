"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { sayHello } from "@/lib/data/connectionsDirect";
import { trackConnectionEvent } from "@/lib/analytics/connectionEvents";

const STARTERS = [
  "I saw something in your profile that resonated with me...",
  "Looks like we joined for some similar reasons. What brought you here?",
  "Just saying hello. I'd be interested in getting to know you.",
];

interface SayHelloModalProps {
  toUserId: string;
  toDisplayName: string;
  onClose: () => void;
  onSent: (connectionId: string) => void;
  onError: (message: string) => void;
}

// The "compose experience" from a directory card -- optional starters
// (never forced; "Write my own" just clears the field back to blank) plus
// a free-text box. Sending calls the same say_hello() RPC (migration 096)
// as the minimal version on the profile page -- this is just a nicer
// front door to it, not a second implementation.
export function SayHelloModal({ toUserId, toDisplayName, onClose, onSent, onError }: SayHelloModalProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const result = await sayHello(toUserId, text.trim());
    setSending(false);

    if (result.error || !result.connectionId) {
      onError(result.error || "Could not send this message. Please try again.");
      return;
    }
    trackConnectionEvent({ eventType: "first_message_sent", relatedUserId: toUserId, connectionId: result.connectionId });
    onSent(result.connectionId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#fffbf7] rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#1a0f0a]">Say hello to {toDisplayName}</h2>
          <button onClick={onClose} className="text-[#a0704a] hover:text-[#1a0f0a]" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-sm text-[#a0704a]">Need a starting point?</p>
          <div className="flex flex-col gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                onClick={() => {
                  trackConnectionEvent({ eventType: "suggested_starter_selected", relatedUserId: toUserId });
                  setText(starter);
                }}
                className="text-left text-sm px-3 py-2 rounded-lg border border-[#e8ddd2] text-[#1a0f0a] hover:bg-[#f3ede5] transition-colors"
              >
                {starter}
              </button>
            ))}
            <button
              onClick={() => setText("")}
              className="text-left text-sm px-3 py-2 rounded-lg text-[#c97a2a] hover:bg-[#f3ede5] transition-colors"
            >
              Write my own
            </button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Say hello to ${toDisplayName}...`}
          rows={4}
          autoFocus
          className="w-full px-3 py-2 border border-[#e8ddd2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a348] text-[#1a0f0a] mb-4"
        />

        <div className="flex gap-2">
          <Button variant="primary" size="md" onClick={handleSend} disabled={sending || !text.trim()} className="flex-1">
            {sending ? "Sending..." : "Send"}
          </Button>
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
