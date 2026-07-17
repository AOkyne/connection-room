// Reflections data layer - fetch recent reflections from The Commons

import { getPosts } from "./posts";

export interface RecentReflection {
  id: string;
  spaceId: string;
  spaceName: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorPhoto?: string;
  authorId: string;
  createdAt: Date;
}

const COMMONS_SPACE_ID = "commons";
const COMMONS_SPACE_NAME = "The Commons";

// Get recent reflections (posts) from The Commons space only - lightweight version.
// This previously read only localStorage("connection-room:posts")/demoPosts directly,
// never Supabase -- so on a fresh browser (no localStorage) it silently showed the
// hardcoded demo seed roster forever, and even with localStorage populated it never
// picked up any post actually saved to the real database. Now goes through
// getPosts(), the same real-data path every other feature in the app uses.
export async function getRecentReflections(limit: number = 5): Promise<RecentReflection[]> {
  if (typeof window === "undefined") return [];

  try {
    const posts = await getPosts(COMMONS_SPACE_ID);

    // Convert to reflections (already sorted newest-first by getPosts)
    const reflections = posts.slice(0, limit).map((post) => {
      // Get first sentence as title
      const sentences = post.content.match(/[^.!?]+[.!?]+/g) || [post.content];
      const title = sentences[0].trim().substring(0, 80);

      // Get excerpt from remaining content (after first sentence)
      const remainingContent = post.content.substring(title.length).trim();
      const excerpt = (remainingContent || post.content).substring(0, 120);

      return {
        id: post.id,
        spaceId: COMMONS_SPACE_ID,
        spaceName: COMMONS_SPACE_NAME,
        title,
        excerpt,
        authorName: post.authorName,
        authorPhoto: post.authorPhoto,
        authorId: post.userId,
        createdAt: post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt),
      };
    });

    return reflections;
  } catch (error) {
    console.error("Error fetching recent reflections:", error);
    return [];
  }
}
