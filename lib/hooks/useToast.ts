import { useState, useCallback } from "react";

interface ToastMessage {
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning" = "info", duration = 3000) => {
      const id = Date.now().toString();
      const toast: ToastMessage = { message, type, duration, id };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const removeToast = (index: number) => {
    setToasts((prev) => prev.slice(0, index).concat(prev.slice(index + 1)));
  };

  return { toasts, showToast, removeToast };
}
