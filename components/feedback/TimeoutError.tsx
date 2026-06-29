"use client";

import { Button } from "@/components/Button";

interface TimeoutErrorProps {
  onRetry: () => void;
  isRetrying?: boolean;
  onGoHome?: () => void;
}

export function TimeoutError({
  onRetry,
  isRetrying = false,
  onGoHome,
}: TimeoutErrorProps) {
  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">⏱️</div>
          <h1 className="text-2xl font-medium text-[#1a0f0a]">
            This is taking longer than expected
          </h1>
          <p className="text-[#1a0f0a] leading-relaxed">
            The page did not finish loading. Try refreshing, or return home to explore other parts of The Connection Room.
          </p>
        </div>

        <div className="flex gap-3 flex-col">
          <Button
            variant="primary"
            size="lg"
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full"
          >
            {isRetrying ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Loading...</span>
              </div>
            ) : (
              "Try Again"
            )}
          </Button>

          {onGoHome && (
            <Button
              variant="ghost"
              size="lg"
              onClick={onGoHome}
              className="w-full"
            >
              Return Home
            </Button>
          )}
        </div>

        <p className="text-xs text-[#a0704a] text-center">
          If you keep seeing this, try signing in again.
        </p>
      </div>
    </div>
  );
}
