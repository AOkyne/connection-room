"use client";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { IconIntimacy, IconHeart } from "@/components/Icons";
import Link from "next/link";

export default function QuizzesPage() {
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-[#2a2318]">Take A Quiz</h1>
        <p className="text-lg text-[#6b5f52]">
          Discover insights about yourself and get personalized recommendations
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {quizzes.map((quiz) => {
          const IconComponent = quiz.icon;
          return (
            <Link key={quiz.id} href={quiz.href}>
              <Card className="h-full hover:border-[#d4a574] hover:shadow-md transition-all cursor-pointer">
                <div className="space-y-4">
                  <IconComponent size={40} className="text-[#d4a574]" />
                  <div>
                    <h2 className="text-2xl font-bold text-[#2a2318]">{quiz.title}</h2>
                    <p className="text-[#6b5f52] mt-2">{quiz.description}</p>
                  </div>
                  <Button variant="primary" size="sm" className="">
                    Take Quiz →
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
