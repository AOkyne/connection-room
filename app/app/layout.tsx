"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSession, clearSession, type DemoSession } from "@/lib/session";
import { Button } from "@/components/Button";
import { IconHome, IconJourney, IconPairingsNav, IconProfileNav, IconAdmin, IconSpaces } from "@/components/Icons";
import Link from "next/link";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s) {
      router.push("/auth");
    } else {
      setSession(s);
    }
  }, [router]);

  // Don't render until mounted and session checked
  if (!mounted) {
    return null;
  }

  // Redirect if not authenticated (handled in effect)
  if (!session) {
    return null;
  }

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const navItems = [
    { href: "/app", label: "Home", icon: IconHome },
    { href: "/app/spaces", label: "Spaces", icon: null },
    { href: "/app/journey", label: "My Journey", icon: IconJourney },
    { href: "/app/pairings", label: "Pairings", icon: IconPairingsNav },
    { href: "/app/profile", label: "Profile", icon: IconProfileNav },
  ];

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e8e3db]">
        <div className="px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/app" className="flex items-center">
              <Image
                src="/Connection-room-logo.png"
                alt="The Connection Room"
                width={280}
                height={80}
                priority
                className="h-14 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#6b6460]">{session.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-[#e8e3db] bg-white">
          <nav className="flex-1 px-4 py-6 space-y-2">
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
          </nav>

          {/* Admin Link if Admin */}
          {session.type === "admin" && (
            <div className="border-t border-[#e8e3db] px-4 py-4">
              <Link
                href="/app/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#f8f6f2] text-[#8b6f47] font-medium hover:bg-[#e8e3db] transition-colors"
              >
                <IconAdmin size={20} />
                <span>Admin Dashboard</span>
              </Link>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden border-t border-[#e8e3db] bg-white px-4 py-2 flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-2 text-[#6b6460] hover:text-[#8b6f47] text-xs whitespace-nowrap"
              >
                {item.icon ? <item.icon size={18} /> : <IconSpaces size={18} />}
                <span>{item.label}</span>
              </Link>
            ))}
            {session.type === "admin" && (
              <Link
                href="/app/admin"
                className="flex flex-col items-center gap-1 px-3 py-2 text-[#8b6f47] text-xs whitespace-nowrap"
              >
                <IconAdmin size={18} />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </main>
      </div>
    </div>
  );
}
