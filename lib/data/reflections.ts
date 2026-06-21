// Reflections data layer - fetch recent reflections from The Commons

import { getPosts } from "./posts";

export interface RecentReflection {
  id: string;
  spaceId: string;
  spaceName: string;
  title: string;
  excerpt: string;
  authorName: string;
  createdAt: Date;
}

const COMMONS_SPACE_ID = "commons";
const COMMONS_SPACE_NAME = "The Commons";

// Get recent reflections (posts) from The Commons space only
export async function getRecentReflections(limit: number = 5): Promise<RecentReflection[]> {
  if (typeof window === "undefined") return [];

  try {
    // Fetch posts only from The Commons
    const posts = await getPosts(COMMONS_SPACE_ID);

    // Convert posts to reflections
    const reflections = posts.slice(0, limit).map((post) => ({
      id: post.id,
      spaceId: COMMONS_SPACE_ID,
      spaceName: COMMONS_SPACE_NAME,
      title: post.content.split("\n")[0].substring(0, 80), // First line as title
      excerpt: post.content.substring(0, 120), // First 120 chars as excerpt
      authorName: post.authorName,
      createdAt: post.createdAt,
    }));

    // Sort by most recent first
    return reflections.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Error fetching recent reflections:", error);
    return [];
  }
}
