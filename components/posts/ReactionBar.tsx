"use client";

import { useState, useRef, useEffect } from "react";
import { getPrimaryReactions, getMoreReactions } from "@/lib/content/reactions";
import { ReactionButton } from "./ReactionButton";

interface ReactionBarProps {
  reactions: Record<string, number>;
  userReaction?: string;
  onReact: (reactionKey: string) => void;
  disabled?: boolean;
}

export function ReactionBar({
  reactions,
  userReaction,
  onReact,
  disabled = false,
}: ReactionBarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const primaryReactions = getPrimaryReactions();
  const moreReactions = getMoreReactions();

  // Check if user's selected reaction is from the "More" menu
  const userReactionFromMore = userReaction && moreReactions.some(r => r.id === userReaction);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    }

    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreMenu]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setShowMoreMenu(false);
    }
  };

  const handleReactionClick = (reactionKey: string) => {
    onReact(reactionKey);
    setShowMoreMenu(false);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Primary Reactions */}
      {primaryReactions.map((reaction) => {
        const count = reactions[reaction.id] || 0;
        const isSelected = userReaction === reaction.id;
        return (
          <ReactionButton
            key={reaction.id}
            label={reaction.label}
            count={count}
            isSelected={isSelected}
            onClick={() => handleReactionClick(reaction.id)}
            disabled={disabled}
          />
        );
      })}

      {/* User's selected "More" reaction (if any) */}
      {userReactionFromMore && (
        <>
          {moreReactions.map((reaction) => {
            if (reaction.id === userReaction) {
              const count = reactions[reaction.id] || 0;
              return (
                <ReactionButton
                  key={reaction.id}
                  label={reaction.label}
                  count={count}
                  isSelected={true}
                  onClick={() => handleReactionClick(reaction.id)}
                  disabled={disabled}
                />
              );
            }
            return null;
          })}
        </>
      )}

      {/* More Button */}
      <div className="relative">
        <button
          ref={moreButtonRef}
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="More reactions"
          aria-expanded={showMoreMenu}
          aria-haspopup="menu"
          className="px-3 py-2 text-sm font-medium rounded-full border border-[#e8ddd2] text-[#1a0f0a] hover:border-[#d4a348] hover:bg-[#f8f6f2] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          More
        </button>

        {/* More Reactions Menu */}
        {showMoreMenu && (
          <div
            ref={moreMenuRef}
            className="absolute top-full right-0 mt-1 bg-white rounded-lg border border-[#e8ddd2] shadow-md z-10 min-w-max"
            role="menu"
          >
            <div className="p-2 space-y-1">
              {moreReactions.map((reaction) => {
                const count = reactions[reaction.id] || 0;
                const isSelected = userReaction === reaction.id;
                return (
                  <button
                    key={reaction.id}
                    onClick={() => handleReactionClick(reaction.id)}
                    onKeyDown={handleKeyDown}
                    role="menuitem"
                    className={`block text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[#d4a348] text-white"
                        : "text-[#1a0f0a] hover:bg-[#f3ede5]"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className="font-medium">{reaction.label}</span>
                    {count > 0 && (
                      <span className="text-xs ml-2 opacity-75">
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
