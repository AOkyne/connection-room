"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession, type AppSession } from "@/lib/session";
import { recordAppVisit } from "@/lib/data/spaces";
import { Button } from "@/components/Button";
import { IconHome, IconJourney, IconConnectionsNav, IconProfileNav, IconAdmin, IconSpaces, IconUpcoming, IconReflection, IconWelcome } from "@/components/Icons";
import { BugReportWidget } from "@/components/BugReportWidget";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const checkSession = async () => {
      // Check localStorage first for demo sessions (faster, avoids async delays)
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("connection-room:session");
        if (stored) {
          try {
            const s = JSON.parse(stored);
            setSession(s);
            recordAppVisit();
            setMounted(true);
            return;
          } catch (e) {
            // Continue to async check if parse fails
          }
        }
      }

      // Fall back to full async session check (for Supabase)
      const s = await getSession();
      if (!s) {
        router.push("/auth");
      } else {
        setSession(s);
        recordAppVisit();
      }
      setMounted(true);
    };

    checkSession();
  }, [router]);


  const handleLogout = async () => {
    await clearSession();
    router.push("/");
  };

  const navItems = [
    { href: "/app", label: "Home", icon: IconHome },
    { href: "/app/spaces", label: "Spaces", icon: null },
    { href: "/app/journey", label: "My Journey", icon: IconJourney },
    { href: "/app/connections", label: "Connections", icon: IconConnectionsNav },
    { href: "/app/articles", label: "Articles", icon: IconReflection },
    { href: "/app/events", label: "Events", icon: IconUpcoming },
    { href: "/app/profile", label: "Profile", icon: IconProfileNav },
  ];

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col relative overflow-x-hidden">
      {/* Warm subtle background texture */}
      <div className="fixed inset-0 pointer-events-none opacity-50 z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(212, 165, 116, 0.03) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(159, 127, 92, 0.03) 0%, transparent 50%)`,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e8e3db]">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/app" className="flex items-center py-2">
              <img
                src="/connection-room-logo.svg"
                alt="The Connection Room"
                className="h-20 w-auto sm:h-28 lg:h-32"
              />
            </Link>
            {session && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#1a0f0a]">{session.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Desktop Sidebar - Fixed Navigation */}
        <nav className="hidden md:flex fixed left-0 top-40 w-64 flex-col px-4 py-6 space-y-2 bg-white z-40 border-r border-[#e8e3db] h-[calc(100vh-160px)] overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6b6460] hover:bg-[#f8f6f2] transition-colors"
            >
              {item.icon ? <item.icon size={20} /> : <IconSpaces size={20} />}
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Admin Link if Admin */}
          {session?.type === "admin" && (
            <div className="border-t border-[#e8e3db] mt-4 pt-4">
              <Link
                href="/app/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#f8f6f2] text-[#8b6f47] font-medium hover:bg-[#e8e3db] transition-colors"
              >
                <IconAdmin size={20} />
                <span>Admin Dashboard</span>
              </Link>
            </div>
          )}

          {/* About: Philosophy, House Rules, Brand Vision, Terms, Privacy */}
          <div className="border-t border-[#e8e3db] mt-4 pt-4">
            <Link
              href="/app/about"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6b6460] hover:bg-[#f8f6f2] transition-colors"
            >
              <IconWelcome size={20} />
              <span>About</span>
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden md:ml-64 pb-24 md:pb-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>

        {/* Mobile Bottom Navigation - Fixed to Bottom */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#e8e3db] bg-white z-50 px-0 py-2 flex gap-0 justify-around overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 flex-1 text-[#6b6460] hover:text-[#8b6f47] text-xs"
            >
              {item.icon ? <item.icon size={20} /> : <IconSpaces size={20} />}
              <span className="text-center leading-tight">{item.label}</span>
            </Link>
          ))}
          {session?.type === "admin" && (
            <Link
              href="/app/admin"
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 flex-1 text-[#8b6f47] text-xs"
            >
              <IconAdmin size={20} />
              <span className="text-center leading-tight">Admin</span>
            </Link>
          )}
        </nav>
      </div>
      <BugReportWidget />
    </div>
  );
}
