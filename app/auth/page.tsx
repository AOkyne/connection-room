"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { createMemberSession, createAdminSession } from "@/lib/session";
import { createDemoProfile } from "@/lib/data/profiles";
import { IconDemo } from "@/components/Icons";
import { isBetaMode } from "@/lib/app-mode";
import { signInWithEmail, signUpWithPassword } from "@/lib/auth/supabase";
import Link from "next/link";

function BetaAuthContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleBetaSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (usePassword) {
      // Email/password signup
      const result = await signUpWithPassword(email, password);
      if (result.success) {
        // For password auth, user is immediately logged in
        setTimeout(() => {
          router.push("/onboarding");
        }, 500);
      } else {
        setError(result.error || "Failed to sign up");
      }
    } else {
      // Magic link
      const result = await signInWithEmail(email);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/check-email");
        }, 1000);
      } else {
        setError(result.error || "Failed to send magic link");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      <header className="border-b border-[#e8e3db] bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/Connection-room-logo.png"
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
              <h2 className="text-3xl font-bold text-[#1a1714]">Beta Sign In</h2>
              <p className="text-[#6b6460]">Enter your email to get started</p>
            </div>

            {success && (
              <div className="bg-[#e8f5e9] border border-[#8fa878] rounded-lg p-4">
                <p className="text-sm text-[#2a5e2a]">
                  Check your email for a magic link to sign in!
                </p>
              </div>
            )}

            {error && (
              <div className="bg-[#ffebee] border border-[#b86a52] rounded-lg p-4">
                <p className="text-sm text-[#6b2c1f]">{error}</p>
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

              {usePassword && (
                <div>
                  <label className="block text-sm font-medium text-[#1a1714] mb-2">
                    Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] placeholder-[#9d9490] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading || !email || (usePassword && !password)}
              >
                {loading ? (usePassword ? "Creating account..." : "Sending magic link...") : (usePassword ? "Create Account" : "Send Magic Link")}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setUsePassword(!usePassword);
                  setError("");
                }}
                className="w-full text-sm text-[#8b6f47] hover:text-[#c9a876] font-medium"
              >
                {usePassword ? "← Use magic link instead" : "Use password instead →"}
              </button>
            </form>

            <div className="bg-[#f8f6f2] rounded-lg p-4 text-sm text-[#6b6460] space-y-2">
              <p className="font-medium text-[#1a1714]">Welcome to Beta Testing</p>
              {usePassword ? (
                <ul className="space-y-1">
                  <li>• Create an account with your email and password</li>
                  <li>• You'll be logged in immediately</li>
                  <li>• Complete your profile setup</li>
                  <li>• Explore the community</li>
                </ul>
              ) : (
                <ul className="space-y-1">
                  <li>• Check your email for a magic link</li>
                  <li>• Click the link to sign in</li>
                  <li>• Complete your profile setup</li>
                  <li>• Explore the community</li>
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
    createMemberSession(name);
    createDemoProfile(name, "individual");
    setTimeout(() => {
      router.push("/onboarding");
    }, 100);
  };

  const handleContinueAsAdmin = async () => {
    setLoading(true);
    createAdminSession("Demo Admin");
    createDemoProfile("Demo Admin", "individual");
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
              src="/Connection-room-logo.png"
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

            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => handleQuickEntry("member")}
              disabled={loading}
            >
              Quick Demo Tour (No Name)
            </Button>

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
