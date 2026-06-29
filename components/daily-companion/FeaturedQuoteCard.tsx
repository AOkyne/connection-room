"use client";

import { DailyContent } from "@/lib/data/daily-companion";

interface FeaturedQuoteCardProps {
  quote: DailyContent | null;
}

export function FeaturedQuoteCard({ quote }: FeaturedQuoteCardProps) {
  if (!quote || !quote.body) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: "#2a2318",
      padding: "32px 24px",
      borderRadius: "16px",
      marginTop: "24px"
    }}>
      <p style={{
        fontSize: "20px",
        fontStyle: "italic",
        color: "#ffffff",
        lineHeight: "1.6",
        margin: "0 0 16px 0"
      }}>
        "{quote.body}"
      </p>
      <p style={{
        fontSize: "14px",
        color: "#d4a574",
        margin: "0",
        fontWeight: "500"
      }}>
        — Trevor James
      </p>
    </div>
  );
}
