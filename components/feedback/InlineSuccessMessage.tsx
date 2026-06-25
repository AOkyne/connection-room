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
    <div className="bg-[#f0f8f4] border-l-4 border-[#8fa878] p-4 rounded-lg flex items-start justify-between gap-4">
      <div className="space-y-1 flex-1">
        <p className="text-sm font-semibold text-[#8fa878]">{title}</p>
        {message && <p className="text-sm text-[#6b5f52]">{message}</p>}
        {children && <div className="text-sm text-[#6b5f52]">{children}</div>}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[#a0968a] hover:text-[#6b5f52] transition-colors flex-shrink-0 mt-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
