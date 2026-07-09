import { supabase } from "@/lib/supabase/client";

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  url: string;
  author: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Get all articles from Supabase
export async function getArticles(): Promise<Article[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      console.warn("Error fetching articles:", error);
      return [];
    }

    return (
      data?.map((article) => ({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        url: article.url,
        author: article.author,
        publishedAt: new Date(article.published_at),
        createdAt: new Date(article.created_at),
        updatedAt: new Date(article.updated_at),
      })) || []
    );
  } catch (err) {
    console.warn("Error in getArticles:", err);
    return [];
  }
}

// Get newest article
export async function getNewestArticle(): Promise<Article | null> {
  const articles = await getArticles();
  return articles.length > 0 ? articles[0] : null;
}

// Get article by id
export async function getArticle(id: string): Promise<Article | null> {
  const articles = await getArticles();
  return articles.find((a) => a.id === id) || null;
}
