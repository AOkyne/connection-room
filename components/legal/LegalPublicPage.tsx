import { redirect } from "next/navigation";
import { ContentHeader } from "@/components/content/ContentHeader";
import { ContentFooter } from "@/components/content/ContentFooter";
import { getPublishedLegalPage } from "@/lib/legal/server";
import type { LegalSlug } from "@/lib/legal/seed";

// Until a page is first published from /app/admin/legal, its old
// placeholder on trevorjamesla.com stays the live version.
const PLACEHOLDERS: Record<"terms" | "privacy", string> = {
  terms: "https://www.trevorjamesla.com/terms-of-service",
  privacy: "https://www.trevorjamesla.com/privacy-policy",
};

export async function LegalPublicPage({ slug, title }: { slug: "terms" | "privacy"; title: string }) {
  const page = await getPublishedLegalPage(slug as LegalSlug);
  if (!page) redirect(PLACEHOLDERS[slug]);

  const updated = new Date(page.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });

  return (
    <div className="tcr-page">
      <ContentHeader />
      <section className="section">
        <div className="wrap measure-narrow">
          <p className="eyebrow">The Connection Room</p>
          <h1 style={{ marginBottom: 8 }}>{title}</h1>
          <p style={{ opacity: 0.7, marginBottom: 32 }}>Last updated {updated}</p>
          {/* Sanitized on every save (lib/legal/sanitize.ts). */}
          <div className="legal-body" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
      </section>
      <ContentFooter hide={slug} />
    </div>
  );
}
