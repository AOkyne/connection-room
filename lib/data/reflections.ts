// Reflections data layer - fetch recent reflections from The Commons

import { demoPosts } from "./demo-data";

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

// Get recent reflections (posts) from The Commons space only - lightweight version
export async function getRecentReflections(limit: number = 5): Promise<RecentReflection[]> {
  if (typeof window === "undefined") return [];

  try {
    // Get posts from localStorage (demo mode) or use demo data
    let posts = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("connection-room:posts");
      if (stored) {
        try {
          posts = JSON.parse(stored);
        } catch (e) {
          posts = demoPosts;
        }
      } else {
        posts = demoPosts;
      }
    } else {
      posts = demoPosts;
    }

    // Filter for Commons space and get recent posts
    const commonsPosts = posts
      .filter((p: any) => p.spaceId === COMMONS_SPACE_ID)
      .slice(0, limit);

    // Convert to reflections (no reaction migration needed)
    const reflections = commonsPosts.map((post: any) => {
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
        createdAt: post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt),
      };
    });

    return reflections.sort((a: RecentReflection, b: RecentReflection) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Error fetching recent reflections:", error);
    return [];
  }
}
