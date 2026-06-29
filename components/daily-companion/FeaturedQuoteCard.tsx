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
      backgroundColor: "#1a0f0a",
      padding: "48px 40px",
      borderRadius: "16px",
      marginTop: "24px"
    }}>
      <p style={{
        fontSize: "28px",
        fontFamily: "Georgia, serif",
        fontStyle: "italic",
        color: "#ffffff",
        lineHeight: "1.7",
        margin: "0 0 24px 0",
        fontWeight: "400"
      }}>
        "{quote.body}"
      </p>
      <p style={{
        fontSize: "16px",
        color: "#d4a348",
        margin: "0",
        fontWeight: "500",
        letterSpacing: "0.5px"
      }}>
        — Trevor James
      </p>
    </div>
  );
}
