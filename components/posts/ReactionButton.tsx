"use client";

interface ReactionButtonProps {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ReactionButton({
  label,
  count,
  isSelected,
  onClick,
  disabled = false,
}: ReactionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={`${label}${count > 0 ? `, ${count} reactions` : ""}${isSelected ? ", selected" : ""}`}
      className={`px-3 py-2 text-sm font-medium rounded-full transition-all ${
        isSelected
          ? "bg-[#d4a574] text-white border border-[#c09560] shadow-sm"
          : "border border-[#e8ddd2] text-[#6b5f52] hover:border-[#d4a574] hover:bg-[#f8f6f2]"
      } disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
    >
      {label}
      {count > 0 && <span className="ml-1">({count})</span>}
    </button>
  );
}
