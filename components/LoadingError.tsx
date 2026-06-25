"use client";

import { Button } from "@/components/Button";

interface LoadingErrorProps {
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function LoadingError({
  message = "This is taking longer than expected",
  onRetry,
  showRetry = true,
}: LoadingErrorProps) {
  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <div className="flex justify-center mb-4">
            <div className="text-5xl">⚠️</div>
          </div>
          <h2 className="text-2xl text-[#2a2318] font-semibold">{message}</h2>
          <p className="text-base text-[#6b5f52]">
            The page did not finish loading. This might be a temporary connection issue.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="primary" size="md" className="w-full">
              Try Again
            </Button>
          )}
          <Button
            onClick={() => (window.location.href = "/app")}
            variant="outline"
            size="md"
            className="w-full"
          >
            Return Home
          </Button>
        </div>

        <p className="text-xs text-[#a0968a] pt-4">
          If this keeps happening, try refreshing the page or clearing your browser cache.
        </p>
      </div>
    </div>
  );
}
