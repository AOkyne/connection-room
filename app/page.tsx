"use client";

import { appConfig } from "@/lib/config";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IconLogo, IconEmbodiment, IconConnection, IconIntegration, IconDemo } from "@/components/Icons";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#e8e3db] sticky top-0 z-40 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <IconLogo size={40} />
            <h1 className="text-xl font-bold text-[#1a1714]">{appConfig.name}</h1>
          </div>
          <Link href="/auth">
            <Button variant="outline" size="md">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 max-w-4xl mx-auto">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-5xl sm:text-6xl font-bold text-[#1a1714] leading-tight">
              A Private Community for Honest Connection
            </h2>
            <p className="text-xl text-[#6b6460] max-w-2xl mx-auto leading-relaxed">
              {appConfig.tagline}
            </p>
          </div>

          <div className="pt-6 space-y-4">
            <p className="text-lg text-[#6b6460] max-w-2xl mx-auto">
              The Connection Room is a guided space for men and couples exploring authentic
              connection, embodied intimacy, spirituality, sexuality, and integration.
            </p>
            <ul className="text-base text-[#6b6460] max-w-2xl mx-auto space-y-2">
              <li>✓ For individuals exploring personal connection and embodiment</li>
              <li>✓ For couples practicing honesty, touch, and repair</li>
              <li>✓ No shame, pressure, performance, or unsolicited sexual content</li>
              <li>✓ Guided by the EROS Method: Embody, Regulate, Own, Share</li>
            </ul>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth?mode=member">
              <Button variant="primary" size="lg">
                Join as Demo Member
              </Button>
            </Link>
            <Link href="/auth?mode=admin">
              <Button variant="secondary" size="lg">
                Explore as Demo Admin
              </Button>
            </Link>
          </div>

          <p className="text-sm text-[#9d9490] pt-6 flex items-center justify-center gap-2">
            <IconDemo size={16} /> This is a demo version. All data resets when you refresh.
          </p>
        </div>
      </section>

      {/* Quick Preview Cards */}
      <section className="bg-white border-t border-[#e8e3db] px-4 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-[#1a1714] text-center mb-12">
            What You&apos;ll Explore
          </h3>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="text-center">
              <div className="flex justify-center mb-4">
                <IconEmbodiment size={48} className="text-[#d4a574]" />
              </div>
              <h4 className="text-lg font-bold text-[#1a1714] mb-2">Embodiment</h4>
              <p className="text-[#6b6460]">Come back to your body. Notice sensation, presence, and aliveness.</p>
            </Card>

            <Card className="text-center">
              <div className="flex justify-center mb-4">
                <IconConnection size={48} className="text-[#d4a574]" />
              </div>
              <h4 className="text-lg font-bold text-[#1a1714] mb-2">Connection</h4>
              <p className="text-[#6b6460]">Practice honest expression, vulnerability, and relational presence.</p>
            </Card>

            <Card className="text-center">
              <div className="flex justify-center mb-4">
                <IconIntegration size={48} className="text-[#d4a574]" />
              </div>
              <h4 className="text-lg font-bold text-[#1a1714] mb-2">Integration</h4>
              <p className="text-[#6b6460]">Bring together spirit, sexuality, emotion, and embodiment.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#f8f6f2] px-4 py-16 sm:py-20 border-t border-[#e8e3db]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h3 className="text-3xl font-bold text-[#1a1714]">Ready to Explore?</h3>
          <p className="text-lg text-[#6b6460]">
            Enter as a demo member to explore the community, or book a free consultation with
            Trevor James.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link href="/auth?mode=member">
              <Button variant="primary" size="lg">
                Enter Community
              </Button>
            </Link>
            <a href={appConfig.urls.freeConsult} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg">
                Free Consultation
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e8e3db] px-4 py-8 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-[#9d9490]">
            © 2024 Trevor James LLC. All rights reserved. | Based in Los Angeles
          </p>
          <p className="text-xs text-[#9d9490] mt-2">
            <a href={appConfig.urls.mainWebsite} className="hover:text-[#8b6f47]">
              Main Website
            </a>{" "}
            · Built with care for authentic connection
          </p>
        </div>
      </footer>
    </div>
  );
}
