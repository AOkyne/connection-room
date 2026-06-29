"use client";

interface PostAnalyticsProps {
  commentCount?: number;
  reactions?: Record<string, number>;
  createdAt: string;
  compact?: boolean;
}

export function PostAnalytics({
  commentCount = 0,
  reactions = {},
  createdAt,
  compact = false,
}: PostAnalyticsProps) {
  // Calculate engagement metrics
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  const mostReactedEmoji = Object.entries(reactions).sort(([, a], [, b]) => b - a)[0];

  // Format time posted
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="flex gap-3 text-xs text-[#a0704a]">
        {totalReactions > 0 && (
          <span className="flex items-center gap-1">
            {mostReactedEmoji ? mostReactedEmoji[0] : "👍"}{" "}
            {totalReactions > 1 ? `+${totalReactions - 1}` : ""}
          </span>
        )}
        {commentCount > 0 && (
          <span className="flex items-center gap-1">
            💬 {commentCount}
          </span>
        )}
        <span>{formatTimeAgo(createdAt)}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 text-sm text-[#1a0f0a] py-2 border-t border-[#e8ddd2] mt-2">
      {/* Engagement Stats */}
      <div className="flex items-center gap-2">
        <span className="text-lg">💬</span>
        <div>
          <p className="font-medium text-[#1a0f0a]">{commentCount}</p>
          <p className="text-xs text-[#a0704a]">
            {commentCount === 1 ? "comment" : "comments"}
          </p>
        </div>
      </div>

      {totalReactions > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-lg">{mostReactedEmoji?.[0] || "👍"}</span>
          <div>
            <p className="font-medium text-[#1a0f0a]">{totalReactions}</p>
            <p className="text-xs text-[#a0704a]">
              {totalReactions === 1 ? "reaction" : "reactions"}
            </p>
          </div>
        </div>
      )}

      {/* Time Posted */}
      <div className="ml-auto text-right">
        <p className="text-xs text-[#a0704a]">Posted</p>
        <p className="font-medium text-[#1a0f0a]">{formatTimeAgo(createdAt)}</p>
      </div>
    </div>
  );
}
