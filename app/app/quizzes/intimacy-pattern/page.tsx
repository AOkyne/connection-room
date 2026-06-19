"use client";

import { useEffect } from "react";
import { Card } from "@/components/Card";
import Link from "next/link";
import { Button } from "@/components/Button";

export default function IntimacyPatternQuizPage() {
  useEffect(() => {
    // Load ScoreApp embedding script
    const script = document.createElement("script");
    script.src = "https://static.scoreapp.com/js/integration/v1/embedding.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/app/quizzes">
          <Button variant="outline" size="sm">
            ← Back to Quizzes
          </Button>
        </Link>
        <h1 className="text-4xl font-bold text-[#2a2318] mt-4">What's Your Intimacy Pattern?</h1>
        <p className="text-lg text-[#6b5f52]">
          Discover your attachment style and how it shows up in your intimate relationships.
        </p>
      </div>

      <Card>
        <div
          data-sa-url="https://48e501b8-107c-4da7-a99d-658eea336303.scoreapp.com/?sa_target=_top"
          data-sa-view="inline"
          style={{ maxWidth: "100%", width: "100%" }}
          data-sa-auto-height="1"
        />
      </Card>
    </div>
  );
}
