import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const hashParams = new URLSearchParams(url.hash.substring(1)); // Parse hash fragment

  const code = searchParams.get("code");
  const error = searchParams.get("error") || hashParams.get("error");
  const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");
  const errorCode = hashParams.get("error_code");

  console.log("Callback route hit. Code:", !!code, "Error:", error, "ErrorCode:", errorCode);

  if (!supabase) {
    console.error("Supabase not configured");
    return NextResponse.redirect(new URL("/auth?error=no-supabase", request.url));
  }

  if (error) {
    console.error("Auth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth?error=${error}&description=${errorDescription || ""}`, request.url)
    );
  }

  if (code) {
    try {
      console.log("Exchanging code for session...");
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error("Session exchange error:", sessionError);
        return NextResponse.redirect(
          new URL(`/auth?error=invalid-code&description=${sessionError.message}`, request.url)
        );
      }

      if (!data.session) {
        console.error("No session in response");
        return NextResponse.redirect(
          new URL(`/auth?error=no-session`, request.url)
        );
      }

      console.log("Session created for user:", data.session.user?.id);
      const { user } = data.session;

      if (user?.id) {
        // Check if profile exists
        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, completed_onboarding")
          .eq("id", user.id)
          .single();

        // If profile doesn't exist, create it
        if (!existingProfile) {
          const displayName = user.email?.split("@")[0] || "User";
          const initials = displayName
            .split(".")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          const avatarDataUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23d4a574' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' font-size='80' font-weight='bold' fill='white' text-anchor='middle' dy='.3em'%3E${initials}%3C/text%3E%3C/svg%3E`;

          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            display_name: displayName,
            member_type: "individual",
            completed_onboarding: false,
          });

          if (insertError) {
            console.error("Error creating profile:", insertError);
          }
        }

        // Check if onboarding is complete
        if (existingProfile?.completed_onboarding) {
          return NextResponse.redirect(new URL("/app", request.url));
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
