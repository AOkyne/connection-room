import type { Metadata } from "next";
import { ContentHeader } from "@/components/content/ContentHeader";
import { ContentFooter } from "@/components/content/ContentFooter";

export const metadata: Metadata = {
  title: "Brand Vision — The Connection Room",
};

export default function BrandVisionPage() {
  return (
    <div className="tcr-page">
      <ContentHeader active="brand-vision" />

      <section className="section section--center">
        <div className="wrap measure-narrow">
          <p className="eyebrow">Brand Vision</p>
          <h1>This page is on its way.</h1>
          <p className="lede">
            We&rsquo;re still writing this one. Check back soon, or reach out if you have
            questions in the meantime.
          </p>
          <a href="mailto:support@trevorjamesla.com" className="btn btn--primary" style={{ marginTop: 24, display: "inline-block" }}>
            Contact us &rarr;
          </a>
        </div>
      </section>

      <ContentFooter hide="brand-vision" />
    </div>
  );
}
