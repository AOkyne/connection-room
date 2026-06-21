// Reflections data layer - fetch recent reflections across spaces

import { getPosts } from "./posts";
import { getSpaces } from "./spaces";

export interface RecentReflection {
  id: string;
  spaceId: string;
  spaceName: string;
  title: string;
  excerpt: string;
  authorName: string;
  createdAt: Date;
}

// Get recent reflections (posts) from user's joined spaces
export async function getRecentReflections(limit: number = 5): Promise<RecentReflection[]> {
  if (typeof window === "undefined") return [];

  try {
    // Get user's spaces
    const spaces = await getSpaces();
    const joinedSpaces = spaces.filter((s) => s.isJoined);

    // Fetch posts from each space and collect them
    const allPosts: RecentReflection[] = [];

    for (const space of joinedSpaces) {
      const posts = await getPosts(space.id);

      // Convert posts to reflections (limit to first 3 per space)
      const reflections = posts.slice(0, 3).map((post) => ({
        id: post.id,
        spaceId: space.id,
        spaceName: space.name,
        title: post.content.split("\n")[0].substring(0, 80), // First line as title
        excerpt: post.content.substring(0, 120), // First 120 chars as excerpt
        authorName: post.authorName,
        createdAt: post.createdAt,
      }));

      allPosts.push(...reflections);
    }

    // Sort by most recent first and limit to requested count
    return allPosts
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent reflections:", error);
    return [];
  }
}
