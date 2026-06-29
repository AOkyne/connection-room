"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export interface FeedbackAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

interface ActionFeedbackProps {
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  actions?: FeedbackAction[];
  children?: ReactNode;
  onClose?: () => void;
}

export function ActionFeedback({
  type,
  title,
  message,
  actions,
  children,
  onClose,
}: ActionFeedbackProps) {
  const bgColor = {
    success: "bg-[#f0f8f4] border-l-4 border-[#c97a2a]",
    error: "bg-[#fef0f0] border-l-4 border-[#d97706]",
    info: "bg-[#f3ede5] border-l-4 border-[#d4a348]",
  }[type];

  const titleColor = {
    success: "text-[#c97a2a]",
    error: "text-[#d97706]",
    info: "text-[#d4a348]",
  }[type];

  return (
    <Card className={`${bgColor} p-6`}>
      <div className="space-y-4">
        {/* Title */}
        <h3 className={`text-lg font-semibold ${titleColor}`}>{title}</h3>

        {/* Message */}
        {message && <p className="text-[#1a0f0a] text-sm">{message}</p>}

        {/* Custom content */}
        {children && <div className="text-[#1a0f0a] text-sm">{children}</div>}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {actions.map((action, index) => (
              <div key={index}>
                {action.href ? (
                  <Link href={action.href}>
                    <Button
                      variant={action.variant === "secondary" ? "outline" : "primary"}
                      size="sm"
                    >
                      {action.label}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant={action.variant === "secondary" ? "outline" : "primary"}
                    size="sm"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Close button if no actions */}
        {onClose && (!actions || actions.length === 0) && (
          <button
            onClick={onClose}
            className="text-sm text-[#a0704a] hover:text-[#1a0f0a] transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </Card>
  );
}
