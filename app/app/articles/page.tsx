"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getArticles, type Article } from "@/lib/data/articles";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Breadcrumb } from "@/components/Breadcrumb";
import Link from "next/link";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const data = await getArticles();
        setArticles(data);
      } catch (error) {
        console.error("Error loading articles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, []);

  if (loading) {
    return <div className="p-4">Loading articles...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/app" },
          { label: "Articles", isActive: true },
        ]}
      />

      {/* Hero Image */}
      <div className="relative w-full h-64 -mx-6 -mt-6 mb-8 overflow-hidden rounded-lg">
        <Image
          src="/imagery/articles-hero.png"
          alt="Articles"
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      <div>
        <h1 className="text-4xl font-bold text-[#1a0f0a]">Articles</h1>
        <p className="text-lg text-[#1a0f0a] mt-2">
          Read my latest thoughts and reflections
        </p>
      </div>

      {articles.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-[#a0704a] mb-4">No articles yet</p>
            <Link href="/app">
              <Button variant="secondary">Back to Home</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#c97a2a] mb-2">
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <h2 className="text-2xl font-bold text-[#1a0f0a] mb-3">
                    {article.title}
                  </h2>
                  <p className="text-[#1a0f0a] text-base leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button variant="primary" size="sm">
                    Read Full Article →
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
