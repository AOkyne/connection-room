"use client";

import { useEffect } from "react";
import { Card } from "@/components/Card";

export default function QuizzesPage() {
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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-[#2a2318]">Take A Quiz</h1>
        <p className="text-lg text-[#6b5f52]">
          Discover insights about yourself and get personalized recommendations
        </p>
      </div>

      <div className="space-y-8">
        {/* What's Your Intimacy Pattern? */}
        <Card>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#2a2318]">What's Your Intimacy Pattern?</h2>
            <p className="text-[#6b5f52]">
              Discover your attachment style and how it shows up in your intimate relationships.
            </p>
            <div
              data-sa-url="https://48e501b8-107c-4da7-a99d-658eea336303.scoreapp.com/?sa_target=_top"
              data-sa-view="inline"
              style={{ maxWidth: "100%", width: "100%" }}
              data-sa-auto-height="1"
            />
          </div>
        </Card>

        {/* The Erotic Relationship Evaluator */}
        <Card>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#2a2318]">The Erotic Relationship Evaluator</h2>
            <p className="text-[#6b5f52]">
              Explore the erotic dimension of your relationship and identify areas for deeper connection.
            </p>
            <div
              data-sa-url="https://be5f288c-8c1d-4a16-b7f1-0397ad441ba3.scoreapp.com/?sa_target=_top"
              data-sa-view="inline"
              style={{ maxWidth: "100%", width: "100%" }}
              data-sa-auto-height="1"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
