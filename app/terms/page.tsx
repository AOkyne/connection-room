import type { Metadata } from "next";
import { LegalPublicPage } from "@/components/legal/LegalPublicPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Service — The Connection Room",
};

export default function TermsPage() {
  return <LegalPublicPage slug="terms" title="Terms of Service" />;
}
