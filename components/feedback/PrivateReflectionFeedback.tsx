"use client";

import { ActionFeedback, FeedbackAction } from "./ActionFeedback";

interface PrivateReflectionFeedbackProps {
  savedAt?: Date;
  onClose?: () => void;
}

export function PrivateReflectionFeedback({
  savedAt,
  onClose,
}: PrivateReflectionFeedbackProps) {
  const actions: FeedbackAction[] = [
    {
      label: "View My Journey",
      href: "/app/journey",
      variant: "primary",
    },
    {
      label: "Continue",
      onClick: onClose,
      variant: "secondary",
    },
  ];

  const timeString = savedAt ? new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(savedAt) : "just now";

  return (
    <ActionFeedback
      type="success"
      title="Your reflection has been saved privately"
      message={`Saved at ${timeString}. Only you can see this in My Journey.`}
      actions={actions}
      onClose={onClose}
    />
  );
}
