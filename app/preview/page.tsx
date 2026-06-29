"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createMemberSession } from "@/lib/session";

export default function PreviewPage() {
  const router = useRouter();

  useEffect(() => {
    // Create a demo session and redirect to app
    createMemberSession("Preview User");
    router.push("/app");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-[#d4a574] border-t-transparent rounded-full mx-auto" />
        <p className="text-[#6b5f52]">Loading preview...</p>
      </div>
    </div>
  );
}
