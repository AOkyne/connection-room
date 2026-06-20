"use client";

import { Month } from "@/lib/types/guided-rhythm";
import { Card } from "@/components/Card";

interface MonthlyThemeCardProps {
  month: Month;
  onSelectRitualOption?: (option: string) => void;
}

export function MonthlyThemeCard({ month, onSelectRitualOption }: MonthlyThemeCardProps) {
  return (
    <Card className="bg-gradient-to-br from-[#f3ede5] to-[#f8f6f2] border-l-4 border-[#d4a574]">
      <div className="space-y-4">
        {/* Month Number and Title */}
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-light text-[#d4a574]">
            {String(month.monthNumber).padStart(2, "0")}
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-[#2a2318]">
              {month.title}
            </h2>
            <p className="text-xs text-[#8fa878] font-medium uppercase tracking-wide mt-1">
              This Month's Rhythm
            </p>
          </div>
        </div>

        {/* Monthly Theme */}
        <div className="pt-4 border-t border-[#e8ddd2]">
          <p className="text-[#6b5f52] leading-relaxed">{month.monthlyTheme}</p>
        </div>

        {/* Trevor Note */}
        <div className="bg-white rounded-lg p-4 border border-[#e8ddd2]">
          <div className="flex items-start gap-3 mb-3">
            <img
              src="/trevor-photo.png"
              alt="Trevor James"
              className="w-16 h-16 rounded-full flex-shrink-0 object-cover"
              style={{ objectPosition: "center 20%" }}
            />
            <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
              A Note from Trevor
            </p>
          </div>
          <p className="text-sm text-[#6b5f52] leading-relaxed italic">
            {month.trevorNote}
          </p>
        </div>

        {/* Monthly Reflection */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide">
            This Month's Reflection
          </p>
          <p className="text-sm text-[#6b5f52] leading-relaxed">
            {month.monthlyReflection}
          </p>
        </div>

        {/* Ritual */}
        {month.ritual && (
          <div className="bg-[#f8f6f2] rounded-lg p-4">
            <p className="text-sm font-medium text-[#2a2318] mb-2">
              {month.ritual.title}
            </p>
            <p className="text-xs text-[#6b5f52] mb-3">{month.ritual.description}</p>
            {month.ritual.options && month.ritual.options.length > 0 && (
              <div className="space-y-2">
                {month.ritual.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectRitualOption?.(option)}
                    className="w-full text-left px-3 py-2 text-xs text-[#6b5f52] rounded-lg border border-[#d4a574] hover:bg-[#f3ede5] transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
