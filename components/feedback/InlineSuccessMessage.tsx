"use client";

import { ReactNode } from "react";

interface InlineSuccessMessageProps {
  title: string;
  message?: string;
  children?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function InlineSuccessMessage({
  title,
  message,
  children,
  dismissible = true,
  onDismiss,
}: InlineSuccessMessageProps) {
  return (
    <div className="bg-[#f0f8f4] border-l-4 border-[#c97a2a] p-4 rounded-lg flex items-start justify-between gap-4">
      <div className="space-y-1 flex-1">
        <p className="text-sm font-semibold text-[#c97a2a]">{title}</p>
        {message && <p className="text-sm text-[#1a0f0a]">{message}</p>}
        {children && <div className="text-sm text-[#1a0f0a]">{children}</div>}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[#a0704a] hover:text-[#1a0f0a] transition-colors flex-shrink-0 mt-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
