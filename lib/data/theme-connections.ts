/**
 * Theme Connections Service
 *
 * Retrieves community content (posts, spaces, events, articles) related to daily themes.
 * Enables "Explore conversations about today's theme" features.
 *
 * Uses theme_tags JSONB field added to posts, spaces, events, articles, comments.
 * Schema: theme_tags = ["receiving", "boundaries", "desire", ...]
 */

import { supabase } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/utils/with-timeout";
import type { Post } from "./posts";
import type { Article } from "./articles";

export interface ThemeContent {
  type: "post" | "space" | "event" | "article";
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  authorName?: string;
  url?: string;
}

/**
 * Get posts related to a specific theme
 */
export async function getThemeRelatedPosts(
  themeName: string,
  limit: number = 5
): Promise<Post[]> {
  if (!supabase) return [];

  try {
    const result = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .contains("theme_tags", [themeName])
          .order("created_at", { ascending: false })
          .limit(limit);
        return { data, error };
      })(),
      3000,
      { data: null, error: null }
    );

    const { data, error } = result;

    if (error) {
      console.warn("Error fetching theme-related posts:", error);
      return [];
    }

    return (data || []).map((post: any) => ({
      id: post.id,
      spaceId: post.space_id,
      userId: post.user_id,
      authorName: post.author_name,
      authorPronouns: post.author_pronouns,
      authorPhoto: post.author_photo,
      promptId: post.prompt_id,
      content: post.body,
      isPromptResponse: !!post.prompt_id,
      createdAt: new Date(post.created_at),
      reactions: {},
      commentCount: post.comment_count || 0,
    }));
  } catch (err) {
    console.warn("Exception in getThemeRelatedPosts:", err);
    return [];
  }
}

/**
 * Get spaces related to a specific theme
 */
export async function getThemeRelatedSpaces(
  themeName: string,
  limit: number = 3
): Promise<any[]> {
  if (!supabase) return [];

  try {
    const result = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("spaces")
          .select("*")
          .contains("theme_tags", [themeName])
          .order("name", { ascending: true })
          .limit(limit);
        return { data, error };
      })(),
      3000,
      { data: null, error: null }
    );

    const { data, error } = result;

    if (error) {
      console.warn("Error fetching theme-related spaces:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("Exception in getThemeRelatedSpaces:", err);
    return [];
  }
}

/**
 * Get events related to a specific theme
 */
export async function getThemeRelatedEvents(
  themeName: string,
  limit: number = 3
): Promise<any[]> {
  if (!supabase) return [];

  try {
    const result = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .contains("theme_tags", [themeName])
          .order("date", { ascending: true })
          .limit(limit);
        return { data, error };
      })(),
      3000,
      { data: null, error: null }
    );

    const { data, error } = result;

    if (error) {
      console.warn("Error fetching theme-related events:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("Exception in getThemeRelatedEvents:", err);
    return [];
  }
}

/**
 * Get articles related to a specific theme
 */
export async function getThemeRelatedArticles(
  themeName: string,
  limit: number = 3
): Promise<Article[]> {
  if (!supabase) return [];

  try {
    const result = await withTimeout(
      (async () => {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .contains("theme_tags", [themeName])
          .order("published_at", { ascending: false })
          .limit(limit);
        return { data, error };
      })(),
      3000,
      { data: null, error: null }
    );

    const { data, error } = result;

    if (error) {
      console.warn("Error fetching theme-related articles:", error);
      return [];
    }

    return (data || []).map((article: any) => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      url: article.url,
      author: article.author,
      publishedAt: new Date(article.published_at),
      createdAt: new Date(article.created_at),
      updatedAt: new Date(article.updated_at),
    }));
  } catch (err) {
    console.warn("Exception in getThemeRelatedArticles:", err);
    return [];
  }
}

/**
 * Get all content (posts, spaces, events, articles) related to a theme
 * Aggregated for dashboard display
 */
export async function getThemeRelatedContent(themeName: string): Promise<{
  posts: Post[];
  spaces: any[];
  events: any[];
  articles: Article[];
  isEmpty: boolean;
}> {
  if (!supabase) {
    return { posts: [], spaces: [], events: [], articles: [], isEmpty: true };
  }

  try {
    const [posts, spaces, events, articles] = await Promise.all([
      getThemeRelatedPosts(themeName, 5),
      getThemeRelatedSpaces(themeName, 3),
      getThemeRelatedEvents(themeName, 3),
      getThemeRelatedArticles(themeName, 3),
    ]);

    const isEmpty =
      posts.length === 0 &&
      spaces.length === 0 &&
      events.length === 0 &&
      articles.length === 0;

    return { posts, spaces, events, articles, isEmpty };
  } catch (err) {
    console.warn("Error aggregating theme-related content:", err);
    return { posts: [], spaces: [], events: [], articles: [], isEmpty: true };
  }
}

/**
 * Search for content by multiple themes
 * Useful for "related themes" exploration
 */
export async function searchContentByThemes(
  themeNames: string[],
  limit: number = 10
): Promise<ThemeContent[]> {
  if (!supabase || themeNames.length === 0) return [];

  try {
    const results: ThemeContent[] = [];

    // Search posts
    const postsResult = await withTimeout(
      (async () => {
        const { data } = await supabase
          .from("posts")
          .select("id, author_name, body, created_at")
          .or(themeNames.map((t) => `theme_tags.cs.["${t}"]`).join(","))
          .order("created_at", { ascending: false })
          .limit(limit);
        return data;
      })(),
      3000,
      null
    );

    if (postsResult) {
      results.push(
        ...postsResult.map((p: any) => ({
          type: "post" as const,
          id: p.id,
          title: p.author_name || "Anonymous",
          description: p.body?.substring(0, 100),
          createdAt: new Date(p.created_at),
        }))
      );
    }

    // Search articles
    const articlesResult = await withTimeout(
      (async () => {
        const { data } = await supabase
          .from("articles")
          .select("id, title, excerpt, published_at, url")
          .or(themeNames.map((t) => `theme_tags.cs.["${t}"]`).join(","))
          .order("published_at", { ascending: false })
          .limit(limit);
        return data;
      })(),
      3000,
      null
    );

    if (articlesResult) {
      results.push(
        ...articlesResult.map((a: any) => ({
          type: "article" as const,
          id: a.id,
          title: a.title,
          description: a.excerpt,
          createdAt: new Date(a.published_at),
          url: a.url,
        }))
      );
    }

    // Sort by recency
    return results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  } catch (err) {
    console.warn("Error searching content by themes:", err);
    return [];
  }
}

/**
 * Get common themes across community content
 * Useful for understanding what the community is talking about
 */
export async function getPopularThemes(): Promise<
  { theme: string; count: number }[]
> {
  if (!supabase) return [];

  try {
    // This would require database function or client-side aggregation
    // For now, return common themes from daily companion
    const commonThemes = [
      "receiving",
      "boundaries",
      "desire",
      "vulnerability",
      "presence",
      "authenticity",
      "connection",
      "intimacy",
      "trust",
      "self-awareness",
    ];

    return commonThemes.map((theme) => ({
      theme,
      count: 0, // Would be populated from database counts
    }));
  } catch (err) {
    console.warn("Error getting popular themes:", err);
    return [];
  }
}
