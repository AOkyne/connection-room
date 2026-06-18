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
      return {
        success: false,
        error: signUpError.message,
      };
    }

    // For password signup, immediately sign them in (no email confirmation needed for password auth)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        success: false,
        error: signInError.message,
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
