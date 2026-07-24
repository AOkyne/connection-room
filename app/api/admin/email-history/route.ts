import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const category = searchParams.get("category") || "";
  const search = searchParams.get("search")?.trim() || "";

  let query = auth.supabase
    .from("sent_emails")
    .select("id, category, to_email, cc_email, subject, sent_at", { count: "exact" })
    .order("sent_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }
  if (search) {
    // Matches either the recipient's address or the subject line -- the
    // two things someone searching "did I email so-and-so about X" would
    // actually type. Strip comma/parenthesis: PostgREST's .or() syntax
    // uses them as condition separators/grouping, so a raw one in the
    // search box would break the filter string, not just fail to match.
    const safeSearch = search.replace(/[,()]/g, "");
    query = query.or(`to_email.ilike.%${safeSearch}%,subject.ilike.%${safeSearch}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    emails: data || [],
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
