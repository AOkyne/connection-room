"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { CONVERSATION_STARTERS } from "./ConversationStarters";

interface ConversationStarterPickerProps {
  onInsert: (prompt: string) => void;
  onClose: () => void;
}

// Shows exactly one prompt at a time -- "Get another" cycles to a
// different one, "Insert" hands the text to the composer (never sends it
// automatically), "Close" dismisses without using it. No server round
// trip, no dismissal-tracking: this is deliberately lightweight scaffolding,
// not a structured exercise (spec section 6).
export function ConversationStarterPicker({ onInsert, onClose }: ConversationStarterPickerProps) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * CONVERSATION_STARTERS.length));

  const handleAnother = () => {
    if (CONVERSATION_STARTERS.length <= 1) return;
    let next = index;
    while (next === index) next = Math.floor(Math.random() * CONVERSATION_STARTERS.length);
    setIndex(next);
  };

  return (
    <div className="bg-[#f3ede5] rounded-lg p-3 space-y-2">
      <p className="text-xs font-medium text-[#c97a2a] uppercase">Conversation Starter</p>
      <p className="text-sm text-[#1a0f0a] italic">"{CONVERSATION_STARTERS[index]}"</p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => onInsert(CONVERSATION_STARTERS[index])}>
          Insert
        </Button>
        <Button variant="outline" size="sm" onClick={handleAnother}>
          Get another
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
