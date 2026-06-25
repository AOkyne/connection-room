"use client";

import { ActionFeedback, FeedbackAction } from "./ActionFeedback";

interface EventRSVPFeedbackProps {
  eventName: string;
  eventDate?: string;
  onClose?: () => void;
}

export function EventRSVPFeedback({
  eventName,
  eventDate,
  onClose,
}: EventRSVPFeedbackProps) {
  const actions: FeedbackAction[] = [
    {
      label: "Add to Calendar",
      href: "#", // This would be a real ICS generation link in full implementation
      variant: "primary",
    },
    {
      label: "View My Events",
      href: "/app/events",
      variant: "secondary",
    },
  ];

  return (
    <ActionFeedback
      type="success"
      title={`You're registered for ${eventName}`}
      message={eventDate ? `This event is on ${eventDate}` : "Your registration has been confirmed."}
      actions={actions}
      onClose={onClose}
    />
  );
}
