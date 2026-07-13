import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

interface DeleteResult {
  id: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { supabase } = auth;

  let memberIds: unknown;
  try {
    const body = await request.json();
    memberIds = body.memberIds;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(memberIds) || memberIds.length === 0 || !memberIds.every((id) => typeof id === "string")) {
    return NextResponse.json(
      { error: "memberIds must be a non-empty array of strings" },
      { status: 400 }
    );
  }

  const results: DeleteResult[] = [];

  for (const id of memberIds) {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        results.push({ id, success: false, error: fetchError.message });
        continue;
      }

      // Deleting the auth user cascades through profiles (profiles.user_id
      // has ON DELETE CASCADE) and everything downstream of profiles.id.
      if (profile?.user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(profile.user_id);
        if (!authError) {
          results.push({ id, success: true });
          continue;
        }
        // Fall through to a direct profile delete (e.g. seeded/demo profiles
        // whose user_id doesn't correspond to a real auth user).
      }

      const { error: deleteError } = await supabase.from("profiles").delete().eq("id", id);
      if (deleteError) {
        results.push({ id, success: false, error: deleteError.message });
      } else {
        results.push({ id, success: true });
      }
    } catch (err) {
      results.push({ id, success: false, error: String(err) });
    }
  }

  const failed = results.filter((r) => !r.success);
  return NextResponse.json({
    results,
    deletedCount: results.length - failed.length,
    failedCount: failed.length,
  });
}
