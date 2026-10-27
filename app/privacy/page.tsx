import type { Metadata } from "next";
import { LegalPublicPage } from "@/components/legal/LegalPublicPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy — The Connection Room",
};

export default function PrivacyPage() {
  return <LegalPublicPage slug="privacy" title="Privacy Policy" />;
}
