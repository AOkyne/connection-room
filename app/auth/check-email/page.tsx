"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import Link from "next/link";

export default function CheckEmailPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      <header className="border-b border-[#e8e3db] bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/Connection-room-logo.png?v=2"
              alt="The Connection Room"
              className="h-32 w-auto"
            />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl p-8 shadow-md border border-[#e8e3db] space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-[#1a1714]">Check Your Email</h2>
              <p className="text-[#6b6460]">We sent you a magic link</p>
            </div>

            <div className="bg-[#f8f6f2] rounded-lg p-6 space-y-4">
              <p className="text-[#1a1714] font-medium">
                Click the link in your email to sign in
              </p>
              <p className="text-sm text-[#6b6460]">
                The link will expire in 24 hours. If you don't see the email, check your spam folder.
              </p>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => router.push("/auth")}
            >
              Back to Sign In
            </Button>

            <div className="text-sm text-[#6b6460]">
              <p>Didn't receive it?</p>
              <Button
                variant="ghost"
                onClick={() => router.push("/auth")}
                className="text-[#8b6f47] hover:text-[#c9a876]"
              >
                Request a new link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
