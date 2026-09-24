"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase/client";
import { clearSession } from "@/lib/session";

const MIN_PASSWORD_LENGTH = 8; // same minimum as signup (app/auth/page.tsx)

// Step 2 of the password reset flow -- opened from the emailed link
// (/api/auth/forgot-password). The one-time token in the URL is only
// redeemed when the member submits a new password, never on page load:
// many email security scanners automatically open every link in an
// incoming message, and redeeming on load would let a scanner use up the
// token before the member ever clicked it.
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams?.get("token_hash") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(!tokenHash);
  // Set once the token has been redeemed -- if updating the password then
  // fails (e.g. "must be different from your old password"), a retry
  // goes straight to the update using the session the token already
  // created, instead of re-verifying a token that's now used up.
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password needs to be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    if (!supabase) {
      setError("Password reset isn't available right now. Please try again later.");
      return;
    }

    setSubmitting(true);
    try {
      if (!verified) {
        // Signs out whoever else might be signed in on this browser first
        // (e.g. a shared computer), so the reset can't end up applied to,
        // or mixed up with, a different account's cached session.
        await clearSession();

        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        if (verifyError) {
          setLinkInvalid(true);
          return;
        }
        setVerified(true);
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Couldn't update your password. Please try again.");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/app"), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
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
            <h2 className="text-3xl font-bold text-[#1a1714] text-center">Choose a new password</h2>

            {done ? (
              <p className="text-center text-[#1a1714]">Your password has been updated. Taking you in...</p>
            ) : linkInvalid ? (
              <div className="space-y-4 text-center">
                <p className="text-[#1a1714]">This reset link has expired or has already been used.</p>
                <Link href="/auth/forgot-password">
                  <Button variant="primary" size="lg" className="w-full">
                    Send me a new link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1714] mb-2">
                    New password (min {MIN_PASSWORD_LENGTH} characters)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoFocus
                    autoComplete="new-password"
                    className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1714] mb-2">Confirm new password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2 border border-[#e8e3db] rounded-lg text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#c9a876]"
                  />
                </div>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting || !password || !confirm}>
                  {submitting ? "Saving..." : "Set new password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7]" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
