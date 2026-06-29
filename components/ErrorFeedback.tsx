"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface ErrorFeedbackProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLoading?: boolean;
}

export function ErrorFeedback({
  title = "Something went wrong",
  message,
  onRetry,
  onDismiss,
  retryLoading = false,
}: ErrorFeedbackProps) {
  return (
    <Card className="bg-red-50 border-l-4 border-[#d97706]">
      <div className="flex gap-4">
        <div className="text-2xl flex-shrink-0">✕</div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#d97706] mb-1">{title}</h3>
          <p className="text-sm text-[#1a0f0a] mb-4">{message}</p>
          <div className="flex gap-2">
            {onRetry && (
              <Button
                variant="primary"
                size="sm"
                onClick={onRetry}
                disabled={retryLoading}
              >
                {retryLoading ? "Retrying..." : "Try Again"}
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
