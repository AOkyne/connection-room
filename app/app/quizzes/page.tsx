"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconIntimacy, IconHeart } from "@/components/Icons";
import { getProfile, type Profile } from "@/lib/data/profiles";
import Link from "next/link";

export default function QuizzesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const p = await getProfile();
      setProfile(p);
      setMounted(true);
    };
    loadProfile();
  }, []);

  const quizzes = [
    {
      id: "intimacy-pattern",
      title: "What's Your Intimacy Pattern?",
      description: "Discover your attachment style and how it shows up in your intimate relationships.",
      href: "/app/quizzes/intimacy-pattern",
      icon: IconIntimacy,
    },
    {
      id: "erotic-relationship",
      title: "The Erotic Relationship Evaluator",
      description: "Explore the erotic dimension of your relationship and identify areas for deeper connection.",
      href: "/app/quizzes/erotic-relationship",
      icon: IconHeart,
    },
  ];

  const hasQuizResult = profile?.quizResult && profile.quizResult !== "I have not taken the quiz yet";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href="/app/journey">
          <Button variant="outline" size="sm">
            ← Back
          </Button>
        </Link>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[#1a0f0a]">Take A Quiz</h1>
          <p className="text-lg text-[#1a0f0a]">
            Discover insights about yourself and get personalized recommendations
          </p>
        </div>
      </div>

      {/* Show current result if available */}
      {mounted && hasQuizResult && (
        <Card className="bg-gradient-to-br from-[#f3ede5] to-[#fffbf7] border-[#d4a348]">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#1a0f0a]">Your Connection Profile</h3>
            <p className="text-base font-medium text-[#d4a348]">{profile?.quizResult}</p>
            <p className="text-sm text-[#1a0f0a] leading-relaxed">
              This insight reveals how you tend to connect with others. Use it to understand your patterns and explore ways to deepen your relationships.
            </p>
            <Link href="/app/journey">
              <Button variant="outline" size="sm">
                View Full Profile →
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {quizzes.map((quiz) => {
          const IconComponent = quiz.icon;
          const isCompleted = hasQuizResult; // Simple check - in real app, track per quiz

          return (
            <Link key={quiz.id} href={quiz.href}>
              <Card
                className={`h-full transition-all ${
                  isCompleted
                    ? "border-[#c97a2a] hover:border-[#c97a2a] hover:shadow-md"
                    : "hover:border-[#d4a348] hover:shadow-md"
                } cursor-pointer`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <IconComponent size={40} className={isCompleted ? "text-[#c97a2a]" : "text-[#d4a348]"} />
                    {isCompleted && (
                      <span className="text-xs font-medium text-[#c97a2a] px-2 py-1 bg-[#c97a2a]/10 rounded">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#1a0f0a]">{quiz.title}</h2>
                    <p className="text-[#1a0f0a] mt-2">{quiz.description}</p>
                  </div>
                  <Button variant={isCompleted ? "outline" : "primary"} size="sm" className="">
                    {isCompleted ? "Retake Quiz →" : "Take Quiz →"}
                  </Button>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
