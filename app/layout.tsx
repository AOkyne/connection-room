import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { appConfig } from "@/lib/config";
import { BugReportWidget } from "@/components/BugReportWidget";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
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
    icon: "/trevor-james-favicon.png",
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
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
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
