"use client";

import { ActionFeedback, FeedbackAction } from "./ActionFeedback";

interface ConnectionInterestFeedbackProps {
  onClose?: () => void;
}

export function ConnectionInterestFeedback({
  onClose,
}: ConnectionInterestFeedbackProps) {
  const actions: FeedbackAction[] = [
    {
      label: "View My Connection Preferences",
      href: "/app/connections",
      variant: "primary",
    },
    {
      label: "Continue",
      onClick: onClose,
      variant: "secondary",
    },
  ];

  return (
    <ActionFeedback
      type="success"
      title="Connection interest saved"
      message="This helps future Connections feel more relevant. It does not contact another member."
      actions={actions}
      onClose={onClose}
    />
  );
}
