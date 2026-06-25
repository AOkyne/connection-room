"use client";

import { ActionFeedback, FeedbackAction } from "./ActionFeedback";

interface SpaceJoinedFeedbackProps {
  spaceName: string;
  spaceId: string;
  onClose?: () => void;
}

export function SpaceJoinedFeedback({
  spaceName,
  spaceId,
  onClose,
}: SpaceJoinedFeedbackProps) {
  const actions: FeedbackAction[] = [
    {
      label: "Enter the Space",
      href: `/app/spaces/${spaceId}`,
      variant: "primary",
    },
    {
      label: "Meet the Members",
      href: `/app/spaces/${spaceId}/members`,
      variant: "secondary",
    },
  ];

  return (
    <ActionFeedback
      type="success"
      title={`You joined ${spaceName}`}
      message="You can now see posts and participate in conversations here."
      actions={actions}
      onClose={onClose}
    />
  );
}
