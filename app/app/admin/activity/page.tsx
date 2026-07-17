"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LoadingScreen } from "@/components/LoadingScreen";

interface ActivityItem {
  id: string;
  type: "post" | "comment";
  spaceId: string;
  authorName: string;
  content: string;
  createdAt: string;
  postId?: string;
}

export default function ActivityFeedPage() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"1hour" | "24hours" | "7days">("24hours");
  const [spaceName, setSpaceName] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session || session.type !== "admin") {
        router.push("/app");
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setLoading(false);
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      try {
        // Calculate time threshold
        let minutesAgo = 1440; // 24 hours default
        if (timeFilter === "1hour") minutesAgo = 60;
        else if (timeFilter === "7days") minutesAgo = 10080;

        const sinceTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

        // Get spaces for name lookup
        const { data: spacesData } = await supabase.from("spaces").select("id, name");
        const spaceMap: Record<string, string> = {};
        spacesData?.forEach((s: any) => {
          spaceMap[s.id] = s.name;
        });
        setSpaceName(spaceMap);

        // Get new posts
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, space_id, author_name, body, created_at")
          .gt("created_at", sinceTime)
          .order("created_at", { ascending: false });

        // Get new comments with post info
        const { data: commentsData } = await supabase
          .from("comments")
          .select("id, post_id, author_name, body, created_at, posts(space_id)")
          .gt("created_at", sinceTime)
          .order("created_at", { ascending: false });

        // Combine and format
        const allActivity: ActivityItem[] = [
          ...(postsData?.map((p: any) => ({
            id: p.id,
            type: "post" as const,
            spaceId: p.space_id,
            authorName: p.author_name,
            content: p.body,
            createdAt: p.created_at,
          })) || []),
          ...(commentsData?.map((c: any) => ({
            id: c.id,
            type: "comment" as const,
            spaceId: (c.posts as any)?.space_id || "unknown",
            authorName: c.author_name,
            content: c.body,
            createdAt: c.created_at,
            postId: c.post_id,
          })) || []),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setActivity(allActivity);
      } catch (error) {
        console.error("Error loading activity:", error);
      }

      setLoading(false);
    };

    loadData();
  }, [router, timeFilter]);

  if (loading) {
    return <LoadingScreen message="Loading activity feed" />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Admin", href: "/app/admin" },
          { label: "Activity Feed", isActive: true },
        ]}
      />

      <div>
        <h1 className="text-4xl font-bold text-[#1a0f0a]">Community Activity</h1>
        <p className="text-lg text-[#1a0f0a] mt-2">
          Latest posts and comments across all spaces
        </p>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2">
        {(["1hour", "24hours", "7days"] as const).map((filter) => (
          <Button
            key={filter}
            variant={timeFilter === filter ? "primary" : "outline"}
            size="sm"
            onClick={() => setTimeFilter(filter)}
          >
            {filter === "1hour" && "Last Hour"}
            {filter === "24hours" && "Last 24h"}
            {filter === "7days" && "Last 7 Days"}
          </Button>
        ))}
      </div>

      {/* Activity List */}
      {activity.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[#a0704a]">No activity in this time period</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {activity.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="pt-1">
                  {item.type === "post" ? (
                    <div className="w-8 h-8 rounded-full bg-[#d4a348] flex items-center justify-center text-white text-sm font-bold">
                      P
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#9f7f5c] flex items-center justify-center text-white text-sm font-bold">
                      C
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[#1a0f0a]">{item.authorName}</span>
                    <span className="text-xs text-[#a0704a]">
                      {item.type === "post" ? "posted in" : "commented in"}
                    </span>
                    <span className="text-xs font-medium text-[#c97a2a]">
                      {spaceName[item.spaceId] || item.spaceId}
                    </span>
                  </div>

                  <p className="text-sm text-[#1a0f0a] mb-2 line-clamp-3">{item.content}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#a0704a]">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <Link href={`/app/admin/moderation`}>
                      <Button variant="ghost" size="sm">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
