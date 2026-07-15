import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type RequireAuthResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

// Verifies the caller is a real, signed-in member: validates their Supabase
// access token server-side. Use this in API routes that need service-role
// access to data other members can't directly SELECT (e.g. matching, which
// needs to score against private profile fields), while still requiring the
// caller to be authenticated. Unlike requireAdmin, any signed-in member
// passes -- the route itself is responsible for only returning safe fields.
export async function requireAuth(request: NextRequest): Promise<RequireAuthResult> {
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

  return { ok: true, userId: userData.user.id, supabase };
}
