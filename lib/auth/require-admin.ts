import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type RequireAdminResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

// Verifies the caller is a real, signed-in admin: validates their Supabase
// access token server-side, then checks profiles.role for that user. Use
// this in every admin-only API route instead of trusting a client-sent flag.
export async function requireAdmin(request: NextRequest): Promise<RequireAdminResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, status: 500, error: "Missing Supabase configuration" };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, status: 401, error: "Missing authorization token" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, userId: userData.user.id, supabase };
}
