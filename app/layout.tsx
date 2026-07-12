import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import { appConfig } from "@/lib/config";
import { BugReportWidget } from "@/components/BugReportWidget";
import "./globals.css";
import "./tcr-content.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Used only by the onboarding welcome step and the Philosophy/House Rules/FAQs
// content pages (scoped under .tcr-page in tcr-content.css). preload: false so
// these don't add weight to every route's initial load.
const playfair = Playfair_Display({
  variable: "--font-tcr-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  preload: false,
});

const dancingScript = Dancing_Script({
  variable: "--font-tcr-script",
  subsets: ["latin"],
  weight: ["600", "700"],
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
  viewport: "width=device-width, initial-scale=1",
  authors: [{ name: "Trevor James" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/trevor-james-favicon.png",
  },
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
      <head>
        <meta name="theme-color" content="#c9a876" />
      </head>
      <body className="min-h-full flex flex-col bg-[#fdfbf7] text-[#1a1714]">
        {children}
        <BugReportWidget />
      </body>
    </html>
  );
}
