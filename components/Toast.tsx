"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    success: "bg-[#8fa878]",
    error: "bg-[#d97706]",
    warning: "bg-[#d4a574]",
    info: "bg-[#6b5f52]",
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm z-50 animate-in fade-in slide-in-from-bottom`}>
      {message}
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
