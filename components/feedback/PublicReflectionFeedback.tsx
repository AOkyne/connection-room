"use client";

import { ActionFeedback, FeedbackAction } from "./ActionFeedback";

interface PublicReflectionFeedbackProps {
  spaceId: string;
  postId?: string;
  onClose?: () => void;
}

export function PublicReflectionFeedback({
  spaceId,
  postId,
  onClose,
}: PublicReflectionFeedbackProps) {
  const actions: FeedbackAction[] = [];

  if (postId) {
    actions.push({
      label: "View Your Post",
      href: `#post-${postId}`,
      variant: "primary",
    });
  }

  actions.push({
    label: "Read Other Reflections",
    href: `/app/spaces/${spaceId}`,
    variant: "secondary",
  });

  actions.push({
    label: "Return Home",
    href: "/app",
    variant: "secondary",
  });

  return (
    <ActionFeedback
      type="success"
      title="Your reflection has been shared"
      message="It's now visible in this space for other members to witness."
      actions={actions}
      onClose={onClose}
    />
  );
}
