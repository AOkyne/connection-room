"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";

// Step 1 of the password reset flow -- asks for an email and hands it to
// /api/auth/forgot-password, which emails a reset link if (and only if)
// an account exists. The confirmation is deliberately identical either
// way, so this page can't be used to check whether someone is a member.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Carried through to the emailed reset link, so after choosing a
        // new password the member lands where they were originally going.
        body: JSON.stringify({ email: email.trim(), next: new URLSearchParams(window.location.search).get("next") }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 overflow-hidden">
        <Image src="/imagery/image10.png" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <header className="relative z-20 border-b border-[#e8e3db] bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img src="/connection-room-logo.svg" alt="The Connection Room" className="h-16 sm:h-24 lg:h-32 w-auto" />
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl p-8 shadow-md border border-[#e8e3db] space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-[#1a1714]">Forgot your password?</h2>
              {!sent && (
                <p className="text-sm text-[#6b6460]">
                  Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
                </p>
              )}
            </div>

            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-[#1a1714]">
                  If there&apos;s an account for <strong>{email.trim()}</strong>, we&apos;ve sent a link to reset your
                  password. It works for one hour.
                </p>
                <p className="text-sm text-[#6b6460]">
                  Don&apos;t see it? Check your spam or promotions folder, or wait a couple of minutes and try again.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1714] mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] placeholder-[#9d9490] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                  />
                </div>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting || !email.trim()}>
                  {submitting ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            )}

            <div className="text-center pt-4 border-t border-[#e8e3db]">
              <Link href="/auth" className="text-[#8b6f47] hover:text-[#c9a876] font-medium">
                ← Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
