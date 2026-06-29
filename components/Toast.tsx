"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Toast({ message, type = "info", duration = 3000, onClose, action }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const styles = {
    success: { bg: "bg-[#c97a2a]", icon: "✓" },
    error: { bg: "bg-[#d97706]", icon: "✕" },
    warning: { bg: "bg-[#d4a348]", icon: "⚠" },
    info: { bg: "bg-[#1a0f0a]", icon: "ℹ" },
  }[type];

  return (
    <div className={`${styles.bg} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm z-50 animate-in fade-in slide-in-from-bottom flex items-start gap-3`}>
      <span className="text-lg font-bold flex-shrink-0 mt-0.5">{styles.icon}</span>
      <div className="flex-1">
        <p className="text-sm">{message}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {action && (
          <button
            onClick={() => {
              action.onClick();
              setIsVisible(false);
              onClose?.();
            }}
            className="text-xs font-medium px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="text-lg leading-none hover:opacity-75 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastProps[];
  onRemove: (index: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none z-50">
      {toasts.map((toast, index) => (
        <div
          key={index}
          className="pointer-events-auto"
          onAnimationEnd={() => {
            // Remove after animation completes
            setTimeout(() => onRemove(index), 100);
          }}
        >
          <Toast {...toast} onClose={() => onRemove(index)} />
        </div>
      ))}
    </div>
  );
}
