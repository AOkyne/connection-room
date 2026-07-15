/**
 * CompletionAcknowledgment
 *
 * Gentle, non-gamified acknowledgment shown after meaningful daily actions.
 * Appears after user saves a reflection, completes a practice, or engages with daily content.
 *
 * Includes optional next-step suggestions without pressure or urgency.
 * Uses warm, affirming language aligned with The Connection Room brand.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import Link from "next/link";

export type CompletionType =
  | "reflection"
  | "practice"
  | "checkin"
  | "daily_complete";

interface CompletionAcknowledgmentProps {
  type: CompletionType;
  onClose?: () => void;
  autoClose?: number; // ms until auto-close (0 = no auto-close)
}

const messages: Record<CompletionType, { primary: string; secondary: string }> = {
  reflection: {
    primary: "You've made a little room for yourself today.",
    secondary: "Your reflection is saved.",
  },
  practice: {
    primary: "You took a moment to arrive.",
    secondary: "That is enough for today.",
  },
  checkin: {
    primary: "You felt into your body.",
    secondary: "That noticing matters.",
  },
  daily_complete: {
    primary: "You showed up for yourself.",
    secondary: "The room is grateful you're here.",
  },
};

const nextSteps: Record<
  CompletionType,
  Array<{ label: string; href: string; hint: string }>
> = {
  reflection: [
    {
      label: "Share in a space",
      href: "/app/spaces",
      hint: "Continue the conversation with the community",
    },
    {
      label: "Explore your journey",
      href: "/app/journey",
      hint: "See how far you've come",
    },
  ],
  practice: [
    {
      label: "Read this week's note",
      href: "/app",
      hint: "Guidance from Trevor",
    },
    {
      label: "Connect with someone",
      href: "/app/connections",
      hint: "Bring the practice into connection",
    },
  ],
  checkin: [
    {
      label: "Continue your practice",
      href: "/app",
      hint: "The embodiment journey continues",
    },
  ],
  daily_complete: [
    {
      label: "Explore spaces",
      href: "/app/spaces",
      hint: "Find your people",
    },
    {
      label: "Read an article",
      href: "/app/articles",
      hint: "Deepen your understanding",
    },
  ],
};

export function CompletionAcknowledgment({
  type,
  onClose,
  autoClose = 5000,
}: CompletionAcknowledgmentProps) {
  const [visible, setVisible] = useState(true);
  const message = messages[type];
  const suggestions = nextSteps[type];

  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 right-8 max-w-sm z-40 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-lg border border-[#e8ddd2] overflow-hidden">
        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-[#1a0f0a]">
              {message.primary}
            </p>
            <p className="text-sm text-[#a0704a]">{message.secondary}</p>
          </div>

          {/* Optional Next Steps */}
          {suggestions.length > 0 && (
            <div className="pt-2 space-y-2 border-t border-[#f3ede5]">
              <p className="text-xs text-[#a0704a] font-medium uppercase tracking-wide">
                If you'd like to continue:
              </p>
              <div className="space-y-2">
                {suggestions.map((step) => (
                  <Link key={step.href} href={step.href}>
                    <button
                      onClick={() => setVisible(false)}
                      className="w-full text-left p-3 rounded-md hover:bg-[#f8f6f2] transition-colors group"
                    >
                      <p className="text-sm font-medium text-[#1a0f0a] group-hover:text-[#c97a2a]">
                        {step.label}
                      </p>
                      <p className="text-xs text-[#a0704a]">{step.hint}</p>
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="absolute top-3 right-3 text-[#a0704a] hover:text-[#1a0f0a] transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// CSS for animation (add to your global styles if not present)
const animationCSS = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;
