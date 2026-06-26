"use client";

import { Button } from "@/components/Button";

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: "inline" | "banner";
}

export function InlineError({
  message,
  onRetry,
  onDismiss,
  variant = "inline",
}: InlineErrorProps) {
  if (variant === "banner") {
    return (
      <div className="w-full bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{message}</p>
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-600 hover:text-red-700 underline"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-400 hover:text-red-500"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
      <p className="text-sm text-red-700 mb-3">{message}</p>
      {(onRetry || onDismiss) && (
        <div className="flex gap-2">
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="text-red-600 hover:text-red-700"
            >
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-red-600 hover:text-red-700"
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
