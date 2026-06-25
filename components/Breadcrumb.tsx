"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isActive = item.isActive ?? isLast;

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-[#d4a574] text-xs">/</span>
            )}
            {item.href && !isActive ? (
              <Link
                href={item.href}
                className="text-[#d4a574] hover:text-[#c09560] underline transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isActive ? "text-[#2a2318] font-medium" : "text-[#6b5f52]"}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
