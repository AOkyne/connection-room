"use client";

import { ActionFeedback, FeedbackAction } from "./ActionFeedback";

interface DoorCompletionFeedbackProps {
  doorNumber: number;
  doorTitle: string;
  nextDoorNumber?: number;
  nextDoorTitle?: string;
  onViewNext?: () => void;
  onClose?: () => void;
}

export function DoorCompletionFeedback({
  doorNumber,
  doorTitle,
  nextDoorNumber,
  nextDoorTitle,
  onViewNext,
  onClose,
}: DoorCompletionFeedbackProps) {
  const actions: FeedbackAction[] = [];

  if (nextDoorNumber && onViewNext) {
    actions.push({
      label: `Enter Door ${nextDoorNumber}`,
      onClick: onViewNext,
      variant: "primary",
    });
  }

  actions.push({
    label: "Return to My Journey",
    href: "/app/journey",
    variant: "secondary",
  });

  return (
    <ActionFeedback
      type="success"
      title={`Door ${doorNumber} complete: ${doorTitle}`}
      message="Your reflection has been saved and this door is now marked as complete."
      actions={actions}
      onClose={onClose}
    >
      {nextDoorNumber && nextDoorTitle && (
        <div className="mt-2 p-3 bg-white rounded border border-[#d4a574]/30">
          <p className="text-xs font-medium text-[#8fa878] mb-1">Next: Door {nextDoorNumber}</p>
          <p className="text-sm font-semibold text-[#2a2318]">{nextDoorTitle}</p>
        </div>
      )}
    </ActionFeedback>
  );
}
