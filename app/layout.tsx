import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { appConfig } from "@/lib/config";
import { BugReportWidget } from "@/components/BugReportWidget";
import { InstallPromptListener } from "@/components/install/InstallPromptListener";
import "./globals.css";
import "./tcr-content.css";

// Fonts ship with the site (app/fonts, see LICENSES.md) instead of being
// fetched from Google Fonts at build time, which intermittently failed builds.

const cormorant = localFont({
  variable: "--font-serif",
  src: [
    { path: "./fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const inter = localFont({
  variable: "--font-sans",
  src: [{ path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  display: "swap",
});

// Used only by the onboarding welcome step and the Philosophy/House Rules/FAQs
// content pages (scoped under .tcr-page in tcr-content.css). preload: false so
// these don't add weight to every route's initial load.
const playfair = localFont({
  variable: "--font-tcr-display",
  src: [
    { path: "./fonts/playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/playfair-display-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/playfair-display-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/playfair-display-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/playfair-display-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/playfair-display-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/playfair-display-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
  preload: false,
});

const dancingScript = localFont({
  variable: "--font-tcr-script",
  src: [
    { path: "./fonts/dancing-script-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/dancing-script-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.shortDescription,
  keywords: [
    "connection",
    "intimacy",
    "embodiment",
    "spirituality",
    "sexuality",
    "community",
    "couples",
    "coaching",
  ],
  authors: [{ name: "Trevor James" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  // iPhone "Add to Home Screen": opens full-screen with this name under the icon.
  appleWebApp: {
    capable: true,
    title: "Connection Room",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fdfbf7] text-[#1a1714]">
        {children}
        <BugReportWidget />
        <InstallPromptListener />
      </body>
    </html>
  );
}
