"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession, type AppSession } from "@/lib/session";
import { recordAppVisit } from "@/lib/data/spaces";
import { Button } from "@/components/Button";
import { IconHome, IconJourney, IconConnectionsNav, IconProfileNav, IconAdmin, IconSpaces, IconUpcoming } from "@/components/Icons";
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
    { href: "/app/events", label: "Events", icon: IconUpcoming },
    { href: "/app/profile", label: "Profile", icon: IconProfileNav },
  ];

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e8e3db]">
        <div className="px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/app" className="flex items-center">
              <img
                src="/connection-room-logo.png?v=3"
                alt="The Connection Room"
                className="h-32 w-auto"
              />
            </Link>
            {session && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#6b6460]">{session.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            )}
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
          {session?.type === "admin" && (
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
            {session?.type === "admin" && (
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
