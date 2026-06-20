"use client";

import { Month } from "@/lib/types/guided-rhythm";
import { Card } from "@/components/Card";

interface MonthlyThemeCardProps {
  month: Month;
}

export function MonthlyThemeCard({ month }: MonthlyThemeCardProps) {
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
          <p className="text-xs font-medium text-[#8fa878] uppercase tracking-wide mb-2">
            A Note from Trevor
          </p>
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
              <ul className="space-y-1">
                {month.ritual.options.map((option, idx) => (
                  <li key={idx} className="text-xs text-[#6b5f52] flex items-start gap-2">
                    <span className="text-[#d4a574] mt-1">•</span>
                    <span>{option}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
