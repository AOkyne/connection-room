"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { createMemberSession, createAdminSession } from "@/lib/session";
import { createDemoProfile } from "@/lib/data/profiles";
import { IconDemo } from "@/components/Icons";
import { isBetaMode } from "@/lib/app-mode";
import { signInWithEmail, signUpWithPassword, signInWithPassword } from "@/lib/auth/supabase";
import {
  fallbackSignInWithPassword,
  fallbackSignUpWithPassword,
} from "@/lib/auth/fallback";
import Link from "next/link";

function BetaAuthContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"password-signup" | "password-signin">("password-signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const handleBetaSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (authMode === "password-signup") {
        // Email/password signup - try Supabase first
        const result = await signUpWithPassword(email, password);
        if (result.success) {
          setTimeout(() => {
            router.push("/onboarding");
          }, 500);
        } else {
          // Supabase failed, try fallback immediately
          console.log("Supabase signup failed, trying fallback:", result.error);
          const fallbackResult = await fallbackSignUpWithPassword(email, password);
          if (fallbackResult.success) {
            setUsingFallback(true);
            setError("✓ Account created - Using fallback mode (Supabase temporarily unavailable)");
            setTimeout(() => {
              router.push("/onboarding");
            }, 1500);
          } else {
            setError(fallbackResult.error || "Failed to sign up");
          }
        }
      } else {
        // Email/password signin - try Supabase first
        const result = await signInWithPassword(email, password);
        if (result.success) {
          setTimeout(() => {
            router.push("/app");
          }, 500);
        } else {
          // Supabase failed, try fallback immediately
          console.log("Supabase signin failed, trying fallback:", result.error);
          const fallbackResult = await fallbackSignInWithPassword(email, password);
          if (fallbackResult.success) {
            setUsingFallback(true);
            setError("✓ Logged in - Using fallback mode (Supabase temporarily unavailable)");
            setTimeout(() => {
              router.push("/app");
            }, 1500);
          } else {
            // Show Supabase error only if fallback also fails
            setError(fallbackResult.error || (result.error as string) || "Invalid email or password");
          }
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative">
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/imagery/image10.png"
          alt="Welcome"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-[#e8e3db] bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/Connection-room-logo.png?v=4"
              alt="The Connection Room"
              className="h-32 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Centered Login Form */}
      <div className="relative z-10 min-h-[calc(100vh-auto)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl p-8 shadow-md border border-[#e8e3db] space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-[#1a1714]">Beta Sign In</h2>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("password-signup");
                    setError("");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    authMode === "password-signup"
                      ? "bg-[#d4a348] text-white"
                      : "bg-[#f3ede5] text-[#6b6460] hover:bg-[#e8ddd2]"
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("password-signin");
                    setError("");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    authMode === "password-signin"
                      ? "bg-[#d4a348] text-white"
                      : "bg-[#f3ede5] text-[#6b6460] hover:bg-[#e8ddd2]"
                  }`}
                >
                  Sign In
                </button>
              </div>
              <p className="text-[#6b6460]">
                {authMode === "password-signup" && "Create a new account"}
                {authMode === "password-signin" && "Log in with your existing account"}
              </p>
            </div>

            {success && (
              <div className="bg-[#e8f5e9] border border-[#c97a2a] rounded-lg p-4">
                <p className="text-sm text-[#2a5e2a]">
                  Check your email for a magic link to sign in!
                </p>
              </div>
            )}

            {error && (
              <div className={`rounded-lg p-4 ${
                usingFallback
                  ? "bg-[#fff3e0] border border-[#d4a348]"
                  : "bg-[#ffebee] border border-[#a84a2a]"
              }`}>
                <p className={`text-sm ${
                  usingFallback
                    ? "text-[#1a0f0a]"
                    : "text-[#6b2c1f]"
                }`}>
                  {usingFallback ? "⚠️ " : ""}{error}
                </p>
                {usingFallback && (
                  <p className="text-xs text-[#c97a2a] mt-2">
                    You're in demo mode. Most features work normally.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleBetaSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1714] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] placeholder-[#9d9490] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1714] mb-2">
                  Password {authMode === "password-signup" && "(min 8 characters)"}
                </label>
                <input
                  type="password"
                  placeholder={authMode === "password-signup" ? "Choose a password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={authMode === "password-signup" ? 8 : undefined}
                  className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] placeholder-[#9d9490] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  authMode === "password-signup" ? "Creating account..." : "Signing in..."
                ) : (
                  authMode === "password-signup" ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>

            <div className="bg-[#f8f6f2] rounded-lg p-4 text-sm text-[#6b6460] space-y-2">
              <p className="font-medium text-[#1a1714]">Welcome to Beta Testing</p>
              {authMode === "password-signup" && (
                <ul className="space-y-1">
                  <li>• Create an account with any email and password (min 8 chars)</li>
                  <li>• You'll be logged in immediately</li>
                  <li>• Complete your profile setup</li>
                  <li>• Explore the community</li>
                  <li className="pt-2 border-t border-[#ddd7d0]">
                    <strong>Note:</strong> If backend is down, accounts are stored locally for testing
                  </li>
                </ul>
              )}
              {authMode === "password-signin" && (
                <ul className="space-y-1">
                  <li>• Enter your email and password</li>
                  <li>• You'll be logged in immediately</li>
                  <li>• Return to your dashboard</li>
                  <li>• Continue exploring</li>
                  <li className="pt-2 border-t border-[#ddd7d0]">
                    <strong>Demo Accounts:</strong>
                    <br />demo@connection.room / Demo123!
                    <br />test@connection.room / Test123!
                  </li>
                </ul>
              )}
            </div>

            <div className="text-center space-y-2 pt-4 border-t border-[#e8e3db]">
              <Link href="/" className="block text-[#8b6f47] hover:text-[#c9a876] font-medium">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoAuthContent() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinueAsMember = async () => {
    setLoading(true);
    const name = displayName || "Demo Member";
    const profile = createDemoProfile(name, "individual");
    createMemberSession(name, profile.profilePhoto);
    setTimeout(() => {
      router.push("/onboarding");
    }, 100);
  };

  const handleContinueAsAdmin = async () => {
    setLoading(true);
    const profile = createDemoProfile("Demo Admin", "individual");
    createAdminSession("Demo Admin", profile.profilePhoto);
    setTimeout(() => {
      router.push("/app/admin");
    }, 100);
  };

  const handleQuickEntry = (type: "member" | "admin") => {
    if (type === "member") {
      handleContinueAsMember();
    } else {
      handleContinueAsAdmin();
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      <header className="border-b border-[#e8e3db] bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/Connection-room-logo.png?v=4"
              alt="The Connection Room"
              className="h-32 w-auto"
            />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl p-8 shadow-md border border-[#e8e3db] space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-[#1a1714]">Welcome</h2>
              <p className="text-[#6b6460]">Enter the community to explore</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#1a1714] mb-2">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter your name or leave blank"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] placeholder-[#9d9490] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleContinueAsMember();
                  }}
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleContinueAsMember}
                disabled={loading}
              >
                {loading ? "Entering..." : "Continue as Demo Member"}
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handleContinueAsAdmin}
                disabled={loading}
              >
                {loading ? "Entering..." : "Continue as Demo Admin"}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e8e3db]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-[#9d9490]">or</span>
              </div>
            </div>

            <div className="bg-[#f8f6f2] rounded-lg p-4 text-sm text-[#6b6460] space-y-2">
              <p className="font-medium text-[#1a1714] flex items-center gap-2"><IconDemo size={16} /> Demo Mode</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>All data is local and resets on refresh</li>
                <li>No account creation needed yet</li>
                <li>Experience the full community interface</li>
              </ul>
            </div>

            <div className="text-center space-y-2 pt-4 border-t border-[#e8e3db]">
              <Link href="/" className="block text-[#8b6f47] hover:text-[#c9a876] font-medium">
                ← Back to Home
              </Link>
              <p className="text-xs text-[#9d9490]">
                Questions?{" "}
                <a href={appConfig.urls.freeConsult} className="text-[#8b6f47] hover:text-[#c9a876]">
                  Book a consultation
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthContent() {
  const betaMode = isBetaMode();

  if (betaMode) {
    return <BetaAuthContent />;
  }

  return <DemoAuthContent />;
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7]" />}>
      <AuthContent />
    </Suspense>
  );
}
