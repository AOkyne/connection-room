"use client";

import { ActionFeedback, FeedbackAction } from "./ActionFeedback";

interface ProfileSavedFeedbackProps {
  onClose?: () => void;
}

export function ProfileSavedFeedback({
  onClose,
}: ProfileSavedFeedbackProps) {
  const actions: FeedbackAction[] = [
    {
      label: "View My Profile",
      href: "/app/profile",
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
      title="Profile updated"
      message="Your changes are now visible according to your privacy settings."
      actions={actions}
      onClose={onClose}
    />
  );
}
