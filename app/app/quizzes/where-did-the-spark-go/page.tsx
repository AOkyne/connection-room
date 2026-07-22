"use client";

import { useEffect } from "react";
import { Card } from "@/components/Card";
import Link from "next/link";
import { Button } from "@/components/Button";

export default function WhereDidTheSparkGoQuizPage() {
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
        <h1 className="text-4xl font-bold text-[#1a0f0a] mt-4">Where Did The Spark Go?</h1>
        <p className="text-lg text-[#1a0f0a]">
          Explore what's changed in your relationship's passion and connection over time.
        </p>
      </div>

      <Card>
        <div
          data-sa-url="https://ayite-sf9dj2lb.scoreapp.com/?sa_target=_top"
          data-sa-view="inline"
          style={{ maxWidth: "100%", width: "100%" }}
          data-sa-auto-height="1"
        />
      </Card>
    </div>
  );
}
