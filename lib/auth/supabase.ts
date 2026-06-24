// Supabase authentication functions for Phase 1.1 beta
// Supports magic link login and email/password fallback

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
  };
}

// Sign up or sign in with email (magic link if available, else password)
export async function signInWithEmail(
  email: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Supabase not configured",
    };
  }

  try {
    // Try magic link first (OTP)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Sign up with email/password
export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Supabase not configured",
    };
  }

  try {
    console.log("Attempting signup with email:", email);
    // First, sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (signUpError) {
      const errorMessage =
        signUpError.message ||
        (typeof signUpError === 'object' && JSON.stringify(signUpError)) ||
        "Failed to sign up";
      console.error("Signup error:", signUpError);
      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log("Signup success, user id:", signUpData.user?.id);

    // For password signup, immediately sign them in (no email confirmation needed for password auth)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const errorMessage =
        signInError.message ||
        (typeof signInError === 'object' && JSON.stringify(signInError)) ||
        "Failed to sign in";
      console.error("Sign-in error after signup:", signInError);
      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log("Sign-in successful after signup");

    // Create profile for the new user
    if (signUpData.user) {
      console.log("Creating profile for user:", signUpData.user.id);
      const { error: profileError } = await supabase.from("profiles").insert({
        id: signUpData.user.id,
        display_name: displayName || email.split("@")[0],
        member_type: "individual",
        completed_onboarding: false,
      });
      if (profileError) {
        console.error("Profile insert error:", profileError);
      } else {
        console.log("Profile created successfully");
      }

      // Auto-join user to default spaces
      const defaultSpaces = ["start-here", "commons"];
      for (const spaceId of defaultSpaces) {
        await supabase.from("space_memberships").insert({
          user_id: signUpData.user.id,
          space_id: spaceId,
        });
      }
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("Signup exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Sign in with email/password
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Supabase not configured",
    };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Extract message from error object safely
      let errorMessage = "Failed to sign in";

      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === "AuthRetryableError") {
        errorMessage = "Connection error. Please check your internet connection and try again.";
      } else if (typeof error === 'object') {
        try {
          const serialized = JSON.stringify(error);
          if (serialized && serialized !== '{}') {
            errorMessage = serialized;
          }
        } catch (e) {
          // Fallback if JSON.stringify fails
          errorMessage = error.toString() || "Failed to sign in";
        }
      }

      console.error("Sign in error:", error, "Message:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    let errorMessage = "Unknown error";

    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (err && typeof err === 'object') {
      errorMessage = err.toString();
    }

    console.error("Sign in exception:", err, "Message:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get current authenticated user
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user as AuthUser | null;
  } catch {
    return null;
  }
}

// Sign out
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Verify OTP token from magic link
export async function verifyOtp(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Supabase not configured",
    };
  }

  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
