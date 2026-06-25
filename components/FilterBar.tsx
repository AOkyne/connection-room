"use client";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  selectedFilter?: string;
  onFilterChange: (filterId: string) => void;
  showAll?: boolean;
}

export function FilterBar({
  filters,
  selectedFilter,
  onFilterChange,
  showAll = true,
}: FilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {showAll && (
        <button
          onClick={() => onFilterChange("")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !selectedFilter
              ? "bg-[#d4a574] text-white"
              : "bg-[#f3ede5] text-[#6b5f52] hover:bg-[#e8ddd2]"
          }`}
        >
          All
        </button>
      )}
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedFilter === filter.id
              ? "bg-[#d4a574] text-white"
              : "bg-[#f3ede5] text-[#6b5f52] hover:bg-[#e8ddd2]"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
