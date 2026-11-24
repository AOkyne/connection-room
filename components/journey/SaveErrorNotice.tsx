"use client";

// Shown when a private reflection or journey step couldn't be saved to the
// member's account, so nothing appears "saved" when it wasn't.
export function SaveErrorNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#e5b4a8] bg-[#fbeeea] px-4 py-3 text-sm text-[#7a2e1f]">
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} aria-label="Close" className="text-lg leading-none">
        ×
      </button>
    </div>
  );
}

export const SAVE_ERROR_TEXT =
  "That didn’t save. Please check your connection and try again. Your writing is still in the box.";
