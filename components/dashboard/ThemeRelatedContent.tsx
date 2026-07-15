/**
 * ThemeRelatedContent Component
 *
 * Displays community content (posts, spaces, events, articles) related to today's theme.
 * Shows "Explore conversations about [theme]" in the Explore section of the dashboard.
 *
 * Props:
 * - themeName: The daily theme (e.g., "boundaries", "vulnerability")
 * - themeTitle: Human-readable theme title
 * - loading: Whether content is still loading
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  getThemeRelatedPosts,
  getThemeRelatedSpaces,
  getThemeRelatedEvents,
  getThemeRelatedArticles,
} from "@/lib/data/theme-connections";
import type { Post } from "@/lib/data/posts";
import type { Article } from "@/lib/data/articles";

interface ThemeRelatedContentProps {
  themeName: string;
  themeTitle?: string;
  loading?: boolean;
}

export function ThemeRelatedContent({
  themeName,
  themeTitle = themeName,
  loading = false,
}: ThemeRelatedContentProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [p, s, e, a] = await Promise.all([
          getThemeRelatedPosts(themeName, 3),
          getThemeRelatedSpaces(themeName, 2),
          getThemeRelatedEvents(themeName, 2),
          getThemeRelatedArticles(themeName, 2),
        ]);

        setPosts(p);
        setSpaces(s);
        setEvents(e);
        setArticles(a);
      } catch (err) {
        console.warn("Error loading theme-related content:", err);
      } finally {
        setContentLoading(false);
      }
    };

    if (!loading) {
      loadContent();
    }
  }, [themeName, loading]);

  const hasContent = posts.length > 0 || spaces.length > 0 || events.length > 0 || articles.length > 0;

  if (contentLoading || loading) {
    return null; // Don't show skeleton while loading
  }

  if (!hasContent) {
    return null; // Don't show section if no related content
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1a0f0a] mb-2">
          Explore: {themeTitle}
        </h3>
        <p className="text-sm text-[#a0704a] mb-4">
          Community conversations and resources about {themeName}
        </p>

        <div className="space-y-6">
          {/* Posts */}
          {posts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
                From the Room
              </h4>
              <div className="space-y-3">
                {posts.slice(0, 2).map((post) => (
                  <Card key={post.id} className="bg-white">
                    <div className="space-y-2">
                      <p className="font-medium text-[#1a0f0a]">
                        {post.authorName || "Anonymous"}
                      </p>
                      <p className="text-sm text-[#4a3e33] line-clamp-2">
                        {post.content}
                      </p>
                      <p className="text-xs text-[#a0704a]">
                        {post.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Articles */}
          {articles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
                Readings
              </h4>
              <div className="space-y-3">
                {articles.slice(0, 2).map((article) => (
                  <Card key={article.id} className="bg-white">
                    <div className="space-y-2">
                      <p className="font-medium text-[#1a0f0a]">
                        {article.title}
                      </p>
                      <p className="text-sm text-[#4a3e33] line-clamp-2">
                        {article.excerpt}
                      </p>
                      {article.url && (
                        <Link href={article.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            Read more →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Spaces */}
          {spaces.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
                Spaces
              </h4>
              <div className="flex flex-wrap gap-2">
                {spaces.map((space) => (
                  <Link key={space.id} href={`/app/spaces/${space.id}`}>
                    <Button variant="outline" size="sm">
                      {space.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#c97a2a] mb-3 uppercase tracking-wide">
                Events
              </h4>
              <div className="space-y-2">
                {events.map((event) => (
                  <Card key={event.id} className="bg-white">
                    <div className="space-y-1">
                      <p className="font-medium text-[#1a0f0a]">
                        {event.title}
                      </p>
                      <p className="text-sm text-[#a0704a]">
                        {event.date
                          ? new Date(event.date).toLocaleDateString()
                          : "TBA"}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e8ddd2]" />
    </div>
  );
}
