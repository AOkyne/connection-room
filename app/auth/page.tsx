"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { createMemberSession, createAdminSession } from "@/lib/session";
import { createDemoProfile } from "@/lib/data/profiles";
import Link from "next/link";

function AuthContent() {
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
      {/* Header */}
      <header className="border-b border-[#e8e3db] bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#8b6f47]">🕯️</span>
            <h1 className="text-xl font-bold text-[#1a1714]">{appConfig.name}</h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl p-8 shadow-md border border-[#e8e3db] space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-[#1a1714]">Welcome</h2>
              <p className="text-[#6b6460]">Enter the community to explore</p>
            </div>

            {/* Quick Demo Access */}
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

            {/* Or Skip to Quick Tour */}
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

            {/* Info Text */}
            <div className="bg-[#f8f6f2] rounded-lg p-4 text-sm text-[#6b6460] space-y-2">
              <p className="font-medium text-[#1a1714]">🧪 Demo Mode Notes:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>All data is local and resets on refresh</li>
                <li>No account creation needed yet</li>
                <li>Experience the full community interface</li>
                <li>Real Supabase integration coming in Phase 2</li>
              </ul>
            </div>

            {/* Footer Links */}
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

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7]" />}>
      <AuthContent />
    </Suspense>
  );
}
