import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type RequireUserResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

// Verifies the caller is a real, signed-in Supabase user -- same token
// validation as requireAdmin(), but without the admin-role check, for
// self-service routes (e.g. account deletion) where a member is only ever
// allowed to act on their own account. The route itself must still key
// every operation off the returned userId, never off a client-supplied id.
export async function requireUser(request: NextRequest): Promise<RequireUserResult> {
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
