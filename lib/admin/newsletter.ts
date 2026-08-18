import { supabase } from "@/lib/supabase/client";

export interface AdminNewsletterQuestion {
  id: string;
  postId: string;
  spaceId: string;
  spaceName: string;
  questionText: string;
  weekNumber: number;
  status: string;
}

// newsletter-eligible Question of the Week entries, for both the
// dedicated generator page (app/app/admin/newsletter) and the "Insert
// Question" picker in BroadcastRichTextEditor -- same admin-gated route
// (requireAdmin()-backed, since space_weekly_prompts is service-role
// only), same auth-header pattern as lib/admin/broadcast-drafts.ts.
export async function getAdminNewsletterQuestions(): Promise<AdminNewsletterQuestion[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return [];

    const response = await fetch("/api/admin/newsletter/questions", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.questions || [];
  } catch (err) {
    console.error("Error fetching newsletter questions:", err);
    return [];
  }
}
