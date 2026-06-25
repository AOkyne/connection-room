"use client";

import { Card } from "@/components/Card";

interface LoadingStateFeedbackProps {
  message?: string;
  subMessage?: string;
}

export function LoadingStateFeedback({
  message = "Loading...",
  subMessage = "Please wait while we fetch your data",
}: LoadingStateFeedbackProps) {
  return (
    <Card className="bg-[#f8f6f2] border-l-4 border-[#d4a574]">
      <div className="flex gap-4 items-start">
        <div className="text-2xl flex-shrink-0 animate-spin">⟳</div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#2a2318] mb-1">{message}</h3>
          <p className="text-sm text-[#6b5f52]">{subMessage}</p>
        </div>
      </div>
    </Card>
  );
}
