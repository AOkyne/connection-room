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
          ? "bg-[#c9956f] text-white border-2 border-[#b0804d] shadow-md hover:shadow-lg"
          : "border border-[#ede6e0] text-[#6b5f52] hover:border-[#d4a574] hover:bg-[#f9f7f4] hover:shadow-sm"
      } disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
    >
      {label}
      {count > 0 && <span className="ml-1">({count})</span>}
    </button>
  );
}
