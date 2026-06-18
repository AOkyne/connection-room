import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (!supabase) {
    return NextResponse.redirect(new URL("/auth?error=no-supabase", request.url));
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth?error=${error}&description=${errorDescription || ""}`, request.url)
    );
  }

  if (code) {
    try {
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError || !data.session) {
        return NextResponse.redirect(
          new URL(`/auth?error=invalid-code&description=${sessionError?.message || ""}`, request.url)
        );
      }

      const { user } = data.session;

      // Check if user has completed onboarding
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("completed_onboarding")
          .eq("user_id", user.id)
          .single();

        if (profile?.completed_onboarding) {
          return NextResponse.redirect(new URL("/app/dashboard", request.url));
        }
      }

      return NextResponse.redirect(new URL("/onboarding", request.url));
    } catch (err) {
      console.error("Error exchanging code for session:", err);
      return NextResponse.redirect(
        new URL("/auth?error=session-exchange-failed", request.url)
      );
    }
  }

  return NextResponse.redirect(new URL("/auth?error=no-code", request.url));
}
