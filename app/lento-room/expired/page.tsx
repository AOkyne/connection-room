import type { Metadata } from "next";
import { LENTO_APP_URL } from "@/lib/lento/copy";
import { LentoLogo } from "@/components/lento/LentoLogo";

export const metadata: Metadata = {
  title: "The Lento Room",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Every refused entry pass lands here, whatever the reason, with no details.
export default function LentoEntryExpiredPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-4 py-10" style={{ background: "#f7f1e8", color: "#2e211b" }}>
      <LentoLogo width={150} priority />
      <div className="max-w-md w-full rounded-2xl border p-6 space-y-4" style={{ background: "#fdfaf5", borderColor: "#e1d5c4" }}>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "#412f26" }}>
          That link has expired.
        </h1>
        <p style={{ color: "#5f4c40" }}>Open The Connection Room again from your Lento app.</p>
        <a href={LENTO_APP_URL} className="inline-block rounded-full px-5 py-2.5 font-semibold" style={{ background: "#ffb400", color: "#412f26" }}>
          Open Lento
        </a>
      </div>
    </div>
  );
}
